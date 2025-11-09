import STATUS_CODES from 'http-status-codes'
import moment from 'moment'
import { QueryTypes, Op } from 'sequelize'
import { CustomRequest, CustomResponse } from '../../../environment'
import { createResponse, createResponse1 } from '../../../utils/helper'
import { logger } from '../../../utils/logger'
import sequelize from '../../../utils/dbConfig'
import AuthSchema from '../../Auth/schema/AuthSchema'
import { TaskSchema } from '../../Tasks/schema'

const MONTHS_TO_ANALYZE = 6

type MonthlyRecord = Record<string, number>

type ProjectTrendPoint = {
  month: string
  active: number
  completed: number
}

type RevenueCostPoint = {
  month: string
  revenue: number
  cost: number
}

type ResourceUtilizationPoint = {
  name: string
  value: number
  color: string
}

type AnalyticsResponse = {
  projectTrends: ProjectTrendPoint[]
  revenueVsCost: RevenueCostPoint[]
  resourceUtilization: ResourceUtilizationPoint[]
  kpi: {
    activeProjects: number
    activeProjectsChange: number
    tasksCompleted: number
    tasksCompletedChange: number
    hoursLogged: number
    hoursLoggedChange: number
    revenue: number
    revenueChange: number
  }
}

class AnalyticsController {
  async dashboard(req: CustomRequest, res: CustomResponse) {
    try {
      const months = this.getRecentMonths(MONTHS_TO_ANALYZE)
      const startDate = moment(months[0], 'YYYY-MM').startOf('month').format('YYYY-MM-DD')

      const [projectTrendsRaw, taskCompletionsRaw, timesheetHoursRaw, invoiceRevenueRaw, timesheetCostRaw, vendorBillsRaw, expensesRaw] = await Promise.all([
        this.queryProjects(startDate),
        this.queryTaskCompletions(startDate),
        this.queryTimesheetHours(startDate),
        this.queryInvoiceRevenue(startDate),
        this.queryTimesheetCost(startDate),
        this.queryVendorBills(startDate),
        this.queryExpenses(startDate)
      ])

      const projectTrendMap = this.toMonthlyMap(projectTrendsRaw, ['active', 'completed'])
      const taskCompletionMap = this.toSingleValueMonthlyMap(taskCompletionsRaw, 'completed')
      const timesheetHoursMap = this.toSingleValueMonthlyMap(timesheetHoursRaw, 'hours')
      const invoiceRevenueMap = this.toSingleValueMonthlyMap(invoiceRevenueRaw, 'revenue')
      const costMap = this.combineCostSeries([timesheetCostRaw, vendorBillsRaw, expensesRaw])

      const projectTrends = months.map((month) => ({
        month: moment(month, 'YYYY-MM').format('MMM'),
        active: projectTrendMap[month]?.active ?? 0,
        completed: projectTrendMap[month]?.completed ?? 0
      }))

      const revenueVsCost = months.map((month) => ({
        month: moment(month, 'YYYY-MM').format('MMM'),
        revenue: invoiceRevenueMap[month] ?? 0,
        cost: costMap[month] ?? 0
      }))

      const { resourceUtilization, kpi } = await this.buildSummaryMetrics(months, projectTrendMap, taskCompletionMap, timesheetHoursMap, invoiceRevenueMap)

      const payload: AnalyticsResponse = {
        projectTrends,
        revenueVsCost,
        resourceUtilization,
        kpi
      }

      return createResponse(res, STATUS_CODES.OK, 'Analytics data retrieved', payload)
    } catch (error) {
      logger.error(__filename, 'dashboard', req.custom?.request_uuid, 'Failed to load analytics data', error)
      return createResponse1({
        res,
        status: STATUS_CODES.INTERNAL_SERVER_ERROR,
        message: res.__('SERVER_ERROR_MESSAGE')
      })
    }
  }

  private getRecentMonths(count: number) {
    const months: string[] = []
    const now = moment().startOf('month')
    for (let i = count - 1; i >= 0; i--) {
      months.push(moment(now).subtract(i, 'months').format('YYYY-MM'))
    }
    return months
  }

  private async queryProjects(startDate: string) {
    return sequelize.query<{ month: string; active: string; completed: string }>(
      `
        SELECT
          to_char(created_at, 'YYYY-MM') AS month,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed
        FROM projects
        WHERE created_at >= :startDate
        GROUP BY month
        ORDER BY month
      `,
      {
        replacements: { startDate },
        type: QueryTypes.SELECT
      }
    )
  }

  private async queryTaskCompletions(startDate: string) {
    return sequelize.query<{ month: string; completed: string }>(
      `
        SELECT
          to_char(updated_at, 'YYYY-MM') AS month,
          COUNT(*) AS completed
        FROM tasks
        WHERE status = 'done'
          AND updated_at >= :startDate
        GROUP BY month
        ORDER BY month
      `,
      {
        replacements: { startDate },
        type: QueryTypes.SELECT
      }
    )
  }

  private async queryTimesheetHours(startDate: string) {
    return sequelize.query<{ month: string; hours: string }>(
      `
        SELECT
          to_char(date, 'YYYY-MM') AS month,
          COALESCE(SUM(hours), 0) AS hours
        FROM timesheets
        WHERE date >= :startDate
        GROUP BY month
        ORDER BY month
      `,
      {
        replacements: { startDate },
        type: QueryTypes.SELECT
      }
    )
  }

