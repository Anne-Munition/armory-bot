import { Snowflake } from 'discord.js'

export const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017'

export const ids: Ids = {
  // The Armory
  armory: {
    guild: '84764735832068096',
    scheduleChannel: '362349719663542272',
    spoilerChannel: '148124154602717193',
    muteRole: '706906565784895509',
    numberChannel: '888689437029068810',
    numberRole: '888946210944217109',
    legacyReactionWebhookId: '901235965216051210',
  },
  // DBKynd
  dev: {
    guild: '140025699867164673',
    scheduleChannel: '872986945788211231',
    spoilerChannel: '872987015677898813',
    muteRole: '835696708657872906',
    numberChannel: '888655212204666881',
    numberRole: '888943005975851049',
    legacyReactionWebhookId: '887447915440779284',
  },
}

export function getId(guildId: Snowflake, property: IdNames): Snowflake {
  for (const set in ids) {
    if (ids[set].guild === guildId) return ids[set]?.[property]
  }
  throw new Error('No config id set found for that guild.')
}

interface Ids {
  [key: string]: {
    [key in IdNames]: Snowflake
  }
}

type IdNames =
  | 'guild'
  | 'scheduleChannel'
  | 'spoilerChannel'
  | 'muteRole'
  | 'numberChannel'
  | 'numberRole'
  | 'legacyReactionWebhookId'
