import bcrypt from 'bcrypt'
import { DataTypes, Model, Sequelize } from 'sequelize'
import sequelize from '../../../utils/dbConfig'

export class AuthSchema extends Model {
  declare id: number
  declare name: string
  declare email: string
  declare password_hash: string
  declare role: 'admin' | 'project_manager' | 'team_member' | 'finance'
  declare hourly_rate: number
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
      beforeCreate: async (instance) => {
        if (instance.changed('password_hash')) {
          const salt = await bcrypt.genSalt(12)
          instance.password_hash = await bcrypt.hash(instance.password_hash, salt)
        }
      },
      beforeUpdate: async (instance) => {
        if (instance.changed('password_hash')) {
          const salt = await bcrypt.genSalt(12)
          instance.password_hash = await bcrypt.hash(instance.password_hash, salt)
        }
      }
    }
  }
)

export default AuthSchema
