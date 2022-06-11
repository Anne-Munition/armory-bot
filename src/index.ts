/*require('pmx').init({
  http: true,
  ignore_routes: [/socket\.io/],
  errors: true,
  custom_probes: true,
  network: true,
  ports: true,
})*/
// TODO: Use PMX? Check for ES6 rules

import * as app from './app'
import log from './logger'
import { ownerError } from './utilities'

log.info('Starting the application...')

app
  .start()
  .then(() => {
    log.info('Startup complete.')
  })
  .catch((err) => {
    log.error(err.message)
    process.exit(1)
  })

const signals: NodeJS.Signals[] = ['SIGHUP', 'SIGINT', 'SIGTERM']

signals.forEach((signal) => {
  process.on(signal, () => {
    shutdown(signal)
  })
})

const shutdown = (signal: NodeJS.Signals) => {
  log.info(`Received a ${signal} signal. Attempting graceful shutdown...`)
  app.stop().finally(() => {
    log.info(`Shutdown completed. Exiting.`)
    process.exit(0)
  })
}

if (process.env.NODE_ENV === 'production') {
  // Message the bot owner on any unhandled errors
  process.on('unhandledRejection', (err: Error) => {
    ownerError('Unhandled', err).catch()
  })

  // Message the bot owner on any uncaught errors
  process.on('uncaughtException', (err: Error) => {
    ownerError('Uncaught', err).catch()
  })
}
