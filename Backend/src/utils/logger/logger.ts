import { existsSync, mkdirSync } from 'fs'
import { utc } from 'moment'
import * as winston from 'winston'

class Logging {
  public logger: winston.Logger

  // Define the logs level
  private logLevel = process.env.LOG_LEVEL || 'silly'

  constructor() {
    this.logger = winston.createLogger({
      transports: [this.transportList.console, this.transportList.file],
      exceptionHandlers: [this.transportList.console, this.transportList.file]
    })
  }

  // Public methods for external use
  public error(fileName: string, method: string, uuid: string, msg: string, data: any = {}) {
    this.setLog('error', fileName, method, uuid, msg, data)
  }

  public warn(fileName: string, method: string, uuid: string, msg: string, data = {}) {
    this.setLog('warn', fileName, method, uuid, msg, data)
  }

  public info(fileName: string, method: string, uuid: string, msg: string, data = {}) {
    this.setLog('info', fileName, method, uuid, msg, data)
  }

  public verbose(fileName: string, method: string, uuid: string, msg: string, data = {}) {
    this.setLog('verbose', fileName, method, uuid, msg, data)
  }

  public debug(fileName: string, method: string, uuid: string, msg: string, data = {}) {
    this.setLog('debug', fileName, method, uuid, msg, data)
  }

  public silly(fileName: string, method: string, uuid: string, msg: string, data = {}) {
    this.setLog('silly', fileName, method, uuid, msg, data)
  }

  // Set the log
  private setLog(level: string, fileName: string, method: string, uuid: string, msg: string, data = {}) {
    // Get the file name from absolute path for label in logs and prepare label
    const parts = fileName.split('/')
    let label = parts[parts.length - 2] + '/' + parts.pop()
    label += method ? ` ~ ${method}` : ''
    this.transportList.console.format = this.myConsoleformat(label)
    this.transportList.file.format = this.myFileformat(label)
    const meta = data ? data : ''
    let logMessage = ''
    if (uuid) {
      logMessage += `${uuid} - `
    }
    logMessage += `${msg} ${Object.keys(meta).length !== 0 ? '- ' + JSON.stringify(meta) : ''}`
    this.logger.log(level, logMessage, meta)
  }

  // Change the file log level
  public setFileLevel(level: string) {
    this.transportList.file.level = level
  }

  // Change the console log level
  public setConsoleLevel(level: string) {
    this.transportList.console.level = level
  }

  // Get the console log level
  public getConsoleLevel() {
    return this.transportList.console.level
  }
  // return the Console format
  private myConsoleformat = (customLabel = '') => {
    return winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp(),
      winston.format.label({ label: customLabel }),
      winston.format.json(),
      winston.format.printf((info) => `${info.timestamp} - ${info.level}: [${info.label}] - ${info.message} ${info.data ? ' - ' + info.data : ''}`)
    )
  }

  // return the File format
  private myFileformat = (customLabel = '') => {
    return winston.format.combine(
      winston.format.timestamp(),
      winston.format.label({ label: customLabel }),
      winston.format.json(),
      winston.format.printf((info) => `${info.timestamp} - ${info.level}: [${info.label}] - ${info.message} ${info.data ? ' - ' + info.data : ''}`)
    )
  }
  // return the file path for log file
  private filePath = () => {
    const dir = __dirname + '/../../logs'
    if (!existsSync(dir)) {
      mkdirSync(dir)
    }
    return dir + `/logs_${utc().format('YYYY-MM-DD')}_.log`
  }
  // set file transport object
  private fileOption = () => {
    return {
      filename: this.filePath(),
      maxsize: 16777216, // Maximum size of a log file should be 16MB
      maxFiles: 64, // Maximum 64 file of 16 MB to be stored. i.e Max 1GB of logs can be stored
      level: this.logLevel,
      handleExceptions: true,
      format: this.myFileformat()
    }
  }
  // Set console transport options
  private consoleOption = () => {
    return {
      format: this.myConsoleformat(),
      level: this.logLevel,
      // silent: true // Uncomment to turn off logging
      handleExceptions: true
      //handleRejections: true
    }
  }
  // create transport
  private transportList = {
    console: new winston.transports.Console(this.consoleOption()),
    file: new winston.transports.File(this.fileOption())
  }
}

const logger = new Logging()
export default logger
