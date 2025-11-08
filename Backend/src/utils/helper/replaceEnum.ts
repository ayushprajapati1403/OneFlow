// 'use strict'

// import { QueryInterface } from 'sequelize'

// /**
//  * Replaces an ENUM type in PostgreSQL by creating a new ENUM with new values and swapping it out.
//  *
//  * Since PostgreSQL does not support removing values from an ENUM, the workaround is to create
//  * a new ENUM with the new values and use it to replace the existing one.
//  *
//  * @param {Object} options - Options for replacing the ENUM.
//  * @param {string} options.tableName - The name of the table containing the ENUM column.
//  * @param {string} options.columnName - The name of the ENUM column to be replaced.
//  * @param {string} options.defaultValue - The default value for the ENUM column.
//  * @param {string[]} options.newValues - The new set of values for the ENUM type.
//  * @param {QueryInterface} options.queryInterface - The Sequelize QueryInterface instance.
//  * @param {string} [options.enumName] - Optional. The name of the ENUM type. Defaults to `enum_<tableName>_<columnName>`.
//  *
//  * @return {Promise<void>} - A promise that resolves when the ENUM replacement is complete.
//  */
// export async function replaceEnum({
//   tableName,
//   columnName,
//   defaultValue,
//   newValues,
//   queryInterface,
//   enumName = `enum_${tableName}_${columnName}`
// }: {
//   tableName: string
//   columnName: string
//   defaultValue: string
//   newValues: string[]
//   queryInterface: QueryInterface
//   enumName?: string
// }): Promise<void> {
//   const newEnumName = `${enumName}_new`

//   await queryInterface.sequelize.transaction(async (t) => {
//     // Create a copy of the type
//     await queryInterface.sequelize.query(
//       `
//       CREATE TYPE ${newEnumName}
//         AS ENUM ('${newValues.join("', '")}')
//     `,
//       { transaction: t }
//     )

//     // Drop default value (ALTER COLUMN cannot cast default values)
//     await queryInterface.sequelize.query(
//       `
//       ALTER TABLE ${tableName}
//         ALTER COLUMN ${columnName}
//           DROP DEFAULT
//     `,
//       { transaction: t }
//     )

//     // Change column type to the new ENUM TYPE
//     await queryInterface.sequelize.query(
//       `
//       ALTER TABLE ${tableName}
//         ALTER COLUMN ${columnName}
//           TYPE ${newEnumName}
//           USING (${columnName}::text::${newEnumName})
//     `,
//       { transaction: t }
//     )

//     // Drop old ENUM
//     await queryInterface.sequelize.query(
//       `
//       DROP TYPE ${enumName}
//     `,
//       { transaction: t }
//     )

//     // Rename new ENUM name
//     await queryInterface.sequelize.query(
//       `
//       ALTER TYPE ${newEnumName}
//         RENAME TO ${enumName}
//     `,
//       { transaction: t }
//     )

//     // Set default value for the column again
//     await queryInterface.sequelize.query(
//       `
//       ALTER TABLE ${tableName}
//         ALTER COLUMN ${columnName}
//           SET DEFAULT '${defaultValue}'::${enumName}
//     `,
//       { transaction: t }
//     )
//   })
// }
