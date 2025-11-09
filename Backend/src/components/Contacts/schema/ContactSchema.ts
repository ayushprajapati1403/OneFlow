import { DataTypes, Model, Sequelize } from 'sequelize'
import sequelize from '../../../utils/dbConfig'
import CompanySchema from '../../Companies/schema/CompanySchema'

export type ContactType = 'client' | 'vendor' | 'both'

export class ContactSchema extends Model {
  declare id: number
  declare uuid: string
  declare name: string
  declare type: ContactType
  declare email: string | null
  declare phone: string | null
  declare address: string | null
  declare company_id: number | null
  declare created_at: Date
  declare updated_at: Date
}

ContactSchema.init(
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
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('client', 'vendor', 'both'),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    address: {
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
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    }
  },
  {
    sequelize,
    tableName: 'contacts',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true
  }
)

ContactSchema.belongsTo(CompanySchema, { foreignKey: 'company_id', as: 'company' })
CompanySchema.hasMany(ContactSchema, { foreignKey: 'company_id', as: 'contacts' })

export default ContactSchema
