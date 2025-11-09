import { DataTypes, Model, Optional, Sequelize } from 'sequelize'
import sequelize from '../../../utils/dbConfig'
import ProjectSchema from '../../Projects/schema/ProjectSchema'
import TaskSchema from '../../Tasks/schema/TaskSchema'
import AuthSchema from '../../Auth/schema/AuthSchema'
import CompanySchema from '../../Companies/schema/CompanySchema'

export interface TimesheetAttributes {
  id: number
  uuid: string
  project_id: number
  task_id: number | null
  user_id: number
  date: Date
  hours: number
  description: string | null
  billable: boolean
  cost_rate: number
  company_id: number | null
  created_at: Date
}

type TimesheetCreationAttributes = Optional<TimesheetAttributes, 'id' | 'uuid' | 'task_id' | 'description' | 'billable' | 'cost_rate' | 'created_at'>

export class TimesheetSchema extends Model<TimesheetAttributes, TimesheetCreationAttributes> implements TimesheetAttributes {
  declare id: number
  declare uuid: string
  declare project_id: number
  declare task_id: number | null
  declare user_id: number
  declare date: Date
  declare hours: number
  declare description: string | null
  declare billable: boolean
  declare cost_rate: number
  declare company_id: number | null
  declare created_at: Date
}

TimesheetSchema.init(
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
    task_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'tasks',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_DATE')
    },
    hours: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    billable: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    cost_rate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
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
    }
  },
  {
    sequelize,
    tableName: 'timesheets',
    timestamps: false,
    underscored: true
  }
)

TimesheetSchema.belongsTo(ProjectSchema, { foreignKey: 'project_id', as: 'project' })
TimesheetSchema.belongsTo(TaskSchema, { foreignKey: 'task_id', as: 'task' })
TimesheetSchema.belongsTo(AuthSchema, { foreignKey: 'user_id', as: 'user' })
TimesheetSchema.belongsTo(CompanySchema, { foreignKey: 'company_id', as: 'company' })

ProjectSchema.hasMany(TimesheetSchema, { foreignKey: 'project_id', as: 'timesheets' })
TaskSchema.hasMany(TimesheetSchema, { foreignKey: 'task_id', as: 'timesheets' })
AuthSchema.hasMany(TimesheetSchema, { foreignKey: 'user_id', as: 'timesheets' })
CompanySchema.hasMany(TimesheetSchema, { foreignKey: 'company_id', as: 'timesheets' })

export default TimesheetSchema
