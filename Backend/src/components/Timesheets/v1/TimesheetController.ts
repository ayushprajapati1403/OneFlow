import STATUS_CODES from 'http-status-codes'
import { CustomRequest, CustomResponse } from '../../../environment'
import { createResponse, createResponse1 } from '../../../utils/helper'
import { logger } from '../../../utils/logger'
import TimesheetModel from '../model/TimesheetModel'
import ProjectModel from '../../Projects/model/ProjectModel'
import TaskModel from '../../Tasks/model/TaskModel'
import authModel from '../../Auth/model/AuthModel'
import { TIMESHEET_DEFAULT_LIMIT } from '../../../utils/constants'
import TimesheetSchema from '../schema/TimesheetSchema'
import ProjectSchema from '../../Projects/schema/ProjectSchema'
import TaskSchema from '../../Tasks/schema/TaskSchema'
import { AuthSchema } from '../../Auth/schema/AuthSchema'

type SanitizedTimesheet = {
  uuid: string
  project: {
    uuid: string
    name: string
  }
  task: {
    uuid: string
    title: string
  } | null
  user: {
    uuid: string
    name: string
    email: string
    hourly_rate: number
  }
  date: string
  hours: number
  description: string | null
  billable: boolean
  cost_rate: number
  cost_total: number
  created_at: Date
}

class TimesheetController {
  private formatDate(value: Date | string): string {
    if (value instanceof Date) {
      return value.toISOString().slice(0, 10)
    }
    return value
  }

