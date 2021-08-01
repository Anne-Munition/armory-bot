type MsgCommandCollection = import('discord.js').Collection<string, MsgCmd>
type AliasCollection = import('discord.js').Collection<string, MsgCmd>

interface GuildConfig {
  prefix: string
}

type GuildConfigCollection = import('discord.js').Collection<
  string,
  GuildConfig
>

interface CommandPermItems {
  members: string[]
  channels: string[]
  roles: string[]
}

interface CommandPerms {
  allow: CommandPermItems
  deny: CommandPermItems
}

type CommandPermCollection = import('discord.js').Collection<
  string,
  CommandPerms
>

type SlashCommandCollection = import('discord.js').Collection<string, SlashCmd>
