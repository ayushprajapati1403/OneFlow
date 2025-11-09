import { DataTypes, Model, Optional, Sequelize } from 'sequelize'
import sequelize from '../../../utils/dbConfig'
import ProjectSchema from '../../Projects/schema/ProjectSchema'
import AuthSchema from '../../Auth/schema/AuthSchema'
import CompanySchema from '../../Companies/schema/CompanySchema'

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'

interface TaskAttributes {
  id: number
  uuid: string
  project_id: number
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  assignee_id: number | null
  due_date: Date | null
  company_id: number | null
  created_at: Date
  updated_at: Date
}

type TaskCreationAttributes = Optional<TaskAttributes, 'id' | 'uuid' | 'description' | 'status' | 'priority' | 'assignee_id' | 'due_date' | 'created_at' | 'updated_at'>

export class TaskSchema extends Model<TaskAttributes, TaskCreationAttributes> implements TaskAttributes {
  declare id: number
  declare uuid: string
  declare project_id: number
  declare title: string
  declare description: string | null
  declare status: TaskStatus
  declare priority: TaskPriority
  declare assignee_id: number | null
  declare due_date: Date | null
  declare company_id: number | null
  declare created_at: Date
  declare updated_at: Date
  declare project?: ProjectSchema
  declare assignee?: AuthSchema | null
}

TaskSchema.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    uuid: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: Sequelize.literal('gen_random_uuid()')
    },
    project_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'projects',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('todo', 'in_progress', 'review', 'done'),
      allowNull: false,
      defaultValue: 'todo'
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high'),
      allowNull: false,
      defaultValue: 'medium'
    },
    assignee_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    due_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'companies',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    }
  },
  {
    sequelize,
    tableName: 'tasks',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true
  }
)

TaskSchema.belongsTo(ProjectSchema, { foreignKey: 'project_id', as: 'project' })
TaskSchema.belongsTo(AuthSchema, { foreignKey: 'assignee_id', as: 'assignee' })
TaskSchema.belongsTo(CompanySchema, { foreignKey: 'company_id', as: 'company' })

ProjectSchema.hasMany(TaskSchema, { foreignKey: 'project_id', as: 'tasks' })
AuthSchema.hasMany(TaskSchema, { foreignKey: 'assignee_id', as: 'assigned_tasks' })
CompanySchema.hasMany(TaskSchema, { foreignKey: 'company_id', as: 'tasks' })

export default TaskSchema
