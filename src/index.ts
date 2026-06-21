import * as app from './app.js';
import log from './logger.js';
import { ownerError } from './utilities.js';

// tfjs-node currently triggers deprecated util APIs on newer Node runtimes.
// Ignore only those known warnings so other warnings still surface.
process.on('warning', (warning) => {
  const code = (warning as Error & { code?: string }).code;
  const isTfjsWarning =
    warning.name === 'DeprecationWarning' &&
    (code === 'DEP0044' || code === 'DEP0051') &&
    (warning.stack?.includes('@tensorflow/tfjs-node') || false);
  if (isTfjsWarning) return;

  log.warn(`${warning.name}${code ? ` [${code}]` : ''}: ${warning.message}`);
});

log.info('Starting the application...');

app
  .start()
  .then(() => {
    log.info('Startup complete.');
  })
  .catch((err) => {
    log.error(err.message);
    process.exit(1);
  });

const signals: NodeJS.Signals[] = ['SIGHUP', 'SIGINT', 'SIGTERM'];

signals.forEach((signal) => {
  process.on(signal, () => {
    shutdown(signal);
  });
});

const shutdown = (signal: NodeJS.Signals) => {
  log.info(`Received a ${signal} signal. Attempting graceful shutdown...`);
  app.stop().finally(() => {
    log.info(`Shutdown completed. Exiting.`);
    process.exit(0);
  });
};

if (process.env.NODE_ENV === 'production') {
  // Message the bot owner on any unhandled errors
  process.on('unhandledRejection', (err: Error) => {
    ownerError('Unhandled', err).catch();
  });

  // Message the bot owner on any uncaught errors
  process.on('uncaughtException', (err: Error) => {
    ownerError('Uncaught', err).catch();
  });
}
