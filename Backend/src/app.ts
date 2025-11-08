import express, { NextFunction } from 'express'
import STATUS_CODES from 'http-status-codes'
import { logger } from './utils/logger'
import middlewares from './middlewares'
import routes from './routes'
// import swaggerUi from 'swagger-ui-express'
import { CustomRequest, CustomResponse } from './environment'

const app: express.Application = express()

middlewares(app) // bind middlewares

routes(app) // initialize all routes

// Base route to health check
app.get('/health', (req: CustomRequest, res: CustomResponse) => {
  return res.status(STATUS_CODES.OK).send('healthy')
})

// disable x-powered-by header
app.disable('x-powered-by')

// handle unexpected request boy
app.use((error: any, req: CustomRequest, res: CustomResponse, next: NextFunction) => {
  if (error instanceof SyntaxError) {
    return res.status(STATUS_CODES.BAD_REQUEST).send({
      status: STATUS_CODES.BAD_REQUEST,
      message: error.message
    })
  }
  next()
})

// Handle invalid Route
app.all('/*', (req: CustomRequest, res: CustomResponse) => {
  logger.info(__filename, 'Invalid Route Handler', req.custom.request_uuid, 'Invalid Route Fired : ' + req.path)
  return res.status(STATUS_CODES.BAD_REQUEST).json({
    status: STATUS_CODES.BAD_REQUEST,
    message: 'Bad Request'
  })
})

export default app