  private sanitize(timesheet: TimesheetSchema): SanitizedTimesheet {
    const plain = timesheet.get({
      plain: true
    }) as TimesheetSchema & {
      project?: ProjectSchema
      task?: TaskSchema | null
      user?: AuthSchema
    }

    const project = plain.project
      ? {
          uuid: plain.project.uuid,
          name: plain.project.name
        }
      : { uuid: '', name: '' }

    const task = plain.task
      ? {
          uuid: plain.task.uuid,
          title: plain.task.title
        }
      : null

    const user = plain.user
      ? {
          uuid: plain.user.uuid,
          name: plain.user.name,
          email: plain.user.email,
          hourly_rate: Number(plain.user.hourly_rate ?? 0)
        }
      : { uuid: '', name: '', email: '', hourly_rate: 0 }

    const hours = Number(plain.hours)
    const costRate = Number(plain.cost_rate)

    return {
      uuid: plain.uuid,
      project,
      task,
      user,
      date: this.formatDate(plain.date),
      hours,
      description: plain.description,
      billable: plain.billable,
      cost_rate: costRate,
      cost_total: Number((hours * costRate).toFixed(2)),
      created_at: plain.created_at
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

  private async ensureProject(uuid: string | undefined, companyId: number) {
    if (!uuid) {
      throw new Error('INVALID_PROJECT')
    }
    const project = await ProjectModel.findByUuid(uuid, companyId)
    if (!project) {
      throw new Error('INVALID_PROJECT')
    }
    return project
  }

  private async ensureTask(uuid: string | undefined, companyId: number, projectId?: number) {
    if (!uuid) return null
    const task = await TaskModel.findByUuid(uuid, companyId)
    if (!task) {
      throw new Error('INVALID_TASK')
    }
    if (projectId && task.project_id && task.project_id !== projectId) {
      throw new Error('TASK_NOT_IN_PROJECT')
    }
    return task
  }

  private async ensureUser(uuid: string | undefined, companyId: number) {
    if (!uuid) {
      throw new Error('INVALID_USER')
    }
    const user = await authModel.findByUuid(uuid, companyId)
    if (!user) {
      throw new Error('INVALID_USER')
    }
    return user
  }

  async list(req: CustomRequest, res: CustomResponse) {
    try {
      const companyId = req.user?.company_id
      if (!companyId) {
        return createResponse1({ res, status: STATUS_CODES.FORBIDDEN, message: 'Company context is required.' })
      }

      const page = Math.max(Number(req.query.page ?? 1), 1)
      const limit = Math.max(Number(req.query.limit ?? TIMESHEET_DEFAULT_LIMIT), 1)
      const offset = (page - 1) * limit

      const billable = this.parseBoolean(req.query.billable)

      let projectId: number | undefined
      if (req.query.project_uuid) {
        const project = await this.ensureProject(String(req.query.project_uuid), companyId)
        projectId = project.id
      }

      let taskId: number | undefined
      if (req.query.task_uuid) {
        const task = await this.ensureTask(String(req.query.task_uuid), companyId)
        taskId = task?.id
      }

      let userId: number | undefined
      if (req.query.user_uuid) {
        const user = await this.ensureUser(String(req.query.user_uuid), companyId)
        userId = user.id
      }

      const { rows, count } = await TimesheetModel.listTimesheets({
        projectId,
        taskId,
        userId,
        billable,
        dateFrom: req.query.date_from as string,
        dateTo: req.query.date_to as string,
        search: req.query.search as string,
        limit,
        offset,
        companyId
      })

      return createResponse(res, STATUS_CODES.OK, res.__('TIMESHEET.LIST_SUCCESS'), {
        timesheets: rows.map((row) => this.sanitize(row)),
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
          case 'INVALID_TASK':
            return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'task_uuid') })
          case 'INVALID_USER':
            return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'user_uuid') })
        }
      }
      logger.error(__filename, 'list', req.custom?.request_uuid, 'Error listing timesheets', error)
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

      const { project_uuid, task_uuid, user_uuid, date, hours, description, billable, cost_rate } = req.body

      const project = await this.ensureProject(project_uuid, companyId)
      const task = await this.ensureTask(task_uuid, companyId, project.id)
      const user = await this.ensureUser(user_uuid, companyId)

      const numericHours = Number(hours)
      const numericCost = cost_rate !== undefined && cost_rate !== null ? Number(cost_rate) : Number(user.hourly_rate ?? 0)
      const isBillable = typeof billable === 'boolean' ? billable : (this.parseBoolean(billable) ?? true)

      const timesheet = await TimesheetModel.createTimesheet({
        project_id: project.id,
        task_id: task?.id ?? null,
        user_id: user.id,
        date,
        hours: numericHours,
        description,
        billable: isBillable,
        cost_rate: numericCost,
        company_id: companyId
      })

      const hydrated = await TimesheetModel.findByUuid(timesheet.uuid, companyId)
      if (!hydrated) {
        throw new Error('CREATION_FAILED')
      }

      return createResponse(res, STATUS_CODES.CREATED, res.__('TIMESHEET.CREATE_SUCCESS'), this.sanitize(hydrated))
    } catch (error: any) {
      if (error instanceof Error) {
        switch (error.message) {
          case 'INVALID_PROJECT':
            return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'project_uuid') })
          case 'INVALID_TASK':
            return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'task_uuid') })
          case 'TASK_NOT_IN_PROJECT':
            return createResponse1({
              res,
              status: STATUS_CODES.UNPROCESSABLE_ENTITY,
              message: res.__('VALIDATIONS.invalid', 'task_uuid')
            })
          case 'INVALID_USER':
            return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'user_uuid') })
        }
      }
      logger.error(__filename, 'create', req.custom?.request_uuid, 'Error creating timesheet', error)
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

      const timesheet = await TimesheetModel.findByUuid(uuid, companyId)
      if (!timesheet) {
        return createResponse1({ res, status: STATUS_CODES.NOT_FOUND, message: res.__('TIMESHEET.NOT_FOUND') })
      }

      return createResponse(res, STATUS_CODES.OK, res.__('TIMESHEET.DETAIL_SUCCESS'), this.sanitize(timesheet))
    } catch (error) {
      logger.error(__filename, 'get', req.custom?.request_uuid, 'Error fetching timesheet', error)
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
      const { task_uuid, date, hours, description, billable, cost_rate } = req.body

      const companyId = req.user?.company_id
      if (!companyId) {
        return createResponse1({ res, status: STATUS_CODES.FORBIDDEN, message: 'Company context is required.' })
      }

      const existing = await TimesheetModel.findByUuid(uuid, companyId)
      if (!existing) {
        return createResponse1({ res, status: STATUS_CODES.NOT_FOUND, message: res.__('TIMESHEET.NOT_FOUND') })
      }

      let taskId: number | null | undefined
      if (task_uuid !== undefined) {
        if (!task_uuid) {
          taskId = null
        } else {
          const task = await this.ensureTask(task_uuid, companyId, existing.project_id)
          taskId = task?.id ?? null
        }
      }

      const payload: any = {}
      if (taskId !== undefined) payload.task_id = taskId
      if (date !== undefined) payload.date = date
      if (hours !== undefined) payload.hours = Number(hours)
      if (description !== undefined) payload.description = description

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

      if (cost_rate !== undefined) {
        payload.cost_rate = Number(cost_rate)
      }

      const updated = await TimesheetModel.updateByUuid(uuid, payload, companyId)
      if (!updated) {
        return createResponse1({ res, status: STATUS_CODES.INTERNAL_SERVER_ERROR, message: res.__('SERVER_ERROR_MESSAGE') })
      }

      return createResponse(res, STATUS_CODES.OK, res.__('TIMESHEET.UPDATE_SUCCESS'), this.sanitize(updated))
    } catch (error: any) {
      if (error instanceof Error) {
        switch (error.message) {
          case 'INVALID_TASK':
          case 'TASK_NOT_IN_PROJECT':
            return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'task_uuid') })
        }
      }
      logger.error(__filename, 'update', req.custom?.request_uuid, 'Error updating timesheet', error)
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

      const deleted = await TimesheetModel.deleteByUuid(uuid, companyId)
      if (!deleted) {
        return createResponse1({ res, status: STATUS_CODES.NOT_FOUND, message: res.__('TIMESHEET.NOT_FOUND') })
      }

      return createResponse1({ res, status: STATUS_CODES.OK, message: res.__('TIMESHEET.DELETE_SUCCESS') })
    } catch (error) {
      logger.error(__filename, 'remove', req.custom?.request_uuid, 'Error deleting timesheet', error)
      return createResponse1({
        res,
        status: STATUS_CODES.INTERNAL_SERVER_ERROR,
        message: res.__('SERVER_ERROR_MESSAGE')
      })
    }
  }
}

export default new TimesheetController()
