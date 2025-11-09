import { NextFunction, Request, Response } from 'express'
import { createValidationResponse } from '../../../utils/helper'
import { isEmpty } from '../../../utils/validator'
import { REGEXP, VENDOR_BILL_STATUS } from '../../../utils/constants'

const ALLOWED_STATUS = Object.values(VENDOR_BILL_STATUS)

const isUuid = (value: unknown) => typeof value === 'string' && REGEXP.UUID.test(value)
const isValidStatus = (value: unknown) => typeof value === 'string' && (ALLOWED_STATUS as readonly string[]).includes(value.toLowerCase())
const isValidDate = (value: unknown) => typeof value === 'string' && REGEXP.DATE_FORMAT.test(value)

class VendorBillValidations {
  private sendErrors(res: Response, errors: Record<string, string>) {
    if (Object.keys(errors).length > 0) {
      createValidationResponse(res, errors)
      return true
    }
    return false
  }

  list = (req: Request, res: Response, next: NextFunction) => {
    const { page, limit, status, project_uuid, purchase_order_uuid, vendor_uuid, date_from, date_to } = req.query
    const errors: Record<string, string> = {}

    if (page && Number(page) <= 0) errors.page = res.__('VALIDATIONS.invalid', 'page')
    if (limit && Number(limit) <= 0) errors.limit = res.__('VALIDATIONS.invalid', 'limit')

    if (status) {
      const statuses = Array.isArray(status) ? status : String(status).split(',')
      if (statuses.some((value) => !isValidStatus(value))) {
        errors.status = res.__('VALIDATIONS.invalid', 'status')
      }
    }

    if (project_uuid && !isUuid(project_uuid)) {
      errors.project_uuid = res.__('VALIDATIONS.invalid', 'project_uuid')
    }
    if (purchase_order_uuid && !isUuid(purchase_order_uuid)) {
      errors.purchase_order_uuid = res.__('VALIDATIONS.invalid', 'purchase_order_uuid')
    }
    if (vendor_uuid && !isUuid(vendor_uuid)) {
      errors.vendor_uuid = res.__('VALIDATIONS.invalid', 'vendor_uuid')
    }

    if (date_from && !isValidDate(date_from)) {
      errors.date_from = res.__('VALIDATIONS.invalid', 'date_from')
    }
    if (date_to && !isValidDate(date_to)) {
      errors.date_to = res.__('VALIDATIONS.invalid', 'date_to')
    }

    if (!this.sendErrors(res, errors)) next()
  }

  create = (req: Request, res: Response, next: NextFunction) => {
    const { project_uuid, purchase_order_uuid, vendor_uuid, date, due_date, status, items, total_amount } = req.body
    const errors: Record<string, string> = {}

    if (!isEmpty(project_uuid) && !isUuid(project_uuid)) {
      errors.project_uuid = res.__('VALIDATIONS.invalid', 'project_uuid')
    }
    if (!isEmpty(purchase_order_uuid) && !isUuid(purchase_order_uuid)) {
      errors.purchase_order_uuid = res.__('VALIDATIONS.invalid', 'purchase_order_uuid')
    }
    if (!isEmpty(vendor_uuid) && !isUuid(vendor_uuid)) {
      errors.vendor_uuid = res.__('VALIDATIONS.invalid', 'vendor_uuid')
    }

    if (isEmpty(date) || !isValidDate(date)) {
      errors.date = res.__('VALIDATIONS.invalid', 'date')
    }

    if (!isEmpty(due_date) && !isValidDate(due_date)) {
      errors.due_date = res.__('VALIDATIONS.invalid', 'due_date')
    }

    if (!isEmpty(status) && !isValidStatus(status)) {
      errors.status = res.__('VALIDATIONS.invalid', 'status')
    }

    if (!Array.isArray(items)) {
      errors.items = res.__('VALIDATIONS.invalid', 'items')
    }

    const numericTotal = Number(total_amount)
    if (Number.isNaN(numericTotal) || numericTotal < 0) {
      errors.total_amount = res.__('VALIDATIONS.invalid', 'total_amount')
    }

    if (!this.sendErrors(res, errors)) next()
  }

  update = (req: Request, res: Response, next: NextFunction) => {
    const { project_uuid, purchase_order_uuid, vendor_uuid, date, due_date, status, items, total_amount } = req.body
    const errors: Record<string, string> = {}

    if (project_uuid !== undefined && project_uuid !== null && String(project_uuid).trim() !== '' && !isUuid(project_uuid)) {
      errors.project_uuid = res.__('VALIDATIONS.invalid', 'project_uuid')
    }
    if (purchase_order_uuid !== undefined && purchase_order_uuid !== null && String(purchase_order_uuid).trim() !== '' && !isUuid(purchase_order_uuid)) {
      errors.purchase_order_uuid = res.__('VALIDATIONS.invalid', 'purchase_order_uuid')
    }
    if (vendor_uuid !== undefined && vendor_uuid !== null && String(vendor_uuid).trim() !== '' && !isUuid(vendor_uuid)) {
      errors.vendor_uuid = res.__('VALIDATIONS.invalid', 'vendor_uuid')
    }

    if (date !== undefined && !isEmpty(date) && !isValidDate(date)) {
      errors.date = res.__('VALIDATIONS.invalid', 'date')
    }
    if (due_date !== undefined && !isEmpty(due_date) && !isValidDate(due_date)) {
      errors.due_date = res.__('VALIDATIONS.invalid', 'due_date')
    }

    if (status !== undefined) {
      if (isEmpty(status) || !isValidStatus(status)) {
        errors.status = res.__('VALIDATIONS.invalid', 'status')
      }
    }

    if (items !== undefined && !Array.isArray(items)) {
      errors.items = res.__('VALIDATIONS.invalid', 'items')
    }

    if (total_amount !== undefined) {
      const numericTotal = Number(total_amount)
      if (Number.isNaN(numericTotal) || numericTotal < 0) {
        errors.total_amount = res.__('VALIDATIONS.invalid', 'total_amount')
      }
    }

    if (!this.sendErrors(res, errors)) next()
  }
}

export default new VendorBillValidations()
