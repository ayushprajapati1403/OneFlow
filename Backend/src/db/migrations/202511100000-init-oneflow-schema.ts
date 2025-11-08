import { QueryInterface, DataTypes, Sequelize } from 'sequelize'

const ENUM_TYPES = [
  'enum_users_role',
  'enum_contacts_type',
  'enum_projects_status',
  'enum_tasks_status',
  'enum_tasks_priority',
  'enum_sales_orders_status',
  'enum_invoices_status',
  'enum_purchase_orders_status',
  'enum_vendor_bills_status',
  'enum_expenses_status'
]

export = {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        'users',
        {
          id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
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
            defaultValue: 'team_member',
            allowNull: false
          },
          hourly_rate: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0
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
        'contacts',
        {
          id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
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
        'projects',
        {
          id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },
          name: {
            type: DataTypes.STRING(255),
            allowNull: false
          },
          description: {
            type: DataTypes.TEXT
          },
          client_id: {
            type: DataTypes.INTEGER,
            references: {
              model: 'contacts',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          },
          manager_id: {
            type: DataTypes.INTEGER,
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
            type: DataTypes.DATEONLY
          },
          end_date: {
            type: DataTypes.DATEONLY
          },
          budget: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0
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
        'tasks',
        {
          id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
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
          title: {
            type: DataTypes.STRING(255),
            allowNull: false
          },
          description: {
            type: DataTypes.TEXT
          },
          status: {
            type: DataTypes.ENUM('todo', 'in_progress', 'review', 'done'),
            allowNull: false,
            defaultValue: 'todo'
          },
          priority: {
            type: DataTypes.ENUM('low', 'medium', 'high'),
            allowNull: false,
            defaultValue: 'medium'
          },
          assignee_id: {
            type: DataTypes.INTEGER,
            references: {
              model: 'users',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          },
          due_date: {
            type: DataTypes.DATE
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
        'timesheets',
        {
          id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
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
          task_id: {
            type: DataTypes.INTEGER,
            references: {
              model: 'tasks',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          },
          user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
              model: 'users',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
          },
          date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_DATE')
          },
          hours: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: false
          },
          description: {
            type: DataTypes.TEXT
          },
          billable: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
          },
          cost_rate: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
          },
          created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
          }
        },
        { transaction }
      )

      await queryInterface.createTable(
        'sales_orders',
        {
          id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },
          project_id: {
            type: DataTypes.INTEGER,
            references: {
              model: 'projects',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
          },
          client_id: {
            type: DataTypes.INTEGER,
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
        'invoices',
        {
          id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },
          project_id: {
            type: DataTypes.INTEGER,
            references: {
              model: 'projects',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          },
          sales_order_id: {
            type: DataTypes.INTEGER,
            references: {
              model: 'sales_orders',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          },
          client_id: {
            type: DataTypes.INTEGER,
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
            type: DataTypes.DATEONLY
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
        'purchase_orders',
        {
          id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },
          project_id: {
            type: DataTypes.INTEGER,
            references: {
              model: 'projects',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          },
          vendor_id: {
            type: DataTypes.INTEGER,
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
        'vendor_bills',
        {
          id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },
          project_id: {
            type: DataTypes.INTEGER,
            references: {
              model: 'projects',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          },
          purchase_order_id: {
            type: DataTypes.INTEGER,
            references: {
              model: 'purchase_orders',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          },
          vendor_id: {
            type: DataTypes.INTEGER,
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
            type: DataTypes.DATEONLY
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
        'expenses',
        {
          id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },
          project_id: {
            type: DataTypes.INTEGER,
            references: {
              model: 'projects',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
          },
          user_id: {
            type: DataTypes.INTEGER,
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
            type: DataTypes.TEXT
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
    })
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const { sequelize } = queryInterface

      await queryInterface.dropTable('expenses', { transaction })
      await queryInterface.dropTable('vendor_bills', { transaction })
      await queryInterface.dropTable('purchase_orders', { transaction })
      await queryInterface.dropTable('invoices', { transaction })
      await queryInterface.dropTable('sales_orders', { transaction })
      await queryInterface.dropTable('timesheets', { transaction })
      await queryInterface.dropTable('tasks', { transaction })
      await queryInterface.dropTable('projects', { transaction })
      await queryInterface.dropTable('contacts', { transaction })
      await queryInterface.dropTable('users', { transaction })

      for (const typeName of ENUM_TYPES) {
        await sequelize.query(`DROP TYPE IF EXISTS "${typeName}"`, { transaction })
      }
    })
  }
}


