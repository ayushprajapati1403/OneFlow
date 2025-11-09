import STATUS_CODES from 'http-status-codes'
import { CustomRequest, CustomResponse } from '../../../environment'
import { createResponse, createResponse1 } from '../../../utils/helper'
import { logger } from '../../../utils/logger'
import InvoiceModel from '../model/InvoiceModel'
import ProjectModel from '../../Projects/model/ProjectModel'
import SalesOrderModel from '../../SalesOrders/model/SalesOrderModel'
import ContactModel from '../../Contacts/model/ContactModel'
import { INVOICE_DEFAULT_LIMIT, INVOICE_STATUS } from '../../../utils/constants'
import InvoiceSchema, { InvoiceStatus } from '../schema/InvoiceSchema'
import ProjectSchema from '../../Projects/schema/ProjectSchema'
import SalesOrderSchema from '../../SalesOrders/schema/SalesOrderSchema'
import ContactSchema from '../../Contacts/schema/ContactSchema'

type SanitizedInvoice = {
  uuid: string
  project: {
    uuid: string
    name: string
  } | null
  sales_order: {
    uuid: string
  } | null
  client: {
    uuid: string
    name: string
    type: string
  } | null
  date: string
  due_date: string | null
  status: InvoiceStatus
  items: object[]
  total_amount: number
  created_at: Date
  updated_at: Date
}

const ALLOWED_STATUS = Object.values(INVOICE_STATUS) as InvoiceStatus[]

class InvoiceController {
  private formatDate(value: Date | string | null): string | null {
    if (!value) return null
    if (value instanceof Date) return value.toISOString().slice(0, 10)
    return value
  }

  private sanitize(invoice: InvoiceSchema): SanitizedInvoice {
    const plain = invoice.get({
      plain: true
    }) as InvoiceSchema & {
      project?: ProjectSchema | null
      sales_order?: SalesOrderSchema | null
      client?: ContactSchema | null
    }

    const project = plain.project
      ? {
          uuid: plain.project.uuid,
          name: plain.project.name
        }
      : null

    const salesOrder = plain.sales_order
      ? {
          uuid: plain.sales_order.uuid
        }
      : null

    const client = plain.client
      ? {
          uuid: plain.client.uuid,
          name: plain.client.name,
          type: plain.client.type
        }
      : null

    return {
      uuid: plain.uuid,
      project,
      sales_order: salesOrder,
      client,
      date: this.formatDate(plain.date)!,
      due_date: this.formatDate(plain.due_date),
      status: plain.status,
      items: plain.items ?? [],
      total_amount: Number(plain.total_amount ?? 0),
      created_at: plain.created_at,
      updated_at: plain.updated_at
    }
  }

  private normalizeStatus(value?: string): InvoiceStatus {
    if (typeof value !== 'string') return INVOICE_STATUS.DRAFT
    const normalized = value.toLowerCase() as InvoiceStatus
    return ALLOWED_STATUS.includes(normalized) ? normalized : INVOICE_STATUS.DRAFT
  }

  private normalizeItems(items: any): object[] {
    if (!Array.isArray(items)) return []
    return items.map((item) => {
      if (item && typeof item === 'object') {
        return item
      }
      return { description: String(item) }
    })
  }

  private async ensureProject(uuid: string | null | undefined, companyId: number) {
    if (!uuid) return null
    const project = await ProjectModel.findByUuid(uuid, companyId)
    if (!project) {
      throw new Error('INVALID_PROJECT')
    }
    return project
  }

  private async ensureSalesOrder(uuid: string | null | undefined, companyId: number) {
    if (!uuid) return null
    const order = await SalesOrderModel.findByUuid(uuid, companyId)
    if (!order) {
      throw new Error('INVALID_SALES_ORDER')
    }
    return order
  }

  private async ensureClient(uuid: string | null | undefined, companyId: number) {
    if (!uuid) return null
    const client = await ContactModel.findByUuid(uuid, companyId)
    if (!client) {
      throw new Error('INVALID_CLIENT')
    }
    if (client.type === 'vendor') {
      throw new Error('INVALID_CLIENT_TYPE')
    }
    return client
  }

