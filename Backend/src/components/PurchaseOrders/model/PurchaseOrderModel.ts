import { FindOptions, Op, WhereOptions } from 'sequelize'
import PurchaseOrderSchema, { PurchaseOrderStatus } from '../schema/PurchaseOrderSchema'
import ProjectSchema from '../../Projects/schema/ProjectSchema'
import ContactSchema from '../../Contacts/schema/ContactSchema'

export interface PurchaseOrderListOptions {
  projectId?: number
  vendorId?: number
  status?: PurchaseOrderStatus | PurchaseOrderStatus[]
  dateFrom?: string
  dateTo?: string
  search?: string
  limit?: number
  offset?: number
  attributes?: FindOptions['attributes']
}

type PurchaseOrderCreationPayload = {
  project_id?: number | null
  vendor_id?: number | null
  date?: string
  status?: PurchaseOrderStatus
  items?: object[]
  total_amount?: number
}

type PurchaseOrderUpdatePayload = Partial<PurchaseOrderCreationPayload>

class PurchaseOrderModel {
  async createPurchaseOrder(payload: PurchaseOrderCreationPayload): Promise<PurchaseOrderSchema> {
    return PurchaseOrderSchema.create(payload as any)
  }

  async findByUuid(uuid: string): Promise<PurchaseOrderSchema | null> {
    return PurchaseOrderSchema.findOne({
      where: { uuid },
      include: [
        { model: ProjectSchema, as: 'project', attributes: ['uuid', 'name'] },
        { model: ContactSchema, as: 'vendor', attributes: ['uuid', 'name', 'type'] }
      ]
    })
  }

  async listPurchaseOrders(options: PurchaseOrderListOptions = {}) {
    const where: WhereOptions = {}

    if (options.projectId) {
      Object.assign(where, { project_id: options.projectId })
    }

    if (options.vendorId) {
      Object.assign(where, { vendor_id: options.vendorId })
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
        [Op.or]: [{ items: { [Op.like]: term } }, { '$vendor.name$': { [Op.iLike]: term } }, { '$project.name$': { [Op.iLike]: term } }]
      })
    }

    return PurchaseOrderSchema.findAndCountAll({
      where,
      limit: options.limit,
      offset: options.offset,
      order: [
        ['date', 'DESC'],
        ['created_at', 'DESC']
      ],
      include: [
        { model: ProjectSchema, as: 'project', attributes: ['uuid', 'name'] },
        { model: ContactSchema, as: 'vendor', attributes: ['uuid', 'name', 'type'] }
      ],
      attributes: options.attributes
    })
  }

  async updateByUuid(uuid: string, payload: PurchaseOrderUpdatePayload): Promise<PurchaseOrderSchema | null> {
    const [updatedCount] = await PurchaseOrderSchema.update(payload as any, {
      where: { uuid }
    })

    if (!updatedCount) {
      return null
    }

    return this.findByUuid(uuid)
  }

  async deleteByUuid(uuid: string): Promise<number> {
    return PurchaseOrderSchema.destroy({ where: { uuid } })
  }
}

export default new PurchaseOrderModel()
