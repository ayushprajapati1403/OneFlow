import STATUS_CODES from 'http-status-codes'
import { CustomRequest, CustomResponse } from '../../../environment'
import { createResponse, createResponse1 } from '../../../utils/helper'
import { logger } from '../../../utils/logger'
import SalesOrderModel from '../model/SalesOrderModel'
import ProjectModel from '../../Projects/model/ProjectModel'
import ContactModel from '../../Contacts/model/ContactModel'
import { SALES_ORDER_DEFAULT_LIMIT, SALES_ORDER_STATUS } from '../../../utils/constants'
import SalesOrderSchema, { SalesOrderStatus } from '../schema/SalesOrderSchema'
import ProjectSchema from '../../Projects/schema/ProjectSchema'
import ContactSchema from '../../Contacts/schema/ContactSchema'

type SanitizedSalesOrder = {
  uuid: string
  project: {
    uuid: string
    name: string
  } | null
  client: {
    uuid: string
    name: string
    type: string
  } | null
  date: string
  status: SalesOrderStatus
  items: object[]
  total_amount: number
  created_at: Date
  updated_at: Date
}

const ALLOWED_STATUS = Object.values(SALES_ORDER_STATUS) as SalesOrderStatus[]

class SalesOrderController {
  private formatDate(value: Date | string): string {
    if (value instanceof Date) return value.toISOString().slice(0, 10)
    return value
  }

  private sanitize(order: SalesOrderSchema): SanitizedSalesOrder {
    const plain = order.get({
      plain: true
    }) as SalesOrderSchema & {
      project?: ProjectSchema | null
      client?: ContactSchema | null
    }

    const project = plain.project
      ? {
          uuid: plain.project.uuid,
          name: plain.project.name
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
      client,
      date: this.formatDate(plain.date),
      status: plain.status,
      items: plain.items ?? [],
      total_amount: Number(plain.total_amount ?? 0),
      created_at: plain.created_at,
      updated_at: plain.updated_at
    }
  }

  private normalizeStatus(value?: string): SalesOrderStatus {
    if (typeof value !== 'string') return SALES_ORDER_STATUS.DRAFT
    const normalized = value.toLowerCase() as SalesOrderStatus
    return ALLOWED_STATUS.includes(normalized) ? normalized : SALES_ORDER_STATUS.DRAFT
  }

  private async ensureProject(uuid: string | null | undefined, companyId: number) {
    if (!uuid) return null
    const project = await ProjectModel.findByUuid(uuid, companyId)
    if (!project) {
      throw new Error('INVALID_PROJECT')
    }
    return project
  }

