import { NextFunction, Request, Response } from 'express'
import isJSON from 'validator/lib/isJSON'
import { createValidationResponse } from '../helper'

/* *
 * @description Check if constiable is undefined or not
 * @param {*} str
 */
export const isEmpty = (value: any) => {
  if (value === undefined || value === null || (typeof value === 'object' && Object.keys(value).length === 0) || (typeof value === 'string' && value.trim().length === 0)) {
    return true
  } else {
    return false
  }
}

/**
 * @description Custom RegEx
 * @param {String} str
 * @param {String} regEx
 */
export const customRegex = (str: string, regEx: RegExp) => {
  if (typeof str !== 'string') {
    return false
  } else if (!regEx.test(str)) {
    return false
  } else {
    return true
  }
}

/**
 * @desc Checks for valid email
 * @param {String} value // Accepts string
 */
export const isEmail = (value: string) => {
  const email = value
  const myRegEx = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  const isValid = myRegEx.test(email)
  if (isValid) {
    return true
  } else {
    return false
  }
}

/**
 * @desc Checks for valid array
 * @param {*} value
 */
export const isArray = (value: any) => {
  if (typeof value === 'string') {
    const replaced = value.replace(/'/g, '"')
    if (!isJSON(replaced)) {
      return false
    } else {
      const parsed = JSON.parse(replaced)
      if (parsed.constructor === Array) {
        return true
      } else {
        return false
      }
    }
  } else {
    if (value.constructor === Array) {
      return true
    } else {
      return false
    }
  }
}

/**
 * @description Is Valid Date
 * @param {*} d
 */
export const isValidDate = (d: any) => {
  if (Object.prototype.toString.call(d) === '[object Date]') {
    if (isNaN(d.getTime())) {
      return false
    } else {
      return true
    }
  } else {
    return false
  }
}

/**
 * @description Check if valid string
 * @param {String} value
 */
export const isString = (value: string | object) => {
  return typeof value === 'string' || value instanceof String
}

/**
 * @desc Checks if given value is Number
 * @param {*} value // Accepts string
 */
export const isNumber = (value: any) => {
  const number = value
  const myRegEx = /^(\s*[0-9]+\s*)+$/
  const isValid = myRegEx.test(number)
  if (isValid) {
    return true
  } else {
    return false
  }
}

/**
 * @desc Checks if given value is Boolean
 * @param {*} value // Accepts string
 */
export const isBoolean = (value: any) => {
  if (typeof value === 'boolean') {
    return true
  } else {
    return false
  }
}

/**
 * @description list route validations
 * @param req
 * @param res
 * @param next
 */
export const list = async (req: Request, res: Response, next: NextFunction) => {
  // const { authorization } = req.headers
  const { search, page, records_per_page, sort_order, sort_by, show_all } = req.body
  const errors: { [x: string]: string } = {}

  // if (isEmpty(authorization as string)) {
  //   errors.authorization = res.__('VALIDATIONS.authorization.required')
  // }

  if (!isEmpty(search) && !isJSON(search)) {
    errors.search = res.__('VALIDATIONS.search.valid')
  }
  if (!isEmpty(page) && !isNumber(page)) {
    errors.page = res.__('VALIDATIONS.page.valid')
  } else if (!isEmpty(page) && Number(page) <= 0) {
    errors.page = res.__('VALIDATIONS.page.valid')
  }
  if (!isEmpty(records_per_page) && !isNumber(records_per_page)) {
    errors.records_per_page = res.__('VALIDATIONS.records_per_page.valid')
  }
  if (!isEmpty(sort_order) && !isString(sort_order)) {
    errors.sort_order = res.__('VALIDATIONS.sort_order.valid')
  }
  if (!isEmpty(sort_by) && !isString(sort_by)) {
    errors.sort_by = res.__('VALIDATIONS.sort_by.valid')
  }
  if (!isEmpty(show_all) && !isBoolean(show_all)) {
    errors.show_all = res.__('VALIDATIONS.show_all.valid')
  }

  if (Object.keys(errors).length > 0) {
    createValidationResponse(res, errors)
  } else {
    next()
  }
}

/**
 * @desc Checks if given value is nullish
 * @param {*} value // Accepts string
 */
export const isNullish = (value: any) => {
  if (typeof value == 'undefined' || value === '') {
    return true
  } else {
    return false
  }
}

/**
 * @desc Checks if given value is a valid Latitude
 * @param {*} value // Accepts string or number
 */
export const isLatitude = (value: any): boolean => {
  const lat = parseFloat(value)
  return !isNaN(lat) && lat >= -90 && lat <= 90
}

/**
 * @desc Checks if given value is a valid Longitude
 * @param {*} value // Accepts string or number
 */
export const isLongitude = (value: any): boolean => {
  const lon = parseFloat(value)
  return !isNaN(lon) && lon >= -180 && lon <= 180
}
