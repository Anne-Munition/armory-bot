import { Snowflake } from 'discord.js';

export const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/armory-bot';

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
    animalDetectionChannelId: '542066255507619860',
  },
  // DBKynd
  dev: {
    guild: '140025699867164673',
    scheduleChannel: '1163709845795504168',
    spoilerChannel: '872987015677898813',
    muteRole: '835696708657872906',
    legacyReactionWebhookId: '887447915440779284',
    birthdayRoleId: '1001279262352998411',
    birthdayAnnouncementChannelId: '872690822942982175',
    auditChannelId: '1134948956510629960',
    animalDetectionChannelId: '1397639974928646165',
  },
};

export function getId(guildId: Snowflake, property: IdNames): Snowflake | null {
  for (const set in ids) {
    if (ids[set as keyof typeof ids].guild === guildId) {
      return ids[set as keyof typeof ids]?.[property];
    }
  }
  return null;
}

export function getGuildId(): Snowflake {
  return process.env.NODE_ENV === 'production' ? ids.armory.guild : ids.dev.guild;
}

interface Ids {
  armory: {
    [key in IdNames]: Snowflake;
  };
  dev: {
    [key in IdNames]: Snowflake;
  };
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
  | 'animalDetectionChannelId';
