import { DataTypes, Model, Optional, Sequelize } from 'sequelize'
import sequelize from '../../../utils/dbConfig'
import ContactSchema from '../../Contacts/schema/ContactSchema'
import AuthSchema from '../../Auth/schema/AuthSchema'
import CompanySchema from '../../Companies/schema/CompanySchema'

export type ProjectStatus = 'planned' | 'active' | 'on_hold' | 'completed'

interface ProjectAttributes {
  id: number
  uuid: string
  name: string
  description: string | null
  client_id: number | null
  manager_id: number | null
  status: ProjectStatus
  start_date: Date | null
  end_date: Date | null
  budget: number
  company_id: number | null
  created_at: Date
  updated_at: Date
}

type ProjectCreationAttributes = Optional<
  ProjectAttributes,
  'id' | 'uuid' | 'description' | 'client_id' | 'manager_id' | 'status' | 'start_date' | 'end_date' | 'budget' | 'created_at' | 'updated_at'
>

export class ProjectSchema extends Model<ProjectAttributes, ProjectCreationAttributes> implements ProjectAttributes {
  declare id: number
  declare uuid: string
  declare name: string
  declare description: string | null
  declare client_id: number | null
  declare manager_id: number | null
  declare status: ProjectStatus
  declare start_date: Date | null
  declare end_date: Date | null
  declare budget: number
  declare company_id: number | null
  declare created_at: Date
  declare updated_at: Date
}

ProjectSchema.init(
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
    description: {
      type: DataTypes.TEXT,
      allowNull: true
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
    manager_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    status: {
      type: DataTypes.ENUM('planned', 'active', 'on_hold', 'completed'),
      allowNull: false,
      defaultValue: 'planned'
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    budget: {
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
    tableName: 'projects',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true
  }
)

export default ProjectSchema

ProjectSchema.belongsTo(ContactSchema, { foreignKey: 'client_id', as: 'client' })
ProjectSchema.belongsTo(AuthSchema, { foreignKey: 'manager_id', as: 'manager' })
ProjectSchema.belongsTo(CompanySchema, { foreignKey: 'company_id', as: 'company' })

ContactSchema.hasMany(ProjectSchema, { foreignKey: 'client_id', as: 'projects' })
AuthSchema.hasMany(ProjectSchema, { foreignKey: 'manager_id', as: 'managed_projects' })
CompanySchema.hasMany(ProjectSchema, { foreignKey: 'company_id', as: 'projects' })
