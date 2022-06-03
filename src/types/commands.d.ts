type Commands = import('discord.js').Collection<
  string,
  {
    cmd: Cmd
    id?: import('discord.js').Snowflake
  }
>

interface CmdInfo {
  global: boolean
  guilds?: import('discord.js').Snowflake[]
}

type CmdRun = (
  interaction: import('discord.js').CommandInteraction,
) => Promise<void>

type CmdStructure = import('discord.js').ApplicationCommandData
type CmdPerms = import('discord.js').ApplicationCommandPermissionData[]

interface Cmd {
  info: CmdInfo
  structure: CmdStructure
  run: CmdRun
  permissions?: CmdPerms
}
