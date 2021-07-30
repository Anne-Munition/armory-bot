import path from 'path'
import { createLogger, format, transports } from 'winston'
import { logDir } from './directories'

const { combine, timestamp, colorize, printf } = format

const myFormat = printf((info) => {
  return `${info.timestamp} ${info.level} ${info.message}`
})

// TODO: rotate logs? Revisit formatting?

const logger = createLogger({
  level: 'info',
  transports: [
    new transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: combine(timestamp(), myFormat),
    }),
    new transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: combine(timestamp(), myFormat),
    }),
  ],
})

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new transports.Console({
      level: 'debug',
      format: combine(timestamp(), colorize(), myFormat),
    }),
  )
}

export default logger
