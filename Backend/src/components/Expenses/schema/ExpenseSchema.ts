import { DataTypes, Model, Optional, Sequelize } from 'sequelize'
import sequelize from '../../../utils/dbConfig'
import ProjectSchema from '../../Projects/schema/ProjectSchema'
import AuthSchema from '../../Auth/schema/AuthSchema'
import CompanySchema from '../../Companies/schema/CompanySchema'

export type ExpenseStatus = 'draft' | 'sent' | 'approved' | 'paid' | 'declined'

interface ExpenseAttributes {
  id: number
  uuid: string
  project_id: number
  user_id: number | null
  description: string
  amount: number
  date: Date
  billable: boolean
  status: ExpenseStatus
  receipt_url: string | null
  company_id: number | null
  created_at: Date
  updated_at: Date
}

type ExpenseCreationAttributes = Optional<ExpenseAttributes, 'id' | 'uuid' | 'user_id' | 'billable' | 'status' | 'receipt_url' | 'created_at' | 'updated_at'>

export class ExpenseSchema extends Model<ExpenseAttributes, ExpenseCreationAttributes> implements ExpenseAttributes {
  declare id: number
  declare uuid: string
  declare project_id: number
  declare user_id: number | null
  declare description: string
  declare amount: number
  declare date: Date
  declare billable: boolean
  declare status: ExpenseStatus
  declare receipt_url: string | null
  declare company_id: number | null
  declare created_at: Date
  declare updated_at: Date
}

ExpenseSchema.init(
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
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_DATE')
    },
    billable: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    status: {
      type: DataTypes.ENUM('draft', 'sent', 'approved', 'paid', 'declined'),
      allowNull: false,
      defaultValue: 'draft'
    },
    receipt_url: {
      type: DataTypes.TEXT,
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
    tableName: 'expenses',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true
  }
)

ExpenseSchema.belongsTo(ProjectSchema, { foreignKey: 'project_id', as: 'project' })
ExpenseSchema.belongsTo(AuthSchema, { foreignKey: 'user_id', as: 'user' })
ExpenseSchema.belongsTo(CompanySchema, { foreignKey: 'company_id', as: 'company' })

ProjectSchema.hasMany(ExpenseSchema, { foreignKey: 'project_id', as: 'expenses' })
AuthSchema.hasMany(ExpenseSchema, { foreignKey: 'user_id', as: 'expenses' })
CompanySchema.hasMany(ExpenseSchema, { foreignKey: 'company_id', as: 'expenses' })

export default ExpenseSchema
