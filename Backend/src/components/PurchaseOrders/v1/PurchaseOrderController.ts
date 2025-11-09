import STATUS_CODES from 'http-status-codes'
import { CustomRequest, CustomResponse } from '../../../environment'
import { createResponse, createResponse1 } from '../../../utils/helper'
import { logger } from '../../../utils/logger'
import PurchaseOrderModel from '../model/PurchaseOrderModel'
import ProjectModel from '../../Projects/model/ProjectModel'
import ContactModel from '../../Contacts/model/ContactModel'
import { PURCHASE_ORDER_DEFAULT_LIMIT, PURCHASE_ORDER_STATUS } from '../../../utils/constants'
import PurchaseOrderSchema, { PurchaseOrderStatus } from '../schema/PurchaseOrderSchema'
import ProjectSchema from '../../Projects/schema/ProjectSchema'
import ContactSchema from '../../Contacts/schema/ContactSchema'

type SanitizedPurchaseOrder = {
  uuid: string
  project: {
    uuid: string
    name: string
  } | null
  vendor: {
    uuid: string
    name: string
    type: string
  } | null
  date: string
  status: PurchaseOrderStatus
  items: object[]
  total_amount: number
  created_at: Date
  updated_at: Date
}

const ALLOWED_STATUS = Object.values(PURCHASE_ORDER_STATUS) as PurchaseOrderStatus[]

class PurchaseOrderController {
  private formatDate(value: Date | string): string {
    if (value instanceof Date) return value.toISOString().slice(0, 10)
    return value
  }

  private sanitize(order: PurchaseOrderSchema): SanitizedPurchaseOrder {
    const plain = order.get({
      plain: true
    }) as PurchaseOrderSchema & {
      project?: ProjectSchema | null
      vendor?: ContactSchema | null
    }

    const project = plain.project
      ? {
          uuid: plain.project.uuid,
          name: plain.project.name
        }
      : null

    const vendor = plain.vendor
      ? {
          uuid: plain.vendor.uuid,
          name: plain.vendor.name,
          type: plain.vendor.type
        }
      : null

    return {
      uuid: plain.uuid,
      project,
      vendor,
      date: this.formatDate(plain.date),
      status: plain.status,
      items: plain.items ?? [],
      total_amount: Number(plain.total_amount ?? 0),
      created_at: plain.created_at,
      updated_at: plain.updated_at
    }
  }

  private normalizeStatus(value?: string): PurchaseOrderStatus {
    if (typeof value !== 'string') return PURCHASE_ORDER_STATUS.DRAFT
    const normalized = value.toLowerCase() as PurchaseOrderStatus
    return ALLOWED_STATUS.includes(normalized) ? normalized : PURCHASE_ORDER_STATUS.DRAFT
  }

  private async ensureProject(uuid?: string | null) {
    if (!uuid) return null
    const project = await ProjectModel.findByUuid(uuid)
    if (!project) {
      throw new Error('INVALID_PROJECT')
    }
    return project
  }

