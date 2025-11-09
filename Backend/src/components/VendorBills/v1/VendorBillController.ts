import STATUS_CODES from 'http-status-codes'
import { CustomRequest, CustomResponse } from '../../../environment'
import { createResponse, createResponse1 } from '../../../utils/helper'
import { logger } from '../../../utils/logger'
import VendorBillModel from '../model/VendorBillModel'
import ProjectModel from '../../Projects/model/ProjectModel'
import PurchaseOrderModel from '../../PurchaseOrders/model/PurchaseOrderModel'
import ContactModel from '../../Contacts/model/ContactModel'
import { VENDOR_BILL_DEFAULT_LIMIT, VENDOR_BILL_STATUS } from '../../../utils/constants'
import VendorBillSchema, { VendorBillStatus } from '../schema/VendorBillSchema'
import ProjectSchema from '../../Projects/schema/ProjectSchema'
import PurchaseOrderSchema from '../../PurchaseOrders/schema/PurchaseOrderSchema'
import ContactSchema from '../../Contacts/schema/ContactSchema'

type SanitizedVendorBill = {
  uuid: string
  project: { uuid: string; name: string } | null
  purchase_order: { uuid: string } | null
  vendor: { uuid: string; name: string; type: string } | null
  date: string
  due_date: string | null
  status: VendorBillStatus
  items: object[]
  total_amount: number
  created_at: Date
  updated_at: Date
}

const ALLOWED_STATUS = Object.values(VENDOR_BILL_STATUS) as VendorBillStatus[]

class VendorBillController {
  private formatDate(value: Date | string | null): string | null {
    if (!value) return null
    if (value instanceof Date) return value.toISOString().slice(0, 10)
    return value
  }

  private sanitize(bill: VendorBillSchema): SanitizedVendorBill {
    const plain = bill.get({
      plain: true
    }) as VendorBillSchema & {
      project?: ProjectSchema | null
      purchase_order?: PurchaseOrderSchema | null
      vendor?: ContactSchema | null
    }

    const project = plain.project ? { uuid: plain.project.uuid, name: plain.project.name } : null
    const purchaseOrder = plain.purchase_order ? { uuid: plain.purchase_order.uuid } : null
    const vendor = plain.vendor ? { uuid: plain.vendor.uuid, name: plain.vendor.name, type: plain.vendor.type } : null

    return {
      uuid: plain.uuid,
      project,
      purchase_order: purchaseOrder,
      vendor,
      date: this.formatDate(plain.date)!,
      due_date: this.formatDate(plain.due_date),
      status: plain.status,
      items: plain.items ?? [],
      total_amount: Number(plain.total_amount ?? 0),
      created_at: plain.created_at,
      updated_at: plain.updated_at
    }
  }

  private normalizeStatus(value?: string): VendorBillStatus {
    if (typeof value !== 'string') return VENDOR_BILL_STATUS.DRAFT
    const normalized = value.toLowerCase() as VendorBillStatus
    return ALLOWED_STATUS.includes(normalized) ? normalized : VENDOR_BILL_STATUS.DRAFT
  }

  private normalizeItems(items: any): object[] {
    if (!Array.isArray(items)) return []
    return items.map((item) => (item && typeof item === 'object' ? item : { description: String(item) }))
  }

  private async ensureProject(uuid: string | null | undefined, companyId: number) {
    if (!uuid) return null
    const project = await ProjectModel.findByUuid(uuid, companyId)
    if (!project) {
      throw new Error('INVALID_PROJECT')
    }
    return project
  }

  private async ensurePurchaseOrder(uuid: string | null | undefined, companyId: number) {
    if (!uuid) return null
    const order = await PurchaseOrderModel.findByUuid(uuid, companyId)
    if (!order) {
      throw new Error('INVALID_PURCHASE_ORDER')
    }
    return order
  }

