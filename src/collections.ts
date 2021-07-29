import Discord from 'discord.js'

export const commands: CommandCollection = new Discord.Collection()
export const aliases: AliasCollection = new Discord.Collection()
export const guildConfigs: GuildConfigCollection = new Discord.Collection()
export const commandPerms: CommandPermsCollection = new Discord.Collection()
