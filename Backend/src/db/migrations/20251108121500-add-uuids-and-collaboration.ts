import { QueryInterface, DataTypes, Sequelize } from 'sequelize'

const TABLES_WITH_UUID = ['users', 'contacts', 'projects', 'tasks', 'timesheets', 'sales_orders', 'invoices', 'purchase_orders', 'vendor_bills', 'expenses'] as const

const NEW_ENUM_TYPES = ['enum_project_members_role']

export = {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";', { transaction })

      for (const table of TABLES_WITH_UUID) {
        const tableDescription = await queryInterface.describeTable(table)
        if (!tableDescription.uuid) {
          await queryInterface.addColumn(
            table,
            'uuid',
            {
              type: DataTypes.UUID,
              allowNull: false,
              defaultValue: Sequelize.literal('gen_random_uuid()'),
              unique: true
            },
            { transaction }
          )
        }
      }

      await queryInterface.createTable(
        'project_members',
        {
          id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
          },
          uuid: {
            type: DataTypes.UUID,
            allowNull: false,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            unique: true
          },
          project_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
              model: 'projects',
              key: 'id'
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
          },
          user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
              model: 'users',
              key: 'id'
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
          },
          role: {
            type: DataTypes.ENUM('admin', 'project_manager', 'team_member', 'finance'),
            allowNull: false,
            defaultValue: 'team_member'
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
        { transaction }
      )

      await queryInterface.createTable(
        'task_assignments',
        {
          id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
          },
          uuid: {
            type: DataTypes.UUID,
            allowNull: false,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            unique: true
          },
          task_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
              model: 'tasks',
              key: 'id'
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
          },
          user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
              model: 'users',
              key: 'id'
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
          },
          assigned_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
          }
        },
        { transaction }
      )

      await queryInterface.addConstraint('task_assignments', {
        type: 'unique',
        fields: ['task_id', 'user_id'],
        name: 'task_assignments_task_user_unique',
        transaction
      })

      await queryInterface.createTable(
        'project_financial_stats',
        {
          id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
          },
          uuid: {
            type: DataTypes.UUID,
            allowNull: false,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            unique: true
          },
          project_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
              model: 'projects',
              key: 'id'
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
          },
          total_revenue: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0
          },
          labor_cost: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0
          },
          vendor_cost: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0
          },
          profit: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0
          },
          updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
          }
        },
        { transaction }
      )

      await queryInterface.addConstraint('project_members', {
        type: 'unique',
        fields: ['project_id', 'user_id'],
        name: 'project_members_project_user_unique',
        transaction
      })

      await queryInterface.addConstraint('project_financial_stats', {
        type: 'unique',
        fields: ['project_id'],
        name: 'project_financial_stats_project_unique',
        transaction
      })

      await queryInterface.addIndex('project_members', ['project_id'], { name: 'project_members_project_idx', transaction })
      await queryInterface.addIndex('project_members', ['user_id'], { name: 'project_members_user_idx', transaction })
      await queryInterface.addIndex('task_assignments', ['task_id'], { name: 'task_assignments_task_idx', transaction })
      await queryInterface.addIndex('task_assignments', ['user_id'], { name: 'task_assignments_user_idx', transaction })
      await queryInterface.addIndex('project_financial_stats', ['project_id'], { name: 'project_financial_stats_project_idx', transaction })
    })
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex('project_financial_stats', 'project_financial_stats_project_idx', { transaction })
      await queryInterface.removeIndex('task_assignments', 'task_assignments_user_idx', { transaction })
      await queryInterface.removeIndex('task_assignments', 'task_assignments_task_idx', { transaction })
      await queryInterface.removeIndex('project_members', 'project_members_user_idx', { transaction })
      await queryInterface.removeIndex('project_members', 'project_members_project_idx', { transaction })

      await queryInterface.removeConstraint('project_financial_stats', 'project_financial_stats_project_unique', { transaction })
      await queryInterface.removeConstraint('project_members', 'project_members_project_user_unique', { transaction })
      await queryInterface.removeConstraint('task_assignments', 'task_assignments_task_user_unique', { transaction })

      await queryInterface.dropTable('project_financial_stats', { transaction })
      await queryInterface.dropTable('task_assignments', { transaction })
      await queryInterface.dropTable('project_members', { transaction })

      for (const table of TABLES_WITH_UUID) {
        const tableDescription = await queryInterface.describeTable(table)
        if (tableDescription.uuid) {
          await queryInterface.removeColumn(table, 'uuid', { transaction })
        }
      }

      const { sequelize } = queryInterface
      for (const enumName of NEW_ENUM_TYPES) {
        await sequelize.query(`DROP TYPE IF EXISTS "${enumName}"`, { transaction })
      }
    })
  }
}
