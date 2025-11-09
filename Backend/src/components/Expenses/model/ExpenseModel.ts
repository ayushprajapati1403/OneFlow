import { FindOptions, Op, WhereOptions } from 'sequelize'
import ExpenseSchema, { ExpenseStatus } from '../schema/ExpenseSchema'
import ProjectSchema from '../../Projects/schema/ProjectSchema'
import AuthSchema from '../../Auth/schema/AuthSchema'

export interface ExpenseListOptions {
  projectId?: number
  userId?: number
  status?: ExpenseStatus | ExpenseStatus[]
  billable?: boolean
  dateFrom?: string
  dateTo?: string
  search?: string
  limit?: number
  offset?: number
  attributes?: FindOptions['attributes']
}

type ExpenseCreationPayload = {
  project_id: number
  user_id?: number | null
  description: string
  amount: number
  date?: string
  billable?: boolean
  status?: ExpenseStatus
  receipt_url?: string | null
}

type ExpenseUpdatePayload = Partial<ExpenseCreationPayload>

class ExpenseModel {
  async createExpense(payload: ExpenseCreationPayload): Promise<ExpenseSchema> {
    return ExpenseSchema.create(payload as any)
  }

  async findByUuid(uuid: string): Promise<ExpenseSchema | null> {
    return ExpenseSchema.findOne({
      where: { uuid },
      include: [
        { model: ProjectSchema, as: 'project', attributes: ['uuid', 'name'] },
        { model: AuthSchema, as: 'user', attributes: ['uuid', 'name', 'email'] }
      ]
    })
  }

  async listExpenses(options: ExpenseListOptions = {}) {
    const where: WhereOptions = {}

    if (options.projectId) {
      Object.assign(where, { project_id: options.projectId })
    }

    if (options.userId) {
      Object.assign(where, { user_id: options.userId })
    }

    if (options.status) {
      const statuses = Array.isArray(options.status) ? options.status : [options.status]
      Object.assign(where, { status: { [Op.in]: statuses } })
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

    return ExpenseSchema.findAndCountAll({
      where,
      limit: options.limit,
      offset: options.offset,
      order: [
        ['date', 'DESC'],
        ['created_at', 'DESC']
      ],
      include: [
        { model: ProjectSchema, as: 'project', attributes: ['uuid', 'name'] },
        { model: AuthSchema, as: 'user', attributes: ['uuid', 'name', 'email'] }
      ],
      attributes: options.attributes
    })
  }

  async updateByUuid(uuid: string, payload: ExpenseUpdatePayload): Promise<ExpenseSchema | null> {
    const [updatedCount] = await ExpenseSchema.update(payload as any, {
      where: { uuid }
    })

    if (!updatedCount) {
      return null
    }

    return this.findByUuid(uuid)
  }

  async deleteByUuid(uuid: string): Promise<number> {
    return ExpenseSchema.destroy({ where: { uuid } })
  }
}

export default new ExpenseModel()
