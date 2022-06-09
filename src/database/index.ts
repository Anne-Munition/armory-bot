import mongoose, { ConnectOptions } from 'mongoose'
import { mongoUrl } from '../config'
import log from '../logger'
import { ownerError } from '../utilities'

mongoose.Promise = global.Promise

const options: ConnectOptions = {
  keepAlive: true,
  connectTimeoutMS: 30000,
}

mongoose.connection.on('error', (err) => {
  ownerError('Mongoose', err).catch()
})

export async function connect(): Promise<void> {
  const { hostname } = new URL(mongoUrl)
  await mongoose.connect(mongoUrl, options).then(() => {
    log.info(`Connected to MongoDB: '${hostname}'`)
  })
}

export function disconnect(): Promise<void> {
  return mongoose
    .disconnect()
    .then(() => {
      log.info('Database connection closed')
    })
    .catch((err) => {
      log.error(err.message)
    })
}