  private async ensureClient(uuid: string | null | undefined, companyId: number) {
    if (!uuid) return null
    const contact = await ContactModel.findByUuid(uuid, companyId)
    if (!contact) {
      throw new Error('INVALID_CLIENT')
    }
    if (contact.type === 'vendor') {
      throw new Error('INVALID_CLIENT_TYPE')
    }
    return contact
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

  async list(req: CustomRequest, res: CustomResponse) {
    try {
      const companyId = req.user?.company_id
      if (!companyId) {
        return createResponse1({ res, status: STATUS_CODES.FORBIDDEN, message: 'Company context is required.' })
      }

      const page = Math.max(Number(req.query.page ?? 1), 1)
      const limit = Math.max(Number(req.query.limit ?? SALES_ORDER_DEFAULT_LIMIT), 1)
      const offset = (page - 1) * limit

      const statuses = req.query.status
        ? (Array.isArray(req.query.status) ? req.query.status : String(req.query.status).split(','))
            .map((value) => value.toString().trim().toLowerCase())
            .filter((value): value is SalesOrderStatus => (ALLOWED_STATUS as string[]).includes(value))
        : undefined

      let projectId: number | undefined
      if (req.query.project_uuid) {
        const project = await this.ensureProject(String(req.query.project_uuid), companyId)
        projectId = project?.id
      }

      let clientId: number | undefined
      if (req.query.client_uuid) {
        const client = await this.ensureClient(String(req.query.client_uuid), companyId)
        clientId = client?.id
      }

      const { rows, count } = await SalesOrderModel.listSalesOrders({
        projectId,
        clientId,
        status: statuses,
        dateFrom: req.query.date_from as string,
        dateTo: req.query.date_to as string,
        search: req.query.search as string,
        limit,
        offset,
        companyId
      })

      return createResponse(res, STATUS_CODES.OK, res.__('SALES_ORDER.LIST_SUCCESS'), {
        sales_orders: rows.map((row) => this.sanitize(row)),
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
          case 'INVALID_CLIENT':
            return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'client_uuid') })
          case 'INVALID_CLIENT_TYPE':
            return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'client_uuid') })
        }
      }
      logger.error(__filename, 'list', req.custom?.request_uuid, 'Error listing sales orders', error)
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

      const { project_uuid, client_uuid, date, status, items, total_amount } = req.body

      const project = await this.ensureProject(project_uuid, companyId)
      const client = await this.ensureClient(client_uuid, companyId)

      const normalizedStatus = this.normalizeStatus(status)
      const normalizedItems = this.normalizeItems(items)
      const numericTotal = Number(total_amount ?? 0)

      const salesOrder = await SalesOrderModel.createSalesOrder({
        project_id: project?.id ?? null,
        client_id: client?.id ?? null,
        date,
        status: normalizedStatus,
        items: normalizedItems,
        total_amount: numericTotal,
        company_id: companyId
      })

      const hydrated = await SalesOrderModel.findByUuid(salesOrder.uuid, companyId)
      if (!hydrated) {
        throw new Error('CREATION_FAILED')
      }

      return createResponse(res, STATUS_CODES.CREATED, res.__('SALES_ORDER.CREATE_SUCCESS'), this.sanitize(hydrated))
    } catch (error: any) {
      if (error instanceof Error) {
        switch (error.message) {
          case 'INVALID_PROJECT':
            return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'project_uuid') })
          case 'INVALID_CLIENT':
            return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'client_uuid') })
          case 'INVALID_CLIENT_TYPE':
            return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'client_uuid') })
        }
      }
      logger.error(__filename, 'create', req.custom?.request_uuid, 'Error creating sales order', error)
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

      const order = await SalesOrderModel.findByUuid(uuid, companyId)
      if (!order) {
        return createResponse1({ res, status: STATUS_CODES.NOT_FOUND, message: res.__('SALES_ORDER.NOT_FOUND') })
      }

      return createResponse(res, STATUS_CODES.OK, res.__('SALES_ORDER.DETAIL_SUCCESS'), this.sanitize(order))
    } catch (error) {
      logger.error(__filename, 'get', req.custom?.request_uuid, 'Error fetching sales order', error)
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
      const { project_uuid, client_uuid, date, status, items, total_amount } = req.body

      const companyId = req.user?.company_id
      if (!companyId) {
        return createResponse1({ res, status: STATUS_CODES.FORBIDDEN, message: 'Company context is required.' })
      }

      const existing = await SalesOrderModel.findByUuid(uuid, companyId)
      if (!existing) {
        return createResponse1({ res, status: STATUS_CODES.NOT_FOUND, message: res.__('SALES_ORDER.NOT_FOUND') })
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
      if (clientId !== undefined) payload.client_id = clientId

      if (date !== undefined) payload.date = date

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

      const updated = await SalesOrderModel.updateByUuid(uuid, payload, companyId)
      if (!updated) {
        return createResponse1({ res, status: STATUS_CODES.INTERNAL_SERVER_ERROR, message: res.__('SERVER_ERROR_MESSAGE') })
      }

      return createResponse(res, STATUS_CODES.OK, res.__('SALES_ORDER.UPDATE_SUCCESS'), this.sanitize(updated))
    } catch (error: any) {
      if (error instanceof Error) {
        switch (error.message) {
          case 'INVALID_PROJECT':
            return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'project_uuid') })
          case 'INVALID_CLIENT':
          case 'INVALID_CLIENT_TYPE':
            return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'client_uuid') })
        }
      }
      logger.error(__filename, 'update', req.custom?.request_uuid, 'Error updating sales order', error)
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

      const deleted = await SalesOrderModel.deleteByUuid(uuid, companyId)
      if (!deleted) {
        return createResponse1({ res, status: STATUS_CODES.NOT_FOUND, message: res.__('SALES_ORDER.NOT_FOUND') })
      }

      return createResponse1({ res, status: STATUS_CODES.OK, message: res.__('SALES_ORDER.DELETE_SUCCESS') })
    } catch (error) {
      logger.error(__filename, 'remove', req.custom?.request_uuid, 'Error deleting sales order', error)
      return createResponse1({
        res,
        status: STATUS_CODES.INTERNAL_SERVER_ERROR,
        message: res.__('SERVER_ERROR_MESSAGE')
      })
    }
  }
}

export default new SalesOrderController()
