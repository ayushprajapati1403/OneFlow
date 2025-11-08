import express, { Application, NextFunction, Request, Response } from 'express'
import STATUS_CODES from 'http-status-codes'
// import fileUpload from 'express-fileupload'
import { logger } from '../utils/logger'
import { i18n } from './i18n'
// import swagger from './swagger'
import uuid from './uuid'
import cors from 'cors'

export default (app: Application) => {
  app.use(cors())
  app.use(express.json())
  app.use(express.urlencoded({ limit: '500mb', extended: true }))
  app.use(i18n.init) // support internationalization
  // app.use(fileUpload())
  // app.use('/uploads', express.static('uploads'))

  app.use(underMaintenanceCheck) // check to see if app is under maintenance
  uuid(app) // add uuid in req if not availabler
  // add all other middleware here
}

const underMaintenanceCheck = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.APP_UNDER_MAINTAINANCE === 'true') {
    logger.info(__filename, '', '', req.__('SERVICE_UNAVAILABLE'))
    res.status(STATUS_CODES.SERVICE_UNAVAILABLE).json({
      status: STATUS_CODES.SERVICE_UNAVAILABLE,
      message: req.__('SERVICE_UNAVAILABLE')
    })
    return
  } else {
    next()
  }
}
