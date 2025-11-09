import bcrypt from 'bcrypt'
import { DataTypes, Model, Sequelize } from 'sequelize'
import sequelize from '../../../utils/dbConfig'
import CompanySchema from '../../Companies/schema/CompanySchema'

export class AuthSchema extends Model {
  declare id: number
  declare uuid: string
  declare name: string
  declare email: string
  declare password_hash: string
  declare role: 'admin' | 'project_manager' | 'team_member' | 'finance'
  declare hourly_rate: number
  declare company_id: number | null
  declare created_at: Date
  declare updated_at: Date

  async comparePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password_hash)
  }
}

AuthSchema.init(
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
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true
    },
    password_hash: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('admin', 'project_manager', 'team_member', 'finance'),
      allowNull: false,
      defaultValue: 'team_member'
    },
    hourly_rate: {
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
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    }
  },
  {
    sequelize,
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    hooks: {
      beforeSave: async (instance) => {
        const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12)
        const password = instance.password_hash
        const needsHash = instance.changed('password_hash') && typeof password === 'string' && !password.startsWith('$2')

        if (needsHash) {
          instance.password_hash = await bcrypt.hash(password, saltRounds)
        }
      }
    }
  }
)

AuthSchema.belongsTo(CompanySchema, { foreignKey: 'company_id', as: 'company' })
CompanySchema.hasMany(AuthSchema, { foreignKey: 'company_id', as: 'users' })

export default AuthSchema
