import { DataTypes, Model, Optional, Sequelize } from 'sequelize'
import sequelize from '../../../utils/dbConfig'
import ProjectSchema from '../../Projects/schema/ProjectSchema'
import PurchaseOrderSchema from '../../PurchaseOrders/schema/PurchaseOrderSchema'
import ContactSchema from '../../Contacts/schema/ContactSchema'
import CompanySchema from '../../Companies/schema/CompanySchema'

export type VendorBillStatus = 'draft' | 'sent' | 'approved' | 'paid' | 'declined'

interface VendorBillAttributes {
  id: number
  uuid: string
  project_id: number | null
  purchase_order_id: number | null
  vendor_id: number | null
  date: Date
  due_date: Date | null
  status: VendorBillStatus
  items: object[]
  total_amount: number
  company_id: number | null
  created_at: Date
  updated_at: Date
}

type VendorBillCreationAttributes = Optional<
  VendorBillAttributes,
  'id' | 'uuid' | 'project_id' | 'purchase_order_id' | 'vendor_id' | 'due_date' | 'status' | 'items' | 'total_amount' | 'created_at' | 'updated_at'
>

export class VendorBillSchema extends Model<VendorBillAttributes, VendorBillCreationAttributes> implements VendorBillAttributes {
  declare id: number
  declare uuid: string
  declare project_id: number | null
  declare purchase_order_id: number | null
  declare vendor_id: number | null
  declare date: Date
  declare due_date: Date | null
  declare status: VendorBillStatus
  declare items: object[]
  declare total_amount: number
  declare company_id: number | null
  declare created_at: Date
  declare updated_at: Date
}

VendorBillSchema.init(
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
    purchase_order_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'purchase_orders',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
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
    tableName: 'vendor_bills',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true
  }
)

VendorBillSchema.belongsTo(ProjectSchema, { foreignKey: 'project_id', as: 'project' })
VendorBillSchema.belongsTo(PurchaseOrderSchema, { foreignKey: 'purchase_order_id', as: 'purchase_order' })
VendorBillSchema.belongsTo(ContactSchema, { foreignKey: 'vendor_id', as: 'vendor' })
VendorBillSchema.belongsTo(CompanySchema, { foreignKey: 'company_id', as: 'company' })

ProjectSchema.hasMany(VendorBillSchema, { foreignKey: 'project_id', as: 'vendor_bills' })
PurchaseOrderSchema.hasMany(VendorBillSchema, { foreignKey: 'purchase_order_id', as: 'vendor_bills' })
ContactSchema.hasMany(VendorBillSchema, { foreignKey: 'vendor_id', as: 'vendor_bills' })
CompanySchema.hasMany(VendorBillSchema, { foreignKey: 'company_id', as: 'vendor_bills' })

export default VendorBillSchema
