import { FindOptions, Op, WhereOptions } from 'sequelize'
import TimesheetSchema from '../schema/TimesheetSchema'
import ProjectSchema from '../../Projects/schema/ProjectSchema'
import TaskSchema from '../../Tasks/schema/TaskSchema'
import AuthSchema from '../../Auth/schema/AuthSchema'

export interface TimesheetListOptions {
  projectId?: number
  taskId?: number
  userId?: number
  billable?: boolean
  dateFrom?: string
  dateTo?: string
  search?: string
  limit?: number
  offset?: number
  attributes?: FindOptions['attributes']
  companyId?: number
}

type TimesheetCreationPayload = {
  project_id: number
  task_id?: number | null
  user_id: number
  date: Date | string
  hours: number
  description?: string | null
  billable?: boolean
  cost_rate: number
  company_id: number
}

type TimesheetUpdatePayload = Partial<TimesheetCreationPayload>

class TimesheetModel {
  async createTimesheet(payload: TimesheetCreationPayload): Promise<TimesheetSchema> {
    return TimesheetSchema.create(payload as any)
  }

  async findByUuid(uuid: string, companyId?: number): Promise<TimesheetSchema | null> {
    return TimesheetSchema.findOne({
      where: {
        uuid,
        ...(companyId ? { company_id: companyId } : {})
      },
      include: [
        { model: ProjectSchema, as: 'project', attributes: ['uuid', 'name'] },
        { model: TaskSchema, as: 'task', attributes: ['uuid', 'title'] },
        { model: AuthSchema, as: 'user', attributes: ['uuid', 'name', 'email', 'hourly_rate'] }
      ]
    })
  }

  async listTimesheets(options: TimesheetListOptions = {}) {
    const where: WhereOptions = {}

    if (options.companyId) {
      Object.assign(where, { company_id: options.companyId })
    }

    if (options.projectId) {
      Object.assign(where, { project_id: options.projectId })
    }

    if (options.taskId) {
      Object.assign(where, { task_id: options.taskId })
    }

    if (options.userId) {
      Object.assign(where, { user_id: options.userId })
    }

    if (typeof options.billable === 'boolean') {
      Object.assign(where, { billable: options.billable })
    }

    if (options.dateFrom || options.dateTo) {
      Object.assign(where, {
        date: {
          ...(options.dateFrom ? { [Op.gte]: options.dateFrom } : {}),
          ...(options.dateTo ? { [Op.lte]: options.dateTo } : {})
        }
      })
    }

    if (options.search?.trim()) {
      const term = `%${options.search.trim()}%`
      Object.assign(where, {
        [Op.or]: [{ description: { [Op.iLike]: term } }]
      })
    }

    return TimesheetSchema.findAndCountAll({
      where,
      limit: options.limit,
      offset: options.offset,
      order: [
        ['date', 'DESC'],
        ['created_at', 'DESC']
      ],
      include: [
        { model: ProjectSchema, as: 'project', attributes: ['uuid', 'name'] },
        { model: TaskSchema, as: 'task', attributes: ['uuid', 'title'] },
        { model: AuthSchema, as: 'user', attributes: ['uuid', 'name', 'email', 'hourly_rate'] }
      ],
      attributes: options.attributes
    })
  }

  async updateByUuid(uuid: string, payload: TimesheetUpdatePayload, companyId?: number): Promise<TimesheetSchema | null> {
    const [updatedCount] = await TimesheetSchema.update(payload as any, {
      where: {
        uuid,
        ...(companyId ? { company_id: companyId } : {})
      }
    })

    if (!updatedCount) {
      return null
    }

    return this.findByUuid(uuid, companyId)
  }

  async deleteByUuid(uuid: string, companyId?: number): Promise<number> {
    return TimesheetSchema.destroy({
      where: {
        uuid,
        ...(companyId ? { company_id: companyId } : {})
      }
    })
  }
}

export default new TimesheetModel()