  private async queryInvoiceRevenue(startDate: string) {
    return sequelize.query<{ month: string; revenue: string }>(
      `
        SELECT
          to_char(date, 'YYYY-MM') AS month,
          COALESCE(SUM(total_amount), 0) AS revenue
        FROM invoices
        WHERE date >= :startDate
          AND status IN ('sent', 'approved', 'paid')
        GROUP BY month
        ORDER BY month
      `,
      {
        replacements: { startDate },
        type: QueryTypes.SELECT
      }
    )
  }

  private async queryTimesheetCost(startDate: string) {
    return sequelize.query<{ month: string; cost: string }>(
      `
        SELECT
          to_char(date, 'YYYY-MM') AS month,
          COALESCE(SUM(hours * cost_rate), 0) AS cost
        FROM timesheets
        WHERE date >= :startDate
        GROUP BY month
        ORDER BY month
      `,
      {
        replacements: { startDate },
        type: QueryTypes.SELECT
      }
    )
  }

  private async queryVendorBills(startDate: string) {
    return sequelize.query<{ month: string; cost: string }>(
      `
        SELECT
          to_char(date, 'YYYY-MM') AS month,
          COALESCE(SUM(total_amount), 0) AS cost
        FROM vendor_bills
        WHERE date >= :startDate
          AND status IN ('approved', 'paid')
        GROUP BY month
        ORDER BY month
      `,
      {
        replacements: { startDate },
        type: QueryTypes.SELECT
      }
    )
  }

  private async queryExpenses(startDate: string) {
    return sequelize.query<{ month: string; cost: string }>(
      `
        SELECT
          to_char(date, 'YYYY-MM') AS month,
          COALESCE(SUM(amount), 0) AS cost
        FROM expenses
        WHERE date >= :startDate
          AND status IN ('approved', 'paid')
        GROUP BY month
        ORDER BY month
      `,
      {
        replacements: { startDate },
        type: QueryTypes.SELECT
      }
    )
  }

  private toMonthlyMap<T extends Record<string, string>>(rows: T[], keys: string[]) {
    return rows.reduce<Record<string, MonthlyRecord>>((acc, row) => {
      const month = row.month
      acc[month] = acc[month] || {}
      keys.forEach((key) => {
        acc[month][key] = Number(row[key as keyof T] ?? 0)
      })
      return acc
    }, {})
  }

  private toSingleValueMonthlyMap<T extends Record<string, string>>(rows: T[], valueKey: string) {
    return rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.month] = Number(row[valueKey as keyof T] ?? 0)
      return acc
    }, {})
  }

  private combineCostSeries(series: Array<Array<{ month: string; cost: string }>>) {
    return series.reduce<Record<string, number>>((acc, rows) => {
      rows.forEach((row) => {
        const month = row.month
        acc[month] = (acc[month] ?? 0) + Number(row.cost ?? 0)
      })
      return acc
    }, {})
  }

  private async buildSummaryMetrics(
    months: string[],
    projectTrendMap: Record<string, MonthlyRecord>,
    taskCompletionMap: Record<string, number>,
    timesheetHoursMap: Record<string, number>,
    invoiceRevenueMap: Record<string, number>
  ) {
    const latestMonth = months[months.length - 1]
    const previousMonth = months.length > 1 ? months[months.length - 2] : undefined

    const activeProjects = projectTrendMap[latestMonth]?.active ?? 0
    const activeProjectsPrev = previousMonth ? (projectTrendMap[previousMonth]?.active ?? 0) : 0

    const tasksCompleted = taskCompletionMap[latestMonth] ?? 0
    const tasksCompletedPrev = previousMonth ? (taskCompletionMap[previousMonth] ?? 0) : 0

    const hoursLogged = timesheetHoursMap[latestMonth] ?? 0
    const hoursLoggedPrev = previousMonth ? (timesheetHoursMap[previousMonth] ?? 0) : 0

    const revenue = invoiceRevenueMap[latestMonth] ?? 0
    const revenuePrev = previousMonth ? (invoiceRevenueMap[previousMonth] ?? 0) : 0

    const [totalUsers, allocatedUsers, overdueTasks] = await Promise.all([
      AuthSchema.count(),
      TaskSchema.count({
        distinct: true,
        col: 'assignee_id',
        where: {
          assignee_id: { [Op.ne]: null },
          status: { [Op.in]: ['todo', 'in_progress', 'review'] }
        }
      }),
      TaskSchema.count({
        where: {
          assignee_id: { [Op.ne]: null },
          status: { [Op.ne]: 'done' },
          due_date: { [Op.lt]: new Date() }
        }
      })
    ])

    const availableUsers = Math.max(totalUsers - allocatedUsers, 0)

    const resourceUtilization: ResourceUtilizationPoint[] = [
      { name: 'Available', value: availableUsers, color: '#22C55E' },
      { name: 'Allocated', value: allocatedUsers, color: '#06B6D4' },
      { name: 'Overallocated', value: overdueTasks, color: '#EF4444' }
    ]

    const kpi = {
      activeProjects,
      activeProjectsChange: activeProjects - activeProjectsPrev,
      tasksCompleted,
      tasksCompletedChange: tasksCompleted - tasksCompletedPrev,
      hoursLogged: Number(hoursLogged.toFixed(1)),
      hoursLoggedChange: Number((hoursLogged - hoursLoggedPrev).toFixed(1)),
      revenue,
      revenueChange: revenue - revenuePrev
    }

    return { resourceUtilization, kpi }
  }
}

export default new AnalyticsController()
