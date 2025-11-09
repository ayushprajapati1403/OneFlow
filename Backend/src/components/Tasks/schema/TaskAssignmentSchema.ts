import { DataTypes, Model, Optional, Sequelize } from 'sequelize'
import sequelize from '../../../utils/dbConfig'
import TaskSchema from './TaskSchema'
import AuthSchema from '../../Auth/schema/AuthSchema'

interface TaskAssignmentAttributes {
  id: number
  uuid: string
  task_id: number
  user_id: number
  assigned_at: Date
}

type TaskAssignmentCreationAttributes = Optional<TaskAssignmentAttributes, 'id' | 'uuid' | 'assigned_at'>

export class TaskAssignmentSchema extends Model<TaskAssignmentAttributes, TaskAssignmentCreationAttributes> implements TaskAssignmentAttributes {
  declare id: number
  declare uuid: string
  declare task_id: number
  declare user_id: number
  declare assigned_at: Date
}

TaskAssignmentSchema.init(
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
    task_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'tasks',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
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
    assigned_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    }
  },
  {
    sequelize,
    tableName: 'task_assignments',
    timestamps: false,
    underscored: true
  }
)

TaskAssignmentSchema.belongsTo(TaskSchema, { foreignKey: 'task_id', as: 'task' })
TaskAssignmentSchema.belongsTo(AuthSchema, { foreignKey: 'user_id', as: 'user' })

TaskSchema.hasMany(TaskAssignmentSchema, { foreignKey: 'task_id', as: 'assignments' })

export default TaskAssignmentSchema
