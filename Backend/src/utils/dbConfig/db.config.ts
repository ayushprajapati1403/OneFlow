import { Sequelize } from 'sequelize'
// import { logger } from '../logger'
// Database configuration

const DB_HOST = process.env.DB_HOST?.trim() || 'localhost'
const DB_NAME = process.env.DB_NAME?.trim() || 'oneflow_db'
const DB_USER = process.env.DB_USER?.trim() || 'oneflow_user'
const DB_PASSWORD = process.env.DB_PASSWORD?.trim() || 'oneflow_password'

const SSL_CERTIFICATE: any = process.env.DB_CA_CERTIFICATE
const DB_PORT = process.env.DB_PORT ? parseInt(process.env.DB_PORT as string, 10) : 5432
const DB_LOGGING: any = process.env.DB_LOGGING || 0
const DB_QUERY_TIME: any = process.env.DB_QUERY_TIME || 1000
const DB_QUERY_TIME_LESS_THAN: any = process.env.DB_QUERY_TIME_LESS_THAN || 0

// Create Sequelize instance
const sequelize = new Sequelize(DB_NAME as string, DB_USER as string, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT ? +DB_PORT : undefined,
  dialect: 'postgres',
  pool: {
    max: 40,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  define: {
    underscored: true, // Use snake_case for database columns
    timestamps: true // We handle timestamps manually
  },
  logging: Number(DB_LOGGING)
    ? function (rawQuery, time = 0) {
        if (time > DB_QUERY_TIME) {
          console.log('\x1b[33m%s\x1b[0m', `${rawQuery} -`, '\x1b[35m', `${time} ms \n`, '\x1b[37m')
        } else if (Number(DB_QUERY_TIME_LESS_THAN)) {
          console.log('\x1b[32m', `${rawQuery} -`, '\x1b[35m', `${time} ms \n`, '\x1b[37m')
        }
      }
    : false,
  ...(process.env.ENV === 'prod' && {
    dialectOptions: {
      ssl: {
        rejectUnauthorized: false,
        ca: Buffer.from(SSL_CERTIFICATE, 'base64').toString('ascii')
      }
    }
  })
})

// const initializeModels = () => {
//   try {
//     // Import each component's schema index.
//     // This runs the association code inside each file.
//     require('../../components/Auth/schema')
//     require('../../components/Role/schema')
//     require('../../components/Company/schema')
//     require('../../components/Subscription/schema')
//     require('../../components/CompanySubscription/schema')
//     // Add any new component schema imports here as you create them

//     logger.info(__filename, 'initializeModels', '', 'All model associations initialized.')
//   } catch (error) {
//     logger.error(__filename, 'initializeModels', '', 'Error initializing model associations:', error)
//     throw error // Crash the app if models fail to load
//   }
// }
// Initialize database connection
export const initializeDatabase = async () => {
  try {
    await sequelize.authenticate()
    console.log('Database connection has been established successfully.')

    // initializeModels()
    // Sync models with database (only in development)
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true })
      console.log('Database models synchronized.')
    }
  } catch (error) {
    console.error('Unable to connect to the database:', error)
    throw error
  }
}

// Close database connection
export const closeDatabase = async () => {
  try {
    await sequelize.close()
    console.log('Database connection closed.')
  } catch (error) {
    console.error('Error closing database connection:', error)
    throw error
  }
}

export default sequelize
