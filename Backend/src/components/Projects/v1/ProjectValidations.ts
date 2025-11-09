import { NextFunction, Request, Response } from 'express'
import { createValidationResponse } from '../../../utils/helper'
import { isEmpty, isString } from '../../../utils/validator'
import { PROJECT_STATUS, REGEXP } from '../../../utils/constants'

const ALLOWED_STATUS = Object.values(PROJECT_STATUS)

const isValidStatus = (value: unknown): boolean => {
  if (typeof value !== 'string') return false
  return (ALLOWED_STATUS as string[]).includes(value.toLowerCase())
}

const validateDateOnly = (value: unknown): boolean => {
  if (typeof value !== 'string' || isEmpty(value)) return false
  return REGEXP.DATE_FORMAT.test(value)
}

class ProjectValidations {
  private sendErrors(res: Response, errors: Record<string, string>) {
    if (Object.keys(errors).length > 0) {
      createValidationResponse(res, errors)
      return true
    }
    return false
  }

  list = (req: Request, res: Response, next: NextFunction) => {
    const { page, limit, status, client_uuid, manager_uuid } = req.query
    const errors: Record<string, string> = {}

    if (page && Number(page) <= 0) errors.page = res.__('VALIDATIONS.invalid', 'page')
    if (limit && Number(limit) <= 0) errors.limit = res.__('VALIDATIONS.invalid', 'limit')

    if (status) {
      const statuses = Array.isArray(status) ? status : String(status).split(',')
      const invalidStatus = statuses.some((item) => !isValidStatus(String(item).trim()))
      if (invalidStatus) {
        errors.status = res.__('VALIDATIONS.invalid', 'status')
      }
    }

    if (client_uuid && !REGEXP.UUID.test(String(client_uuid))) {
      errors.client_uuid = res.__('VALIDATIONS.invalid', 'client_uuid')
    }

    if (manager_uuid && !REGEXP.UUID.test(String(manager_uuid))) {
      errors.manager_uuid = res.__('VALIDATIONS.invalid', 'manager_uuid')
    }

    if (!this.sendErrors(res, errors)) next()
  }

  create = (req: Request, res: Response, next: NextFunction) => {
    const { name, status, start_date, end_date, budget, client_uuid, manager_uuid } = req.body
    const errors: Record<string, string> = {}

    if (isEmpty(name)) errors.name = res.__('VALIDATIONS.required', 'name')

    if (!isEmpty(status) && !isValidStatus(status)) {
      errors.status = res.__('VALIDATIONS.invalid', 'status')
    }

    if (!isEmpty(start_date) && !validateDateOnly(start_date)) {
      errors.start_date = res.__('VALIDATIONS.invalid', 'start_date')
    }

    if (!isEmpty(end_date) && !validateDateOnly(end_date)) {
      errors.end_date = res.__('VALIDATIONS.invalid', 'end_date')
    }

    if (budget !== undefined && budget !== null) {
      const numericBudget = Number(budget)
      if (Number.isNaN(numericBudget) || numericBudget < 0) {
        errors.budget = res.__('VALIDATIONS.invalid', 'budget')
      }
    }

    if (!isEmpty(client_uuid) && !REGEXP.UUID.test(String(client_uuid))) {
      errors.client_uuid = res.__('VALIDATIONS.invalid', 'client_uuid')
    }

    if (!isEmpty(manager_uuid) && !REGEXP.UUID.test(String(manager_uuid))) {
      errors.manager_uuid = res.__('VALIDATIONS.invalid', 'manager_uuid')
    }

    if (!this.sendErrors(res, errors)) next()
  }

  update = (req: Request, res: Response, next: NextFunction) => {
    const { name, status, start_date, end_date, budget, client_uuid, manager_uuid } = req.body
    const errors: Record<string, string> = {}

    if (name !== undefined && isEmpty(name)) {
      errors.name = res.__('VALIDATIONS.required', 'name')
    }

    if (status !== undefined) {
      if (isEmpty(status)) errors.status = res.__('VALIDATIONS.required', 'status')
      else if (!isString(status) || !isValidStatus(status)) {
        errors.status = res.__('VALIDATIONS.invalid', 'status')
      }
    }

    if (start_date !== undefined && !isEmpty(start_date) && !validateDateOnly(start_date)) {
      errors.start_date = res.__('VALIDATIONS.invalid', 'start_date')
    }

    if (end_date !== undefined && !isEmpty(end_date) && !validateDateOnly(end_date)) {
      errors.end_date = res.__('VALIDATIONS.invalid', 'end_date')
    }

    if (budget !== undefined && budget !== null) {
      const numericBudget = Number(budget)
      if (Number.isNaN(numericBudget) || numericBudget < 0) {
        errors.budget = res.__('VALIDATIONS.invalid', 'budget')
      }
    }

    if (client_uuid !== undefined && client_uuid !== null && String(client_uuid).trim() !== '' && !REGEXP.UUID.test(String(client_uuid))) {
      errors.client_uuid = res.__('VALIDATIONS.invalid', 'client_uuid')
    }

    if (manager_uuid !== undefined && manager_uuid !== null && String(manager_uuid).trim() !== '' && !REGEXP.UUID.test(String(manager_uuid))) {
      errors.manager_uuid = res.__('VALIDATIONS.invalid', 'manager_uuid')
    }

    if (!this.sendErrors(res, errors)) next()
  }
}

export default new ProjectValidations()