  private async ensureVendor(uuid?: string | null) {
    if (!uuid) return null
    const contact = await ContactModel.findByUuid(uuid)
    if (!contact) {
      throw new Error('INVALID_VENDOR')
    }
    if (contact.type === 'client') {
      throw new Error('INVALID_VENDOR_TYPE')
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
      const page = Math.max(Number(req.query.page ?? 1), 1)
      const limit = Math.max(Number(req.query.limit ?? PURCHASE_ORDER_DEFAULT_LIMIT), 1)
      const offset = (page - 1) * limit

      const statuses = req.query.status
        ? (Array.isArray(req.query.status) ? req.query.status : String(req.query.status).split(','))
            .map((value) => value.toString().trim().toLowerCase())
            .filter((value): value is PurchaseOrderStatus => (ALLOWED_STATUS as string[]).includes(value))
        : undefined

      let projectId: number | undefined
      if (req.query.project_uuid) {
        const project = await this.ensureProject(String(req.query.project_uuid))
        projectId = project?.id
      }

      let vendorId: number | undefined
      if (req.query.vendor_uuid) {
        const vendor = await this.ensureVendor(String(req.query.vendor_uuid))
        vendorId = vendor?.id
      }

      const { rows, count } = await PurchaseOrderModel.listPurchaseOrders({
        projectId,
        vendorId,
        status: statuses,
        dateFrom: req.query.date_from as string,
        dateTo: req.query.date_to as string,
        search: req.query.search as string,
        limit,
        offset
      })

      return createResponse(res, STATUS_CODES.OK, res.__('PURCHASE_ORDER.LIST_SUCCESS'), {
        purchase_orders: rows.map((row) => this.sanitize(row)),
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
          case 'INVALID_VENDOR':
          case 'INVALID_VENDOR_TYPE':
            return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'vendor_uuid') })
        }
      }
      logger.error(__filename, 'list', req.custom?.request_uuid, 'Error listing purchase orders', error)
      return createResponse1({
        res,
        status: STATUS_CODES.INTERNAL_SERVER_ERROR,
        message: res.__('SERVER_ERROR_MESSAGE')
      })
    }
  }

  async create(req: CustomRequest, res: CustomResponse) {
    try {
      const { project_uuid, vendor_uuid, date, status, items, total_amount } = req.body

      const project = await this.ensureProject(project_uuid)
      const vendor = await this.ensureVendor(vendor_uuid)

      const normalizedStatus = this.normalizeStatus(status)
      const normalizedItems = this.normalizeItems(items)
      const numericTotal = Number(total_amount ?? 0)

      const purchaseOrder = await PurchaseOrderModel.createPurchaseOrder({
        project_id: project?.id ?? null,
        vendor_id: vendor?.id ?? null,
        date,
        status: normalizedStatus,
        items: normalizedItems,
        total_amount: numericTotal
      })

      const hydrated = await PurchaseOrderModel.findByUuid(purchaseOrder.uuid)
      if (!hydrated) {
        throw new Error('CREATION_FAILED')
      }

      return createResponse(res, STATUS_CODES.CREATED, res.__('PURCHASE_ORDER.CREATE_SUCCESS'), this.sanitize(hydrated))
    } catch (error: any) {
      if (error instanceof Error) {
        switch (error.message) {
          case 'INVALID_PROJECT':
            return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'project_uuid') })
          case 'INVALID_VENDOR':
          case 'INVALID_VENDOR_TYPE':
            return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'vendor_uuid') })
        }
      }
      logger.error(__filename, 'create', req.custom?.request_uuid, 'Error creating purchase order', error)
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
      const order = await PurchaseOrderModel.findByUuid(uuid)
      if (!order) {
        return createResponse1({ res, status: STATUS_CODES.NOT_FOUND, message: res.__('PURCHASE_ORDER.NOT_FOUND') })
      }

      return createResponse(res, STATUS_CODES.OK, res.__('PURCHASE_ORDER.DETAIL_SUCCESS'), this.sanitize(order))
    } catch (error) {
      logger.error(__filename, 'get', req.custom?.request_uuid, 'Error fetching purchase order', error)
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
      const { project_uuid, vendor_uuid, date, status, items, total_amount } = req.body

      const existing = await PurchaseOrderModel.findByUuid(uuid)
      if (!existing) {
        return createResponse1({ res, status: STATUS_CODES.NOT_FOUND, message: res.__('PURCHASE_ORDER.NOT_FOUND') })
      }

      let projectId: number | null | undefined
      if (project_uuid !== undefined) {
        if (!project_uuid) {
          projectId = null
        } else {
          const project = await this.ensureProject(project_uuid)
          projectId = project?.id ?? null
        }
      }

      let vendorId: number | null | undefined
      if (vendor_uuid !== undefined) {
        if (!vendor_uuid) {
          vendorId = null
        } else {
          const vendor = await this.ensureVendor(vendor_uuid)
          vendorId = vendor?.id ?? null
        }
      }

      const payload: any = {}
      if (projectId !== undefined) payload.project_id = projectId
      if (vendorId !== undefined) payload.vendor_id = vendorId

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

      const updated = await PurchaseOrderModel.updateByUuid(uuid, payload)
      if (!updated) {
        return createResponse1({ res, status: STATUS_CODES.INTERNAL_SERVER_ERROR, message: res.__('SERVER_ERROR_MESSAGE') })
      }

      return createResponse(res, STATUS_CODES.OK, res.__('PURCHASE_ORDER.UPDATE_SUCCESS'), this.sanitize(updated))
    } catch (error: any) {
      if (error instanceof Error) {
        switch (error.message) {
          case 'INVALID_PROJECT':
            return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'project_uuid') })
          case 'INVALID_VENDOR':
          case 'INVALID_VENDOR_TYPE':
            return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'vendor_uuid') })
        }
      }
      logger.error(__filename, 'update', req.custom?.request_uuid, 'Error updating purchase order', error)
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
      const deleted = await PurchaseOrderModel.deleteByUuid(uuid)
      if (!deleted) {
        return createResponse1({ res, status: STATUS_CODES.NOT_FOUND, message: res.__('PURCHASE_ORDER.NOT_FOUND') })
      }

      return createResponse1({ res, status: STATUS_CODES.OK, message: res.__('PURCHASE_ORDER.DELETE_SUCCESS') })
    } catch (error) {
      logger.error(__filename, 'remove', req.custom?.request_uuid, 'Error deleting purchase order', error)
      return createResponse1({
        res,
        status: STATUS_CODES.INTERNAL_SERVER_ERROR,
        message: res.__('SERVER_ERROR_MESSAGE')
      })
    }
  }
}

export default new PurchaseOrderController()
