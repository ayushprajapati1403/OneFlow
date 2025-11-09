import { DataTypes, Model, Optional, Sequelize } from 'sequelize'
import sequelize from '../../../utils/dbConfig'
import ProjectSchema from '../../Projects/schema/ProjectSchema'
import ContactSchema from '../../Contacts/schema/ContactSchema'
import CompanySchema from '../../Companies/schema/CompanySchema'

export type PurchaseOrderStatus = 'draft' | 'sent' | 'approved' | 'paid' | 'declined'

interface PurchaseOrderAttributes {
  id: number
  uuid: string
  project_id: number | null
  vendor_id: number | null
  date: Date
  status: PurchaseOrderStatus
  items: object[]
  total_amount: number
  company_id: number | null
  created_at: Date
  updated_at: Date
}

type PurchaseOrderCreationAttributes = Optional<
  PurchaseOrderAttributes,
  'id' | 'uuid' | 'project_id' | 'vendor_id' | 'status' | 'items' | 'total_amount' | 'created_at' | 'updated_at'
>

export class PurchaseOrderSchema extends Model<PurchaseOrderAttributes, PurchaseOrderCreationAttributes> implements PurchaseOrderAttributes {
  declare id: number
  declare uuid: string
  declare project_id: number | null
  declare vendor_id: number | null
  declare date: Date
  declare status: PurchaseOrderStatus
  declare items: object[]
  declare total_amount: number
  declare company_id: number | null
  declare created_at: Date
  declare updated_at: Date
}

PurchaseOrderSchema.init(
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
    vendor_id: {
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
    tableName: 'purchase_orders',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true
  }
)

PurchaseOrderSchema.belongsTo(ProjectSchema, { foreignKey: 'project_id', as: 'project' })
PurchaseOrderSchema.belongsTo(ContactSchema, { foreignKey: 'vendor_id', as: 'vendor' })
PurchaseOrderSchema.belongsTo(CompanySchema, { foreignKey: 'company_id', as: 'company' })

ProjectSchema.hasMany(PurchaseOrderSchema, { foreignKey: 'project_id', as: 'purchase_orders' })
ContactSchema.hasMany(PurchaseOrderSchema, { foreignKey: 'vendor_id', as: 'purchase_orders' })
CompanySchema.hasMany(PurchaseOrderSchema, { foreignKey: 'company_id', as: 'purchase_orders' })

export default PurchaseOrderSchema