  async list(req: CustomRequest, res: CustomResponse) {
    try {
      const companyId = req.user?.company_id
      if (!companyId) {
        return createResponse1({ res, status: STATUS_CODES.FORBIDDEN, message: 'Company context is required.' })
      }

      const page = Math.max(Number(req.query.page ?? 1), 1)
      const limit = Math.max(Number(req.query.limit ?? INVOICE_DEFAULT_LIMIT), 1)
      const offset = (page - 1) * limit

      const statuses = req.query.status
        ? (Array.isArray(req.query.status) ? req.query.status : String(req.query.status).split(','))
            .map((value) => value.toString().trim().toLowerCase())
            .filter((value): value is InvoiceStatus => (ALLOWED_STATUS as string[]).includes(value))
        : undefined

      let projectId: number | undefined
      if (req.query.project_uuid) {
        const project = await this.ensureProject(String(req.query.project_uuid), companyId)
        projectId = project?.id
      }

      let salesOrderId: number | undefined
      if (req.query.sales_order_uuid) {
        const salesOrder = await this.ensureSalesOrder(String(req.query.sales_order_uuid), companyId)
        salesOrderId = salesOrder?.id
      }

      let clientId: number | undefined
      if (req.query.client_uuid) {
        const client = await this.ensureClient(String(req.query.client_uuid), companyId)
        clientId = client?.id
      }

      const { rows, count } = await InvoiceModel.listInvoices({
        projectId,
        salesOrderId,
        clientId,
        status: statuses,
        dateFrom: req.query.date_from as string,
        dateTo: req.query.date_to as string,
        search: req.query.search as string,
        limit,
        offset,
        companyId
      })

      return createResponse(res, STATUS_CODES.OK, res.__('INVOICE.LIST_SUCCESS'), {
        invoices: rows.map((row) => this.sanitize(row)),
        pagination: {
          total: count,
          page,
          limit
        }
      })
    } catch (error: any) {
      if (error instanceof Error) {
        switch (error.message) {
          case 'INVALID_PROJECT':
            return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'project_uuid') })
          case 'INVALID_SALES_ORDER':
            return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'sales_order_uuid') })
          case 'INVALID_CLIENT':
          case 'INVALID_CLIENT_TYPE':
            return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'client_uuid') })
        }
      }
      logger.error(__filename, 'list', req.custom?.request_uuid, 'Error listing invoices', error)
      return createResponse1({
        res,
        status: STATUS_CODES.INTERNAL_SERVER_ERROR,
        message: res.__('SERVER_ERROR_MESSAGE')
      })
    }
  }

  async create(req: CustomRequest, res: CustomResponse) {
    try {
      const companyId = req.user?.company_id
      if (!companyId) {
        return createResponse1({ res, status: STATUS_CODES.FORBIDDEN, message: 'Company context is required.' })
      }

      const { project_uuid, sales_order_uuid, client_uuid, date, due_date, status, items, total_amount } = req.body

      const project = await this.ensureProject(project_uuid, companyId)
      const salesOrder = await this.ensureSalesOrder(sales_order_uuid, companyId)
      const client = await this.ensureClient(client_uuid, companyId)

      const normalizedStatus = this.normalizeStatus(status)
      const normalizedItems = this.normalizeItems(items)
      const numericTotal = Number(total_amount ?? 0)

      const invoice = await InvoiceModel.createInvoice({
        project_id: project?.id ?? null,
        sales_order_id: salesOrder?.id ?? null,
        client_id: client?.id ?? null,
        date,
        due_date: due_date ?? null,
        status: normalizedStatus,
        items: normalizedItems,
        total_amount: numericTotal,
        company_id: companyId
      })

      const hydrated = await InvoiceModel.findByUuid(invoice.uuid, companyId)
      if (!hydrated) {
        throw new Error('CREATION_FAILED')
      }

      return createResponse(res, STATUS_CODES.CREATED, res.__('INVOICE.CREATE_SUCCESS'), this.sanitize(hydrated))
    } catch (error: any) {
      if (error instanceof Error) {
        switch (error.message) {
          case 'INVALID_PROJECT':
            return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'project_uuid') })
          case 'INVALID_SALES_ORDER':
            return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'sales_order_uuid') })
          case 'INVALID_CLIENT':
          case 'INVALID_CLIENT_TYPE':
            return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'client_uuid') })
        }
      }
      logger.error(__filename, 'create', req.custom?.request_uuid, 'Error creating invoice', error)
      return createResponse1({
        res,
        status: STATUS_CODES.INTERNAL_SERVER_ERROR,
        message: res.__('SERVER_ERROR_MESSAGE')
      })
    }
  }

  async get(req: CustomRequest, res: CustomResponse) {
    try {
      const { uuid } = req.params
      const companyId = req.user?.company_id
      if (!companyId) {
        return createResponse1({ res, status: STATUS_CODES.FORBIDDEN, message: 'Company context is required.' })
      }

      const invoice = await InvoiceModel.findByUuid(uuid, companyId)
      if (!invoice) {
        return createResponse1({ res, status: STATUS_CODES.NOT_FOUND, message: res.__('INVOICE.NOT_FOUND') })
      }

      return createResponse(res, STATUS_CODES.OK, res.__('INVOICE.DETAIL_SUCCESS'), this.sanitize(invoice))
    } catch (error) {
      logger.error(__filename, 'get', req.custom?.request_uuid, 'Error fetching invoice', error)
      return createResponse1({
        res,
        status: STATUS_CODES.INTERNAL_SERVER_ERROR,
        message: res.__('SERVER_ERROR_MESSAGE')
      })
    }
  }

  async update(req: CustomRequest, res: CustomResponse) {
    try {
      const { uuid } = req.params
      const { project_uuid, sales_order_uuid, client_uuid, date, due_date, status, items, total_amount } = req.body

      const companyId = req.user?.company_id
      if (!companyId) {
        return createResponse1({ res, status: STATUS_CODES.FORBIDDEN, message: 'Company context is required.' })
      }

      const existing = await InvoiceModel.findByUuid(uuid, companyId)
      if (!existing) {
        return createResponse1({ res, status: STATUS_CODES.NOT_FOUND, message: res.__('INVOICE.NOT_FOUND') })
      }

      let projectId: number | null | undefined
      if (project_uuid !== undefined) {
        if (!project_uuid) {
          projectId = null
        } else {
          const project = await this.ensureProject(project_uuid, companyId)
          projectId = project?.id ?? null
        }
      }

      let salesOrderId: number | null | undefined
      if (sales_order_uuid !== undefined) {
        if (!sales_order_uuid) {
          salesOrderId = null
        } else {
          const salesOrder = await this.ensureSalesOrder(sales_order_uuid, companyId)
          salesOrderId = salesOrder?.id ?? null
        }
      }

      let clientId: number | null | undefined
      if (client_uuid !== undefined) {
        if (!client_uuid) {
          clientId = null
        } else {
          const client = await this.ensureClient(client_uuid, companyId)
          clientId = client?.id ?? null
        }
      }

      const payload: any = {}
      if (projectId !== undefined) payload.project_id = projectId
      if (salesOrderId !== undefined) payload.sales_order_id = salesOrderId
      if (clientId !== undefined) payload.client_id = clientId

      if (date !== undefined) payload.date = date
      if (due_date !== undefined) payload.due_date = due_date ?? null

      if (status !== undefined) {
        const normalizedStatus = this.normalizeStatus(status)
        payload.status = normalizedStatus
      }

      if (items !== undefined) {
        payload.items = this.normalizeItems(items)
      }

      if (total_amount !== undefined) {
        payload.total_amount = Number(total_amount)
      }

      const updated = await InvoiceModel.updateByUuid(uuid, payload, companyId)
      if (!updated) {
        return createResponse1({ res, status: STATUS_CODES.INTERNAL_SERVER_ERROR, message: res.__('SERVER_ERROR_MESSAGE') })
      }

      return createResponse(res, STATUS_CODES.OK, res.__('INVOICE.UPDATE_SUCCESS'), this.sanitize(updated))
    } catch (error: any) {
      if (error instanceof Error) {
        switch (error.message) {
          case 'INVALID_PROJECT':
            return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'project_uuid') })
          case 'INVALID_SALES_ORDER':
            return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'sales_order_uuid') })
          case 'INVALID_CLIENT':
          case 'INVALID_CLIENT_TYPE':
            return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'client_uuid') })
        }
      }
      logger.error(__filename, 'update', req.custom?.request_uuid, 'Error updating invoice', error)
      return createResponse1({
        res,
        status: STATUS_CODES.INTERNAL_SERVER_ERROR,
        message: res.__('SERVER_ERROR_MESSAGE')
      })
    }
  }

  async remove(req: CustomRequest, res: CustomResponse) {
    try {
      const { uuid } = req.params
      const companyId = req.user?.company_id
      if (!companyId) {
        return createResponse1({ res, status: STATUS_CODES.FORBIDDEN, message: 'Company context is required.' })
      }

      const deleted = await InvoiceModel.deleteByUuid(uuid, companyId)
      if (!deleted) {
        return createResponse1({ res, status: STATUS_CODES.NOT_FOUND, message: res.__('INVOICE.NOT_FOUND') })
      }

      return createResponse1({ res, status: STATUS_CODES.OK, message: res.__('INVOICE.DELETE_SUCCESS') })
    } catch (error) {
      logger.error(__filename, 'remove', req.custom?.request_uuid, 'Error deleting invoice', error)
      return createResponse1({
        res,
        status: STATUS_CODES.INTERNAL_SERVER_ERROR,
        message: res.__('SERVER_ERROR_MESSAGE')
      })
    }
  }
}

export default new InvoiceController()
