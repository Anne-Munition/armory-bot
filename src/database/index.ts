import mongoose, { ConnectOptions } from 'mongoose';
import { mongoUrl } from '../config.js';
import log from '../logger.js';
import { ownerError } from '../utilities.js';

mongoose.Promise = global.Promise;

const options: ConnectOptions = {
  connectTimeoutMS: 30000,
};

mongoose.connection.on('error', (err) => {
  ownerError('Mongoose', err).catch();
});

export async function connect(uri?: string): Promise<void> {
  const url = uri || mongoUrl;
  const { hostname } = new URL(url);
  await mongoose.connect(url, options).then(() => {
    log.info(`Connected to MongoDB: '${hostname}'`);
  });
}

export function disconnect(): Promise<void> {
  return mongoose
    .disconnect()
    .then(() => {
      log.info('Database connection closed');
    })
    .catch((err) => {
      log.error(err.message);
    });
}
