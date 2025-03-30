import { Snowflake } from 'discord.js';
import { HexColorString } from 'discord.js';
import TwitchChannel, { TwitchChannelDoc } from '../models/twitch_channel_model.js';

async function list(): Promise<TwitchChannelDoc[]> {
  return TwitchChannel.find({});
}

async function search(filter: { [key: string]: any }): Promise<TwitchChannelDoc[]> {
  return TwitchChannel.find(filter);
}

async function get(twitchChannel: string): Promise<TwitchChannelDoc | null> {
  const r = new RegExp(twitchChannel, 'i');
  return TwitchChannel.findOne({ display_name: { $regex: r } });
}

async function add(
  user: HelixUser,
  discordData: { guild_id: Snowflake; channel_id: Snowflake },
  color?: HexColorString,
): Promise<void> {
  await new TwitchChannel({
    display_name: user.display_name,
    login: user.login,
    image_url: user.profile_image_url,
    twitch_id: user.id,
    channels: [discordData],
    hex: color,
  }).save();
}

async function remove(id: string): Promise<void> {
  await TwitchChannel.findByIdAndDelete(id);
}

async function save(doc: TwitchChannelDoc): Promise<void> {
  await doc.save();
}

export default {
  list,
  get,
  add,
  remove,
  save,
  search,
};
