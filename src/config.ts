import { Snowflake } from 'discord.js'

export const defaultPrefix = process.env.DEFAULT_PREFIX || '~'
export const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017'

export const scheduleChannel: Snowflake =
  process.env.NODE_ENV === 'production'
    ? '362349719663542272'
    : '872986945788211231'

export const spoilerChannel: Snowflake =
  process.env.NODE_ENV === 'production'
    ? '148124154602717193'
    : '872987015677898813'

export const modChannel: Snowflake =
  process.env.NODE_ENV === 'production'
    ? '763506251291557918'
    : '872987096925757440'

export const muteRole: Snowflake =
  process.env.NODE_ENV === 'production'
    ? '706906565784895509'
    : '835696708657872906'
