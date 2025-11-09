import { FindOptions, Op, WhereOptions } from 'sequelize'
import InvoiceSchema, { InvoiceStatus } from '../schema/InvoiceSchema'
import ProjectSchema from '../../Projects/schema/ProjectSchema'
import SalesOrderSchema from '../../SalesOrders/schema/SalesOrderSchema'
import ContactSchema from '../../Contacts/schema/ContactSchema'

export interface InvoiceListOptions {
  projectId?: number
  salesOrderId?: number
  clientId?: number
  status?: InvoiceStatus | InvoiceStatus[]
  dateFrom?: string
  dateTo?: string
  search?: string
  limit?: number
  offset?: number
  attributes?: FindOptions['attributes']
  companyId?: number
}

type InvoiceCreationPayload = {
  project_id?: number | null
  sales_order_id?: number | null
  client_id?: number | null
  date?: string
  due_date?: string | null
  status?: InvoiceStatus
  items?: object[]
  total_amount?: number
  company_id: number
}

type InvoiceUpdatePayload = Partial<InvoiceCreationPayload>

class InvoiceModel {
  async createInvoice(payload: InvoiceCreationPayload): Promise<InvoiceSchema> {
    return InvoiceSchema.create(payload as any)
  }

  async findByUuid(uuid: string, companyId?: number): Promise<InvoiceSchema | null> {
    return InvoiceSchema.findOne({
      where: {
        uuid,
        ...(companyId ? { company_id: companyId } : {})
      },
      include: [
        { model: ProjectSchema, as: 'project', attributes: ['uuid', 'name'] },
        { model: SalesOrderSchema, as: 'sales_order', attributes: ['uuid'] },
        { model: ContactSchema, as: 'client', attributes: ['uuid', 'name', 'type'] }
      ]
    })
  }

  async listInvoices(options: InvoiceListOptions = {}) {
    const where: WhereOptions = {}

    if (options.companyId) {
      Object.assign(where, { company_id: options.companyId })
    }

    if (options.projectId) {
      Object.assign(where, { project_id: options.projectId })
    }

    if (options.salesOrderId) {
      Object.assign(where, { sales_order_id: options.salesOrderId })
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

    return InvoiceSchema.findAndCountAll({
      where,
      limit: options.limit,
      offset: options.offset,
      order: [
        ['date', 'DESC'],
        ['created_at', 'DESC']
      ],
      include: [
        { model: ProjectSchema, as: 'project', attributes: ['uuid', 'name'] },
        { model: SalesOrderSchema, as: 'sales_order', attributes: ['uuid'] },
        { model: ContactSchema, as: 'client', attributes: ['uuid', 'name', 'type'] }
      ],
      attributes: options.attributes
    })
  }

  async updateByUuid(uuid: string, payload: InvoiceUpdatePayload, companyId?: number): Promise<InvoiceSchema | null> {
    const [updatedCount] = await InvoiceSchema.update(payload as any, {
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
    return InvoiceSchema.destroy({
      where: {
        uuid,
        ...(companyId ? { company_id: companyId } : {})
      }
    })
  }
}

export default new InvoiceModel()