  private async ensureVendor(uuid: string | null | undefined, companyId: number) {
    if (!uuid) return null
    const vendor = await ContactModel.findByUuid(uuid, companyId)
    if (!vendor) {
      throw new Error('INVALID_VENDOR')
    }
    if (vendor.type === 'client') {
      throw new Error('INVALID_VENDOR_TYPE')
    }
    return vendor
  }

  async list(req: CustomRequest, res: CustomResponse) {
    try {
      const companyId = req.user?.company_id
      if (!companyId) {
        return createResponse1({ res, status: STATUS_CODES.FORBIDDEN, message: 'Company context is required.' })
      }

      const page = Math.max(Number(req.query.page ?? 1), 1)
      const limit = Math.max(Number(req.query.limit ?? VENDOR_BILL_DEFAULT_LIMIT), 1)
      const offset = (page - 1) * limit

      const statuses = req.query.status
        ? (Array.isArray(req.query.status) ? req.query.status : String(req.query.status).split(','))
            .map((value) => value.toString().trim().toLowerCase())
            .filter((value): value is VendorBillStatus => (ALLOWED_STATUS as string[]).includes(value))
        : undefined

      let projectId: number | undefined
      if (req.query.project_uuid) {
        const project = await this.ensureProject(String(req.query.project_uuid), companyId)
        projectId = project?.id
      }

      let purchaseOrderId: number | undefined
      if (req.query.purchase_order_uuid) {
        const order = await this.ensurePurchaseOrder(String(req.query.purchase_order_uuid), companyId)
        purchaseOrderId = order?.id
      }

      let vendorId: number | undefined
      if (req.query.vendor_uuid) {
        const vendor = await this.ensureVendor(String(req.query.vendor_uuid), companyId)
        vendorId = vendor?.id
      }

      const { rows, count } = await VendorBillModel.listVendorBills({
        projectId,
        purchaseOrderId,
        vendorId,
        status: statuses,
        dateFrom: req.query.date_from as string,
        dateTo: req.query.date_to as string,
        search: req.query.search as string,
        limit,
        offset,
        companyId
      })

      return createResponse(res, STATUS_CODES.OK, res.__('VENDOR_BILL.LIST_SUCCESS'), {
        vendor_bills: rows.map((row) => this.sanitize(row)),
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
          case 'INVALID_PURCHASE_ORDER':
            return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'purchase_order_uuid') })
          case 'INVALID_VENDOR':
          case 'INVALID_VENDOR_TYPE':
            return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'vendor_uuid') })
        }
      }
      logger.error(__filename, 'list', req.custom?.request_uuid, 'Error listing vendor bills', error)
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

      const { project_uuid, purchase_order_uuid, vendor_uuid, date, due_date, status, items, total_amount } = req.body

      const project = await this.ensureProject(project_uuid, companyId)
      const purchaseOrder = await this.ensurePurchaseOrder(purchase_order_uuid, companyId)
      const vendor = await this.ensureVendor(vendor_uuid, companyId)

      const normalizedStatus = this.normalizeStatus(status)
      const normalizedItems = this.normalizeItems(items)
      const numericTotal = Number(total_amount ?? 0)

      const vendorBill = await VendorBillModel.createVendorBill({
        project_id: project?.id ?? null,
        purchase_order_id: purchaseOrder?.id ?? null,
        vendor_id: vendor?.id ?? null,
        date,
        due_date: due_date ?? null,
        status: normalizedStatus,
        items: normalizedItems,
        total_amount: numericTotal,
        company_id: companyId
      })

      const hydrated = await VendorBillModel.findByUuid(vendorBill.uuid, companyId)
      if (!hydrated) {
        throw new Error('CREATION_FAILED')
      }

      return createResponse(res, STATUS_CODES.CREATED, res.__('VENDOR_BILL.CREATE_SUCCESS'), this.sanitize(hydrated))
    } catch (error: any) {
      if (error instanceof Error) {
        switch (error.message) {
          case 'INVALID_PROJECT':
            return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'project_uuid') })
          case 'INVALID_PURCHASE_ORDER':
            return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'purchase_order_uuid') })
          case 'INVALID_VENDOR':
          case 'INVALID_VENDOR_TYPE':
            return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'vendor_uuid') })
        }
      }
      logger.error(__filename, 'create', req.custom?.request_uuid, 'Error creating vendor bill', error)
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

      const bill = await VendorBillModel.findByUuid(uuid, companyId)
      if (!bill) {
        return createResponse1({ res, status: STATUS_CODES.NOT_FOUND, message: res.__('VENDOR_BILL.NOT_FOUND') })
      }

      return createResponse(res, STATUS_CODES.OK, res.__('VENDOR_BILL.DETAIL_SUCCESS'), this.sanitize(bill))
    } catch (error) {
      logger.error(__filename, 'get', req.custom?.request_uuid, 'Error fetching vendor bill', error)
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
      const { project_uuid, purchase_order_uuid, vendor_uuid, date, due_date, status, items, total_amount } = req.body

      const companyId = req.user?.company_id
      if (!companyId) {
        return createResponse1({ res, status: STATUS_CODES.FORBIDDEN, message: 'Company context is required.' })
      }

      const existing = await VendorBillModel.findByUuid(uuid, companyId)
      if (!existing) {
        return createResponse1({ res, status: STATUS_CODES.NOT_FOUND, message: res.__('VENDOR_BILL.NOT_FOUND') })
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

      let purchaseOrderId: number | null | undefined
      if (purchase_order_uuid !== undefined) {
        if (!purchase_order_uuid) {
          purchaseOrderId = null
        } else {
          const purchaseOrder = await this.ensurePurchaseOrder(purchase_order_uuid, companyId)
          purchaseOrderId = purchaseOrder?.id ?? null
        }
      }

      let vendorId: number | null | undefined
      if (vendor_uuid !== undefined) {
        if (!vendor_uuid) {
          vendorId = null
        } else {
          const vendor = await this.ensureVendor(vendor_uuid, companyId)
          vendorId = vendor?.id ?? null
        }
      }

      const payload: any = {}
      if (projectId !== undefined) payload.project_id = projectId
      if (purchaseOrderId !== undefined) payload.purchase_order_id = purchaseOrderId
      if (vendorId !== undefined) payload.vendor_id = vendorId

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

      const updated = await VendorBillModel.updateByUuid(uuid, payload, companyId)
      if (!updated) {
        return createResponse1({ res, status: STATUS_CODES.INTERNAL_SERVER_ERROR, message: res.__('SERVER_ERROR_MESSAGE') })
      }

      return createResponse(res, STATUS_CODES.OK, res.__('VENDOR_BILL.UPDATE_SUCCESS'), this.sanitize(updated))
    } catch (error: any) {
      if (error instanceof Error) {
        switch (error.message) {
          case 'INVALID_PROJECT':
            return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'project_uuid') })
          case 'INVALID_PURCHASE_ORDER':
            return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'purchase_order_uuid') })
          case 'INVALID_VENDOR':
          case 'INVALID_VENDOR_TYPE':
            return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'vendor_uuid') })
        }
      }
      logger.error(__filename, 'update', req.custom?.request_uuid, 'Error updating vendor bill', error)
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

      const deleted = await VendorBillModel.deleteByUuid(uuid, companyId)
      if (!deleted) {
        return createResponse1({ res, status: STATUS_CODES.NOT_FOUND, message: res.__('VENDOR_BILL.NOT_FOUND') })
      }

      return createResponse1({ res, status: STATUS_CODES.OK, message: res.__('VENDOR_BILL.DELETE_SUCCESS') })
    } catch (error) {
      logger.error(__filename, 'remove', req.custom?.request_uuid, 'Error deleting vendor bill', error)
      return createResponse1({
        res,
        status: STATUS_CODES.INTERNAL_SERVER_ERROR,
        message: res.__('SERVER_ERROR_MESSAGE')
      })
    }
  }
}

export default new VendorBillController()
