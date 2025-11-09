import { FindOptions, Op, WhereOptions } from 'sequelize'
import VendorBillSchema, { VendorBillStatus } from '../schema/VendorBillSchema'
import ProjectSchema from '../../Projects/schema/ProjectSchema'
import PurchaseOrderSchema from '../../PurchaseOrders/schema/PurchaseOrderSchema'
import ContactSchema from '../../Contacts/schema/ContactSchema'

export interface VendorBillListOptions {
  projectId?: number
  purchaseOrderId?: number
  vendorId?: number
  status?: VendorBillStatus | VendorBillStatus[]
  dateFrom?: string
  dateTo?: string
  search?: string
  limit?: number
  offset?: number
  attributes?: FindOptions['attributes']
}

type VendorBillCreationPayload = {
  project_id?: number | null
  purchase_order_id?: number | null
  vendor_id?: number | null
  date?: string
  due_date?: string | null
  status?: VendorBillStatus
  items?: object[]
  total_amount?: number
}

type VendorBillUpdatePayload = Partial<VendorBillCreationPayload>

class VendorBillModel {
  async createVendorBill(payload: VendorBillCreationPayload): Promise<VendorBillSchema> {
    return VendorBillSchema.create(payload as any)
  }

  async findByUuid(uuid: string): Promise<VendorBillSchema | null> {
    return VendorBillSchema.findOne({
      where: { uuid },
      include: [
        { model: ProjectSchema, as: 'project', attributes: ['uuid', 'name'] },
        { model: PurchaseOrderSchema, as: 'purchase_order', attributes: ['uuid'] },
        { model: ContactSchema, as: 'vendor', attributes: ['uuid', 'name', 'type'] }
      ]
    })
  }

  async listVendorBills(options: VendorBillListOptions = {}) {
    const where: WhereOptions = {}

    if (options.projectId) {
      Object.assign(where, { project_id: options.projectId })
    }

    if (options.purchaseOrderId) {
      Object.assign(where, { purchase_order_id: options.purchaseOrderId })
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

    return VendorBillSchema.findAndCountAll({
      where,
      limit: options.limit,
      offset: options.offset,
      order: [
        ['date', 'DESC'],
        ['created_at', 'DESC']
      ],
      include: [
        { model: ProjectSchema, as: 'project', attributes: ['uuid', 'name'] },
        { model: PurchaseOrderSchema, as: 'purchase_order', attributes: ['uuid'] },
        { model: ContactSchema, as: 'vendor', attributes: ['uuid', 'name', 'type'] }
      ],
      attributes: options.attributes
    })
  }

  async updateByUuid(uuid: string, payload: VendorBillUpdatePayload): Promise<VendorBillSchema | null> {
    const [updatedCount] = await VendorBillSchema.update(payload as any, {
      where: { uuid }
    })

    if (!updatedCount) {
      return null
    }

    return this.findByUuid(uuid)
  }

  async deleteByUuid(uuid: string): Promise<number> {
    return VendorBillSchema.destroy({ where: { uuid } })
  }
}

export default new VendorBillModel()
