import mongoose, { ConnectionOptions } from 'mongoose'
import { mongoUrl } from '../config'
import log from '../logger'

mongoose.Promise = global.Promise

const options: ConnectionOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: true,
  keepAlive: true,
  connectTimeoutMS: 30000,
}

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
