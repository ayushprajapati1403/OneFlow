import STATUS_CODES from 'http-status-codes'
import { CustomRequest, CustomResponse } from '../../../environment'
import { createResponse, createResponse1 } from '../../../utils/helper'
import { logger } from '../../../utils/logger'
import ExpenseModel from '../model/ExpenseModel'
import ProjectModel from '../../Projects/model/ProjectModel'
import authModel from '../../Auth/model/AuthModel'
import { EXPENSE_DEFAULT_LIMIT, EXPENSE_STATUS } from '../../../utils/constants'
import ExpenseSchema, { ExpenseStatus } from '../schema/ExpenseSchema'
import ProjectSchema from '../../Projects/schema/ProjectSchema'
import { AuthSchema } from '../../Auth/schema/AuthSchema'

type SanitizedExpense = {
  uuid: string
  project: { uuid: string; name: string }
  user: { uuid: string; name: string; email: string } | null
  description: string
  amount: number
  date: string
  billable: boolean
  status: ExpenseStatus
  receipt_url: string | null
  created_at: Date
  updated_at: Date
}

const ALLOWED_STATUS = Object.values(EXPENSE_STATUS) as ExpenseStatus[]

class ExpenseController {
  private formatDate(value: Date | string): string {
    if (value instanceof Date) return value.toISOString().slice(0, 10)
    return value
  }

  private sanitize(expense: ExpenseSchema): SanitizedExpense {
    const plain = expense.get({
      plain: true
    }) as ExpenseSchema & {
      project?: ProjectSchema
      user?: AuthSchema | null
    }

    const project = plain.project
      ? {
          uuid: plain.project.uuid,
          name: plain.project.name
        }
      : ({ uuid: '', name: '' } as any)

    const user = plain.user
      ? {
          uuid: plain.user.uuid,
          name: plain.user.name,
          email: plain.user.email
        }
      : null

    return {
      uuid: plain.uuid,
      project,
      user,
      description: plain.description,
      amount: Number(plain.amount ?? 0),
      date: this.formatDate(plain.date),
      billable: plain.billable,
      status: plain.status,
      receipt_url: plain.receipt_url,
      created_at: plain.created_at,
      updated_at: plain.updated_at
    }
  }

  private parseBoolean(value: unknown): boolean | undefined {
    if (typeof value === 'boolean') return value
    if (typeof value === 'string') {
      const normalized = value.toLowerCase()
      if (normalized === 'true') return true
      if (normalized === 'false') return false
    }
    return undefined
  }

  private normalizeStatus(value?: string): ExpenseStatus {
    if (typeof value !== 'string') return EXPENSE_STATUS.DRAFT
    const normalized = value.toLowerCase() as ExpenseStatus
    return ALLOWED_STATUS.includes(normalized) ? normalized : EXPENSE_STATUS.DRAFT
  }

  private async ensureProject(uuid?: string) {
    if (!uuid) {
      throw new Error('INVALID_PROJECT')
    }
    const project = await ProjectModel.findByUuid(uuid)
    if (!project) {
      throw new Error('INVALID_PROJECT')
    }
    return project
  }

  private async ensureUser(uuid?: string | null) {
    if (!uuid) return null
    const user = await authModel.findByUuid(uuid)
    if (!user) {
      throw new Error('INVALID_USER')
    }
    return user
  }

