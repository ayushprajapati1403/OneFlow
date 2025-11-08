/**
 * Load environment variables FIRST before any other imports
 */
import { config } from 'dotenv'
import path from 'path'
config({ path: path.resolve(process.cwd(), '.env') })

/**
 * Now import other modules that depend on process.env
 */
import { Server } from 'http'
import { logger } from './utils/logger'
import { initializeDatabase, closeDatabase } from './utils/dbConfig'

import app from './app'
// import { CURRENT_API_VERSION, BASE_URL } from './utils/constants';
// import * as socketService from './services/socket-io';

let server: Server
const port: number = Number(process.env.PORT) || 3000
;(async () => {
  try {
    // Initialize database connection first
    await initializeDatabase()

    server = app.listen(port, async () => {
      logger.info(__filename, 'server', '', `Server is running on ${port}`)
      // logger.info(__filename, 'server', '', `API Doc Url: ${process.env.API_BASE_URL}${BASE_URL}/${CURRENT_API_VERSION}/docs`);
    })

    // /** initialize socket io */
    // let io = await socketService.init(server);
    // app.set('io', io);
  } catch (err) {
    logger.error(__filename, 'server', '', `Unable to start the server`, err)
    process.exit(1)
  }
})()

const exitHandler = (eventType: string) => {
  logger.info(__filename, 'exitHandler', '', `Closing http server.`, eventType)
  if (server) {
    server.close(async () => {
      logger.info(__filename, 'exitHandler', '', `Http server closed.`)
      await closeDatabase()
      process.exit(1)
    })
  } else {
    closeDatabase().then(() => {
      process.exit(1)
    })
  }
}

// unhandled promise rejections

process.on('unhandledRejection', (promise) => {
  console.error('Promise Rejection ( Unhandled ):', promise)
})
;[`exit`, `SIGINT`, `SIGUSR1`, `SIGUSR2`, `uncaughtException`, `SIGTERM`].forEach((eventType) => {
  process.on(eventType, exitHandler.bind(null, eventType))
})
