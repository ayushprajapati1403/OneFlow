import { FindOptions, Op, Transaction, WhereOptions } from 'sequelize'
import sequelize from '../../../utils/dbConfig'
import { TaskAssignmentSchema, TaskSchema, TaskStatus, TaskPriority } from '../schema'
import ProjectSchema from '../../Projects/schema/ProjectSchema'
import AuthSchema from '../../Auth/schema/AuthSchema'

export interface TaskListOptions {
  search?: string
  status?: TaskStatus | TaskStatus[]
  priority?: TaskPriority | TaskPriority[]
  projectId?: number
  assigneeId?: number
  includeAssignments?: boolean
  limit?: number
  offset?: number
  attributes?: FindOptions['attributes']
  companyId?: number
}

type TaskCreationPayload = {
  project_id: number
  title: string
  description?: string | null
  status?: TaskStatus
  priority?: TaskPriority
  assignee_id?: number | null
  due_date?: Date | string | null
  company_id: number
}

type TaskUpdatePayload = Partial<TaskCreationPayload>

class TaskModel {
  async createTask(payload: TaskCreationPayload, assignmentUserIds: number[] = []): Promise<TaskSchema> {
    return sequelize.transaction(async (transaction) => {
      const task = await TaskSchema.create(payload as any, { transaction })
      if (assignmentUserIds.length > 0) {
        await this.replaceAssignments(task.id, assignmentUserIds, transaction)
      }
      return task
    })
  }

  async replaceAssignments(taskId: number, userIds: number[], transaction?: Transaction) {
    const trx = transaction ?? (await sequelize.transaction())
    const shouldCommit = !transaction

    try {
      await TaskAssignmentSchema.destroy({ where: { task_id: taskId }, transaction: trx })
      if (userIds.length > 0) {
        const uniqueIds = Array.from(new Set(userIds))
        await TaskAssignmentSchema.bulkCreate(
          uniqueIds.map((user_id) => ({
            task_id: taskId,
            user_id
          })),
          { transaction: trx }
        )
      }
      if (shouldCommit) {
        await trx.commit()
      }
    } catch (error) {
      if (shouldCommit) {
        await trx.rollback()
      }
      throw error
    }
  }

  async findByUuid(uuid: string, companyId?: number): Promise<TaskSchema | null> {
    return TaskSchema.findOne({
      where: {
        uuid,
        ...(companyId ? { company_id: companyId } : {})
      },
      include: [
        {
          model: ProjectSchema,
          as: 'project',
          attributes: ['id', 'uuid', 'name', 'status']
        },
        {
          model: AuthSchema,
          as: 'assignee',
          attributes: ['uuid', 'name', 'email']
        },
        {
          model: TaskAssignmentSchema,
          as: 'assignments',
          include: [
            {
              model: AuthSchema,
              as: 'user',
              attributes: ['uuid', 'name', 'email']
            }
          ]
        }
      ]
    })
  }

  async findById(id: number, companyId?: number): Promise<TaskSchema | null> {
    return TaskSchema.findOne({
      where: {
        id,
        ...(companyId ? { company_id: companyId } : {})
      },
      include: [
        {
          model: ProjectSchema,
          as: 'project',
          attributes: ['id', 'uuid', 'name', 'status']
        },
        {
          model: AuthSchema,
          as: 'assignee',
          attributes: ['uuid', 'name', 'email']
        },
        {
          model: TaskAssignmentSchema,
          as: 'assignments',
          include: [
            {
              model: AuthSchema,
              as: 'user',
              attributes: ['uuid', 'name', 'email']
            }
          ]
        }
      ]
    })
  }

  async listTasks(options: TaskListOptions = {}): Promise<{ rows: TaskSchema[]; count: number }> {
    const where: WhereOptions = {}

    if (options.companyId) {
      Object.assign(where, { company_id: options.companyId })
    }

    if (options.search?.trim()) {
      const term = `%${options.search.trim()}%`
      Object.assign(where, {
        [Op.or]: [{ title: { [Op.iLike]: term } }, { description: { [Op.iLike]: term } }]
      })
    }

    if (options.status) {
      const statuses = Array.isArray(options.status) ? options.status : [options.status]
      Object.assign(where, { status: { [Op.in]: statuses } })
    }

    if (options.priority) {
      const priorities = Array.isArray(options.priority) ? options.priority : [options.priority]
      Object.assign(where, { priority: { [Op.in]: priorities } })
    }

    if (options.projectId) {
      Object.assign(where, { project_id: options.projectId })
    }

    if (options.assigneeId) {
      Object.assign(where, { assignee_id: options.assigneeId })
    }

    return TaskSchema.findAndCountAll({
      where,
      attributes: options.attributes,
      limit: options.limit,
      offset: options.offset,
      order: [
        ['due_date', 'ASC'],
        ['created_at', 'DESC']
      ],
      include: [
        {
          model: ProjectSchema,
          as: 'project',
          attributes: ['id', 'uuid', 'name', 'status']
        },
        {
          model: AuthSchema,
          as: 'assignee',
          attributes: ['uuid', 'name', 'email']
        },
        ...(options.includeAssignments
          ? [
              {
                model: TaskAssignmentSchema,
                as: 'assignments',
                include: [
                  {
                    model: AuthSchema,
                    as: 'user',
                    attributes: ['uuid', 'name', 'email']
                  }
                ]
              }
            ]
          : [])
      ]
    })
  }

  async updateByUuid(uuid: string, payload: TaskUpdatePayload, assignmentUserIds?: number[], companyId?: number): Promise<TaskSchema | null> {
    return sequelize.transaction(async (transaction) => {
      const [updatedCount, rows] = await TaskSchema.update(payload as any, {
        where: {
          uuid,
          ...(companyId ? { company_id: companyId } : {})
        },
        returning: true,
        individualHooks: true,
        transaction
      })

      if (!updatedCount || !rows[0]) {
        return null
      }

      const task = rows[0]
      if (assignmentUserIds) {
        await this.replaceAssignments(task.id, assignmentUserIds, transaction)
      }

      await task.reload({
        transaction,
        include: [
          { model: ProjectSchema, as: 'project', attributes: ['uuid', 'name', 'status'] },
          { model: AuthSchema, as: 'assignee', attributes: ['uuid', 'name', 'email'] },
          {
            model: TaskAssignmentSchema,
            as: 'assignments',
            include: [{ model: AuthSchema, as: 'user', attributes: ['uuid', 'name', 'email'] }]
          }
        ]
      })

      return task
    })
  }

  async deleteByUuid(uuid: string, companyId?: number): Promise<number> {
    return TaskSchema.destroy({
      where: {
        uuid,
        ...(companyId ? { company_id: companyId } : {})
      }
    })
  }
}

export default new TaskModel()
