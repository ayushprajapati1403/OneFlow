import { FindOptions, Op, WhereOptions } from 'sequelize'
import SalesOrderSchema, { SalesOrderStatus } from '../schema/SalesOrderSchema'
import ProjectSchema from '../../Projects/schema/ProjectSchema'
import ContactSchema from '../../Contacts/schema/ContactSchema'

export interface SalesOrderListOptions {
  projectId?: number
  clientId?: number
  status?: SalesOrderStatus | SalesOrderStatus[]
  dateFrom?: string
  dateTo?: string
  search?: string
  limit?: number
  offset?: number
  attributes?: FindOptions['attributes']
}

type SalesOrderCreationPayload = {
  project_id?: number | null
  client_id?: number | null
  date?: string
  status?: SalesOrderStatus
  items?: object[]
  total_amount?: number
}

type SalesOrderUpdatePayload = Partial<SalesOrderCreationPayload>

class SalesOrderModel {
  async createSalesOrder(payload: SalesOrderCreationPayload): Promise<SalesOrderSchema> {
    return SalesOrderSchema.create(payload as any)
  }

  async findByUuid(uuid: string): Promise<SalesOrderSchema | null> {
    return SalesOrderSchema.findOne({
      where: { uuid },
      include: [
        { model: ProjectSchema, as: 'project', attributes: ['uuid', 'name'] },
        { model: ContactSchema, as: 'client', attributes: ['uuid', 'name', 'type'] }
      ]
    })
  }

  async listSalesOrders(options: SalesOrderListOptions = {}) {
    const where: WhereOptions = {}

    if (options.projectId) {
      Object.assign(where, { project_id: options.projectId })
    }

    if (options.clientId) {
      Object.assign(where, { client_id: options.clientId })
    }

    if (options.status) {
      const statuses = Array.isArray(options.status) ? options.status : [options.status]
      Object.assign(where, { status: { [Op.in]: statuses } })
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
        [Op.or]: [{ items: { [Op.like]: term } }, { '$client.name$': { [Op.iLike]: term } }, { '$project.name$': { [Op.iLike]: term } }]
      })
    }

    return SalesOrderSchema.findAndCountAll({
      where,
      limit: options.limit,
      offset: options.offset,
      order: [
        ['date', 'DESC'],
        ['created_at', 'DESC']
      ],
      include: [
        { model: ProjectSchema, as: 'project', attributes: ['uuid', 'name'] },
        { model: ContactSchema, as: 'client', attributes: ['uuid', 'name', 'type'] }
      ],
      attributes: options.attributes
    })
  }

  async updateByUuid(uuid: string, payload: SalesOrderUpdatePayload): Promise<SalesOrderSchema | null> {
    const [updatedCount] = await SalesOrderSchema.update(payload as any, {
      where: { uuid }
    })

    if (!updatedCount) {
      return null
    }

    return this.findByUuid(uuid)
  }

  async deleteByUuid(uuid: string): Promise<number> {
    return SalesOrderSchema.destroy({ where: { uuid } })
  }
}

export default new SalesOrderModel()
