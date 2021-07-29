type CommandCollection = import('discord.js').Collection<string, Cmd>
type AliasCollection = import('discord.js').Collection<string, Cmd>

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

type CommandPermsCollection = import('discord.js').Collection<
  string,
  CommandPerms
>
