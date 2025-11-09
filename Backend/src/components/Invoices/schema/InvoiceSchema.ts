import { DataTypes, Model, Optional, Sequelize } from 'sequelize'
import sequelize from '../../../utils/dbConfig'
import ProjectSchema from '../../Projects/schema/ProjectSchema'
import SalesOrderSchema from '../../SalesOrders/schema/SalesOrderSchema'
import ContactSchema from '../../Contacts/schema/ContactSchema'
import CompanySchema from '../../Companies/schema/CompanySchema'

export type InvoiceStatus = 'draft' | 'sent' | 'approved' | 'paid' | 'declined'

interface InvoiceAttributes {
  id: number
  uuid: string
  project_id: number | null
  sales_order_id: number | null
  client_id: number | null
  date: Date
  due_date: Date | null
  status: InvoiceStatus
  items: object[]
  total_amount: number
  company_id: number | null
  created_at: Date
  updated_at: Date
}

type InvoiceCreationAttributes = Optional<
  InvoiceAttributes,
  'id' | 'uuid' | 'project_id' | 'sales_order_id' | 'client_id' | 'due_date' | 'status' | 'items' | 'total_amount' | 'created_at' | 'updated_at'
>

export class InvoiceSchema extends Model<InvoiceAttributes, InvoiceCreationAttributes> implements InvoiceAttributes {
  declare id: number
  declare uuid: string
  declare project_id: number | null
  declare sales_order_id: number | null
  declare client_id: number | null
  declare date: Date
  declare due_date: Date | null
  declare status: InvoiceStatus
  declare items: object[]
  declare total_amount: number
  declare company_id: number | null
  declare created_at: Date
  declare updated_at: Date
}

InvoiceSchema.init(
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
      onDelete: 'SET NULL'
    },
    sales_order_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'sales_orders',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
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
    due_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
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
    tableName: 'invoices',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true
  }
)

InvoiceSchema.belongsTo(ProjectSchema, { foreignKey: 'project_id', as: 'project' })
InvoiceSchema.belongsTo(SalesOrderSchema, { foreignKey: 'sales_order_id', as: 'sales_order' })
InvoiceSchema.belongsTo(ContactSchema, { foreignKey: 'client_id', as: 'client' })
InvoiceSchema.belongsTo(CompanySchema, { foreignKey: 'company_id', as: 'company' })

ProjectSchema.hasMany(InvoiceSchema, { foreignKey: 'project_id', as: 'invoices' })
SalesOrderSchema.hasMany(InvoiceSchema, { foreignKey: 'sales_order_id', as: 'invoices' })
ContactSchema.hasMany(InvoiceSchema, { foreignKey: 'client_id', as: 'invoices' })
CompanySchema.hasMany(InvoiceSchema, { foreignKey: 'company_id', as: 'invoices' })

export default InvoiceSchema
