import { NextFunction, Request, Response } from 'express'
import { createValidationResponse } from '../../../utils/helper'
import { isEmpty } from '../../../utils/validator'
import { REGEXP, EXPENSE_STATUS } from '../../../utils/constants'

const ALLOWED_STATUS = Object.values(EXPENSE_STATUS)

const isUuid = (value: unknown) => typeof value === 'string' && REGEXP.UUID.test(value)
const isValidStatus = (value: unknown) => typeof value === 'string' && (ALLOWED_STATUS as readonly string[]).includes(value.toLowerCase())
const isValidDate = (value: unknown) => typeof value === 'string' && REGEXP.DATE_FORMAT.test(value)

class ExpenseValidations {
  private sendErrors(res: Response, errors: Record<string, string>) {
    if (Object.keys(errors).length > 0) {
      createValidationResponse(res, errors)
      return true
    }
    return false
  }

  list = (req: Request, res: Response, next: NextFunction) => {
    const { page, limit, status, project_uuid, user_uuid, billable, date_from, date_to } = req.query
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
    if (user_uuid && !isUuid(user_uuid)) {
      errors.user_uuid = res.__('VALIDATIONS.invalid', 'user_uuid')
    }

    if (billable !== undefined) {
      const normalized = String(billable).toLowerCase()
      if (!['true', 'false'].includes(normalized)) {
        errors.billable = res.__('VALIDATIONS.invalid', 'billable')
      }
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
    const { project_uuid, user_uuid, description, amount, date, billable, status } = req.body
    const errors: Record<string, string> = {}

    if (isEmpty(project_uuid) || !isUuid(project_uuid)) {
      errors.project_uuid = res.__('VALIDATIONS.invalid', 'project_uuid')
    }
    if (!isEmpty(user_uuid) && !isUuid(user_uuid)) {
      errors.user_uuid = res.__('VALIDATIONS.invalid', 'user_uuid')
    }

    if (isEmpty(description)) {
      errors.description = res.__('VALIDATIONS.required', 'description')
    }

    const numericAmount = Number(amount)
    if (Number.isNaN(numericAmount) || numericAmount < 0) {
      errors.amount = res.__('VALIDATIONS.invalid', 'amount')
    }

    if (!isEmpty(date) && !isValidDate(date)) {
      errors.date = res.__('VALIDATIONS.invalid', 'date')
    }

    if (billable !== undefined && typeof billable !== 'boolean') {
      const normalized = String(billable).toLowerCase()
      if (!['true', 'false'].includes(normalized)) {
        errors.billable = res.__('VALIDATIONS.invalid', 'billable')
      }
    }

    if (!isEmpty(status) && !isValidStatus(status)) {
      errors.status = res.__('VALIDATIONS.invalid', 'status')
    }

    if (!this.sendErrors(res, errors)) next()
  }

  update = (req: Request, res: Response, next: NextFunction) => {
    const { project_uuid, user_uuid, description, amount, date, billable, status, receipt_url } = req.body
    const errors: Record<string, string> = {}

    if (project_uuid !== undefined && (project_uuid === null || String(project_uuid).trim() === '' || !isUuid(project_uuid))) {
      errors.project_uuid = res.__('VALIDATIONS.invalid', 'project_uuid')
    }

    if (user_uuid !== undefined && user_uuid !== null && String(user_uuid).trim() !== '' && !isUuid(user_uuid)) {
      errors.user_uuid = res.__('VALIDATIONS.invalid', 'user_uuid')
    }

    if (description !== undefined && isEmpty(description)) {
      errors.description = res.__('VALIDATIONS.required', 'description')
    }

    if (amount !== undefined) {
      const numericAmount = Number(amount)
      if (Number.isNaN(numericAmount) || numericAmount < 0) {
        errors.amount = res.__('VALIDATIONS.invalid', 'amount')
      }
    }

    if (date !== undefined && !isEmpty(date) && !isValidDate(date)) {
      errors.date = res.__('VALIDATIONS.invalid', 'date')
    }

    if (billable !== undefined && typeof billable !== 'boolean') {
      const normalized = String(billable).toLowerCase()
      if (!['true', 'false'].includes(normalized)) {
        errors.billable = res.__('VALIDATIONS.invalid', 'billable')
      }
    }

    if (status !== undefined) {
      if (isEmpty(status) || !isValidStatus(status)) {
        errors.status = res.__('VALIDATIONS.invalid', 'status')
      }
    }

    if (receipt_url !== undefined && receipt_url !== null && typeof receipt_url !== 'string') {
      errors.receipt_url = res.__('VALIDATIONS.invalid', 'receipt_url')
    }

    if (!this.sendErrors(res, errors)) next()
  }
}

export default new ExpenseValidations()