  async list(req: CustomRequest, res: CustomResponse) {
    try {
      const page = Math.max(Number(req.query.page ?? 1), 1)
      const limit = Math.max(Number(req.query.limit ?? EXPENSE_DEFAULT_LIMIT), 1)
      const offset = (page - 1) * limit

      const statuses = req.query.status
        ? (Array.isArray(req.query.status) ? req.query.status : String(req.query.status).split(','))
            .map((value) => value.toString().trim().toLowerCase())
            .filter((value): value is ExpenseStatus => (ALLOWED_STATUS as string[]).includes(value))
        : undefined

      let projectId: number | undefined
      if (req.query.project_uuid) {
        const project = await this.ensureProject(String(req.query.project_uuid))
        projectId = project.id
      }

      let userId: number | undefined
      if (req.query.user_uuid) {
        const user = await this.ensureUser(String(req.query.user_uuid))
        userId = user?.id
      }

      const billable = this.parseBoolean(req.query.billable)

      const { rows, count } = await ExpenseModel.listExpenses({
        projectId,
        userId,
        status: statuses,
        billable,
        dateFrom: req.query.date_from as string,
        dateTo: req.query.date_to as string,
        search: req.query.search as string,
        limit,
        offset
      })

      return createResponse(res, STATUS_CODES.OK, res.__('EXPENSE.LIST_SUCCESS'), {
        expenses: rows.map((row) => this.sanitize(row)),
        pagination: {
          total: count,
          page,
          limit
        }
      })
    } catch (error: any) {
      if (error instanceof Error && error.message === 'INVALID_PROJECT') {
        return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'project_uuid') })
      }
      if (error instanceof Error && error.message === 'INVALID_USER') {
        return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'user_uuid') })
      }
      logger.error(__filename, 'list', req.custom?.request_uuid, 'Error listing expenses', error)
      return createResponse1({
        res,
        status: STATUS_CODES.INTERNAL_SERVER_ERROR,
        message: res.__('SERVER_ERROR_MESSAGE')
      })
    }
  }

  async create(req: CustomRequest, res: CustomResponse) {
    try {
      const { project_uuid, user_uuid, description, amount, date, billable, status, receipt_url } = req.body

      const project = await this.ensureProject(project_uuid)
      const user = await this.ensureUser(user_uuid)

      const numericAmount = Number(amount)
      const normalizedStatus = this.normalizeStatus(status)
      const normalizedBillable = typeof billable === 'boolean' ? billable : (this.parseBoolean(billable) ?? false)

      const expense = await ExpenseModel.createExpense({
        project_id: project.id,
        user_id: user?.id ?? null,
        description,
        amount: numericAmount,
        date,
        billable: normalizedBillable,
        status: normalizedStatus,
        receipt_url: receipt_url ?? null
      })

      const hydrated = await ExpenseModel.findByUuid(expense.uuid)
      if (!hydrated) {
        throw new Error('CREATION_FAILED')
      }

      return createResponse(res, STATUS_CODES.CREATED, res.__('EXPENSE.CREATE_SUCCESS'), this.sanitize(hydrated))
    } catch (error: any) {
      if (error instanceof Error) {
        if (error.message === 'INVALID_PROJECT') {
          return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'project_uuid') })
        }
        if (error.message === 'INVALID_USER') {
          return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'user_uuid') })
        }
      }
      logger.error(__filename, 'create', req.custom?.request_uuid, 'Error creating expense', error)
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
      const expense = await ExpenseModel.findByUuid(uuid)
      if (!expense) {
        return createResponse1({ res, status: STATUS_CODES.NOT_FOUND, message: res.__('EXPENSE.NOT_FOUND') })
      }

      return createResponse(res, STATUS_CODES.OK, res.__('EXPENSE.DETAIL_SUCCESS'), this.sanitize(expense))
    } catch (error) {
      logger.error(__filename, 'get', req.custom?.request_uuid, 'Error fetching expense', error)
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
      const { project_uuid, user_uuid, description, amount, date, billable, status, receipt_url } = req.body

      const existing = await ExpenseModel.findByUuid(uuid)
      if (!existing) {
        return createResponse1({ res, status: STATUS_CODES.NOT_FOUND, message: res.__('EXPENSE.NOT_FOUND') })
      }

      let projectId: number | undefined
      if (project_uuid !== undefined) {
        const project = await this.ensureProject(project_uuid)
        projectId = project.id
      }

      let userId: number | null | undefined
      if (user_uuid !== undefined) {
        if (!user_uuid) {
          userId = null
        } else {
          const user = await this.ensureUser(user_uuid)
          userId = user?.id ?? null
        }
      }

      const payload: any = {}
      if (projectId !== undefined) payload.project_id = projectId
      if (userId !== undefined) payload.user_id = userId
      if (description !== undefined) payload.description = description
      if (amount !== undefined) payload.amount = Number(amount)
      if (date !== undefined) payload.date = date

      if (billable !== undefined) {
        if (typeof billable === 'boolean') payload.billable = billable
        else {
          const normalized = this.parseBoolean(billable)
          if (normalized === undefined) {
            return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'billable') })
          }
          payload.billable = normalized
        }
      }

      if (status !== undefined) {
        const normalizedStatus = this.normalizeStatus(status)
        payload.status = normalizedStatus
      }

      if (receipt_url !== undefined) {
        payload.receipt_url = receipt_url
      }

      const updated = await ExpenseModel.updateByUuid(uuid, payload)
      if (!updated) {
        return createResponse1({ res, status: STATUS_CODES.INTERNAL_SERVER_ERROR, message: res.__('SERVER_ERROR_MESSAGE') })
      }

      return createResponse(res, STATUS_CODES.OK, res.__('EXPENSE.UPDATE_SUCCESS'), this.sanitize(updated))
    } catch (error: any) {
      if (error instanceof Error) {
        if (error.message === 'INVALID_PROJECT') {
          return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'project_uuid') })
        }
        if (error.message === 'INVALID_USER') {
          return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'user_uuid') })
        }
      }
      logger.error(__filename, 'update', req.custom?.request_uuid, 'Error updating expense', error)
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
      const deleted = await ExpenseModel.deleteByUuid(uuid)
      if (!deleted) {
        return createResponse1({ res, status: STATUS_CODES.NOT_FOUND, message: res.__('EXPENSE.NOT_FOUND') })
      }

      return createResponse1({ res, status: STATUS_CODES.OK, message: res.__('EXPENSE.DELETE_SUCCESS') })
    } catch (error) {
      logger.error(__filename, 'remove', req.custom?.request_uuid, 'Error deleting expense', error)
      return createResponse1({
        res,
        status: STATUS_CODES.INTERNAL_SERVER_ERROR,
        message: res.__('SERVER_ERROR_MESSAGE')
      })
    }
  }
}

export default new ExpenseController()
