export const defaultPrefix = process.env.DEFAULT_PREFIX || '~'
export const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017'

export const scheduleChannel =
  process.env.NODE_ENV === 'production'
    ? '362349719663542272'
    : '140025699867164673'

export const spoilerChannel =
  process.env.NODE_ENV === 'production'
    ? '148124154602717193'
    : '870178320107601951'
