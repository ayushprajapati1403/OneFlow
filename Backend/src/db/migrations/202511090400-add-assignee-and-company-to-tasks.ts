import { DataTypes, QueryInterface } from 'sequelize'

export = {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const tableDescription = await queryInterface.describeTable('tasks')

      if (!tableDescription.assignee_id) {
        await queryInterface.addColumn(
          'tasks',
          'assignee_id',
          {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
              model: 'users',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          },
          { transaction }
        )
      }

      if (!tableDescription.company_id) {
        await queryInterface.addColumn(
          'tasks',
          'company_id',
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
      }
    })
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const tableDescription = await queryInterface.describeTable('tasks')

      if (tableDescription.company_id) {
        await queryInterface.removeColumn('tasks', 'company_id', { transaction })
      }

      if (tableDescription.assignee_id) {
        await queryInterface.removeColumn('tasks', 'assignee_id', { transaction })
      }
    })
  }
}

