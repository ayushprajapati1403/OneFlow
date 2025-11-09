import { NextFunction, Request, Response } from 'express'
import { createValidationResponse } from '../../../utils/helper'
import { isEmpty } from '../../../utils/validator'
import { REGEXP, SALES_ORDER_STATUS } from '../../../utils/constants'

const ALLOWED_STATUS = Object.values(SALES_ORDER_STATUS)

const isUuid = (value: unknown) => typeof value === 'string' && REGEXP.UUID.test(value)
const isValidStatus = (value: unknown) => typeof value === 'string' && (ALLOWED_STATUS as readonly string[]).includes(value.toLowerCase())
const isValidDate = (value: unknown) => typeof value === 'string' && REGEXP.DATE_FORMAT.test(value)

class SalesOrderValidations {
  private sendErrors(res: Response, errors: Record<string, string>) {
    if (Object.keys(errors).length > 0) {
      createValidationResponse(res, errors)
      return true
    }
    return false
  }

  list = (req: Request, res: Response, next: NextFunction) => {
    const { page, limit, status, project_uuid, client_uuid, date_from, date_to } = req.query
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
    if (client_uuid && !isUuid(client_uuid)) {
      errors.client_uuid = res.__('VALIDATIONS.invalid', 'client_uuid')
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
    const { project_uuid, client_uuid, date, status, items, total_amount } = req.body
    const errors: Record<string, string> = {}

    if (!isEmpty(project_uuid) && !isUuid(project_uuid)) {
      errors.project_uuid = res.__('VALIDATIONS.invalid', 'project_uuid')
    }
    if (!isEmpty(client_uuid) && !isUuid(client_uuid)) {
      errors.client_uuid = res.__('VALIDATIONS.invalid', 'client_uuid')
    }

    if (isEmpty(date) || !isValidDate(date)) {
      errors.date = res.__('VALIDATIONS.invalid', 'date')
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
    const { project_uuid, client_uuid, date, status, items, total_amount } = req.body
    const errors: Record<string, string> = {}

    if (project_uuid !== undefined && project_uuid !== null && String(project_uuid).trim() !== '' && !isUuid(project_uuid)) {
      errors.project_uuid = res.__('VALIDATIONS.invalid', 'project_uuid')
    }
    if (client_uuid !== undefined && client_uuid !== null && String(client_uuid).trim() !== '' && !isUuid(client_uuid)) {
      errors.client_uuid = res.__('VALIDATIONS.invalid', 'client_uuid')
    }

    if (date !== undefined && !isEmpty(date) && !isValidDate(date)) {
      errors.date = res.__('VALIDATIONS.invalid', 'date')
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

export default new SalesOrderValidations()
