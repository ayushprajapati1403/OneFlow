import { QueryInterface, DataTypes, Sequelize } from 'sequelize'

const TARGET_TABLES = [
  'users',
  'contacts',
  'projects',
  'tasks',
  'timesheets',
  'sales_orders',
  'purchase_orders',
  'invoices',
  'vendor_bills',
  'expenses'
] as const

export = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        'companies',
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

      for (const table of TARGET_TABLES) {
        const columnName = 'company_id'
        const [columns]: any = await queryInterface.sequelize.query(
          `
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = :table
              AND column_name = :column
          `,
          {
            replacements: { table, column: columnName },
            transaction
          }
        )

        if (!columns.length) {
          await queryInterface.addColumn(
            table,
            columnName,
            {
              type: DataTypes.INTEGER,
              allowNull: true,
              references: {
                model: 'companies',
                key: 'id'
              },
              onUpdate: 'CASCADE',
              onDelete: 'CASCADE'
            },
            { transaction }
          )

          await queryInterface.addIndex(
            table,
            [columnName],
            {
              name: `${table}_company_id_idx`,
              transaction
            }
          )
        }
      }
    })
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      for (const table of TARGET_TABLES) {
        const indexName = `${table}_company_id_idx`
        try {
          await queryInterface.removeIndex(table, indexName, { transaction })
        } catch (_) {
          // ignore missing index
        }

        try {
          await queryInterface.removeColumn(table, 'company_id', { transaction })
        } catch (_) {
          // ignore if column absent
        }
      }

      await queryInterface.dropTable('companies', { transaction })
    })
  }
}


