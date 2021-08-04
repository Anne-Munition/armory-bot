import { Snowflake } from 'discord.js'
import { HexColorString } from 'discord.js'
import TwitchChannel, { TwitchChannelDoc } from '../models/twitch_channel_model'

async function list(): Promise<TwitchChannelDoc[]> {
  return TwitchChannel.find({})
}

async function get(channel: string): Promise<TwitchChannelDoc | null> {
  const r = new RegExp(channel, 'i')
  return TwitchChannel.findOne({ display_name: { $regex: r } })
}

async function add(
  user: HelixUser,
  discordData: { guild_id: Snowflake; channel_id: Snowflake },
  color: HexColorString | undefined,
): Promise<void> {
  await new TwitchChannel({
    display_name: user.display_name,
    login: user.login,
    image_url: user.profile_image_url,
    twitch_id: user.id,
    discord_channels: [discordData],
    hex: color,
  }).save()
}

async function remove(doc: TwitchChannelDoc): Promise<void> {
  await doc.remove()
}

async function save(doc: TwitchChannelDoc): Promise<void> {
  await doc.save()
}

export default {
  list,
  get,
  add,
  remove,
  save,
}
