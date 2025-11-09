import { DataTypes, Model, Optional, Sequelize } from 'sequelize'
import sequelize from '../../../utils/dbConfig'
import ProjectSchema from '../../Projects/schema/ProjectSchema'
import ContactSchema from '../../Contacts/schema/ContactSchema'
import CompanySchema from '../../Companies/schema/CompanySchema'

export type SalesOrderStatus = 'draft' | 'sent' | 'approved' | 'paid' | 'declined'

interface SalesOrderAttributes {
  id: number
  uuid: string
  project_id: number | null
  client_id: number | null
  date: Date
  status: SalesOrderStatus
  items: object[]
  total_amount: number
  company_id: number | null
  created_at: Date
  updated_at: Date
}

type SalesOrderCreationAttributes = Optional<SalesOrderAttributes, 'id' | 'uuid' | 'project_id' | 'client_id' | 'status' | 'items' | 'total_amount' | 'created_at' | 'updated_at'>

export class SalesOrderSchema extends Model<SalesOrderAttributes, SalesOrderCreationAttributes> implements SalesOrderAttributes {
  declare id: number
  declare uuid: string
  declare project_id: number | null
  declare client_id: number | null
  declare date: Date
  declare status: SalesOrderStatus
  declare items: object[]
  declare total_amount: number
  declare company_id: number | null
  declare created_at: Date
  declare updated_at: Date
}

SalesOrderSchema.init(
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
      allowNull: true,
      references: {
        model: 'projects',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    client_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'contacts',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_DATE')
    },
    status: {
      type: DataTypes.ENUM('draft', 'sent', 'approved', 'paid', 'declined'),
      allowNull: false,
      defaultValue: 'draft'
    },
    items: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: []
    },
    total_amount: {
      type: DataTypes.DECIMAL(15, 2),
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
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    }
  },
  {
    sequelize,
    tableName: 'sales_orders',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true
  }
)

SalesOrderSchema.belongsTo(ProjectSchema, { foreignKey: 'project_id', as: 'project' })
SalesOrderSchema.belongsTo(ContactSchema, { foreignKey: 'client_id', as: 'client' })
SalesOrderSchema.belongsTo(CompanySchema, { foreignKey: 'company_id', as: 'company' })

ProjectSchema.hasMany(SalesOrderSchema, { foreignKey: 'project_id', as: 'sales_orders' })
ContactSchema.hasMany(SalesOrderSchema, { foreignKey: 'client_id', as: 'sales_orders' })
CompanySchema.hasMany(SalesOrderSchema, { foreignKey: 'company_id', as: 'sales_orders' })

export default SalesOrderSchema
