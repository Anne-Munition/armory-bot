import Discord from 'discord.js'

// TODO

function guildCreate(guild: Discord.Guild) {}

function guildDelete(guild: Discord.Guild) {}

function guildMemberAdd(member: Discord.GuildMember) {}

function guildMemberRemove(
  member: Discord.GuildMember | Discord.PartialGuildMember,
) {}

function guildBanAdd(ban: Discord.GuildBan) {}

function guildBanRemove(ban: Discord.GuildBan) {}

function threadCreate(thread: Discord.ThreadChannel) {}

export default {
  guildCreate,
  guildDelete,
  guildMemberAdd,
  guildMemberRemove,
  guildBanAdd,
  guildBanRemove,
  threadCreate,
}
