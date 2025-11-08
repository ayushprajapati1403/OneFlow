import { Response } from 'express'
import STATUS_CODES from 'http-status-codes'
import jwt from 'jsonwebtoken'
import CustomError from '../customError'
import errorCode from '../errorCode'
import { HTTP_STATUS } from '../constants'
import moment from 'moment'
import { Sequelize } from 'sequelize'
const rendStr = 'ABCDEFGHIJKLMNOPQRSRUVXYZ1234567890abcdefghijklmnopqrstuvwxyz'

/**
 * @description Create Response
 * @param {Object} res
 * @param {Number} status
 * @param {String} message
 * @param {Object} payload
 * @param {Object} pager
 */
export const createResponse = (res: Response, status: number, message: string, payload: object | null = {}, pager: object = {}) => {
  const resPager = typeof pager !== 'undefined' ? pager : {}
  const resObj: { status: number; message: string; data: object | null; pager: object | undefined } = {
    status,
    message,
    data: payload,
    pager: undefined
  }
  if (Object.keys(resPager as object).length !== 0) resObj.pager = resPager
  return res.status(status).json(resObj)
}

export const createResponse1 = ({
  message,
  payload = {},
  res,
  status,
  pager,
  code
}: {
  res: Response
  status: HTTP_STATUS
  message: string
  payload?: object
  pager?: object
  code?: string
}) => {
  pager = pager !== undefined ? pager : {}
  return res.status(Number(status)).json({
    status,
    message,
    data: payload,
    pager: pager,
    code
  })
}

/**
 * @description Send Validation Response
 * @param {Object} res
 * @param {errors} errors - Errors Object
 *
 * @return {*|Sequelize.json|Promise<any>}
 */
export const createValidationResponse = (res: Response, errors: { [x: string]: string }) => {
  // return createResponse(res, STATUS_CODES.UNPROCESSABLE_ENTITY, errors[Object.keys(errors)[0]], { error: errors[Object.keys(errors)[0]] }, {})
  return createResponse(res, STATUS_CODES.UNPROCESSABLE_ENTITY, 'Validation errors:', { error: errors }, {})
}

/**
 * @description Get Default sort Order
 * @param sortOrder
 */
export const getDefaultSortOrder = (sortOrder: string): string => {
  const order: string = sortOrder && ['asc', 'desc'].indexOf(sortOrder.toLowerCase()) !== -1 ? (sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC') : 'DESC'
  return order
}

/**
 * create JWT token
 * @param JWT token
 */

export const createJWTToken = (data: any) => {
  return jwt.sign(data, process.env.JWT_KEY || 'staticSecret')
}

/**
 * verify JWT token
 * @param JWT token
 */
export const verifyJWTToken = (token: any) => {
  token = token.split(' ')
  return jwt.verify(token[0], process.env.JWT_SECRET || '')
}

export const handleHTTPError = ({ error, res }: { error: any; res: any }) => {
  if (error instanceof CustomError) {
    createResponse1({
      message: res.__(...error.error),
      res,
      status: error.statusCode,
      payload: error.data,
      code: error.code || errorCode.error
    })
    return
  }
  createResponse1({
    message: res.__('SERVER_ERROR_MESSAGE'),
    res,
    status: STATUS_CODES.INTERNAL_SERVER_ERROR,
    payload: {},
    code: errorCode.internalServerError
  })
}

/**
 * create date difference minutes
 * @param Decrypt
 */
export const timeDifferenceMinutes = (starDate: Date) => {
  const curDate = moment()
  const duration = moment.duration(curDate.diff(starDate))
  return duration.asMinutes()
}

/**
 * It will return a random number with the specified length.
 * @param {number} length - The length of the random number to generate.
 * @return {string} - The generated random number as a string.
 */
export const getRandomNumber = (length: number) => {
  const min = Math.pow(10, length - 1)
  const max = Math.pow(10, length) - 1
  return String(Math.floor(Math.random() * (max - min + 1)) + min)
}

/**
 * It will be used to generate random string of provided length from provided string
 * @param {randomString}
 * @param {length}
 *
 * @return {string}
 */
export const getChatUUID = (length: number, user1?: number, user2?: number) => {
  let randomText = ''
  for (let i = 0; i < length; i++) {
    randomText += rendStr.charAt(Math.floor(Math.random() * rendStr.length))
  }
  if (user1 && user2) {
    return user1 + '-' + user2 + '-' + randomText
  } else randomText
}

/**
 * It will return random value between min and max value.
 * @param {min}
 * @param {max}
 *
 * @return {number}
 */
export const getRandom = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export const getGeoLocation = ({ longitude, latitude }: { longitude: number; latitude: number }) => {
  if (longitude && latitude) return Sequelize.fn('ST_SetSRID', Sequelize.fn('ST_MakePoint', longitude, latitude), 4326)
  else return null
}
export const getCurrentTime = () => {
  const now = new Date()
  return now.toTimeString().split(' ')[0]
}

export const parseBooleanValue = (str: string): boolean => {
  const parseObj: any = {
    true: true,
    false: false,
    '': false,
    0: false,
    1: true
  }
  return parseObj[str] || false
}
