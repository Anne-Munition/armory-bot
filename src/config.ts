import { Snowflake } from 'discord.js'

export const defaultPrefix = process.env.DEFAULT_PREFIX || '~'
export const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017'

export const scheduleChannel: Snowflake =
  process.env.NODE_ENV === 'production'
    ? '362349719663542272'
    : '140025699867164673'

export const spoilerChannel: Snowflake =
  process.env.NODE_ENV === 'production'
    ? '148124154602717193'
    : '870178320107601951'

export const modChannel: Snowflake =
  process.env.NODE_ENV === 'production'
    ? '763506251291557918'
    : '870481765607813151'
