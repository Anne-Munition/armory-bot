import { Snowflake } from 'discord.js'

export const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017'

export const scheduleChannel: Snowflake =
  process.env.NODE_ENV === 'production'
    ? '362349719663542272'
    : '872986945788211231'

export const spoilerChannel: Snowflake =
  process.env.NODE_ENV === 'production'
    ? '148124154602717193'
    : '872987015677898813'

export const timeoutCmdChannel: Snowflake =
  process.env.NODE_ENV === 'production'
    ? '763506251291557918'
    : '872709719465263165'

export const muteRole: Snowflake =
  process.env.NODE_ENV === 'production'
    ? '706906565784895509'
    : '835696708657872906'

export const numberChannel: Snowflake =
  process.env.NODE_ENV === 'production'
    ? '888689437029068810'
    : '888655212204666881'
