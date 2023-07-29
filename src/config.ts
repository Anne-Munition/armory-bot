import { Snowflake } from 'discord.js'

export const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017'

export const ids: Ids = {
  // The Armory
  armory: {
    guild: '84764735832068096',
    scheduleChannel: '362349719663542272',
    spoilerChannel: '148124154602717193',
    muteRole: '706906565784895509',
    legacyReactionWebhookId: '901235965216051210',
    birthdayRoleId: '1001341919277879376',
    birthdayAnnouncementChannelId: '84764735832068096',
    auditChannelId: '460167577021186059',
  },
  // DBKynd
  dev: {
    guild: '140025699867164673',
    scheduleChannel: '872986945788211231',
    spoilerChannel: '872987015677898813',
    muteRole: '835696708657872906',
    legacyReactionWebhookId: '887447915440779284',
    birthdayRoleId: '1001279262352998411',
    birthdayAnnouncementChannelId: '872690822942982175',
    auditChannelId: '1134948956510629960',
  },
}

export function getId(guildId: Snowflake, property: IdNames): Snowflake | null {
  for (const set in ids) {
    if (ids[set].guild === guildId) return ids[set]?.[property]
  }
  return null
}

export function getGuildId(): Snowflake {
  return process.env.NODE_ENV === 'production' ? ids.armory.guild : ids.dev.guild
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
  | 'legacyReactionWebhookId'
  | 'birthdayRoleId'
  | 'birthdayAnnouncementChannelId'
  | 'auditChannelId'
