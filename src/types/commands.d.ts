interface CmdInfo {
  desc: string
  usage: string
  aliases: string[]
  hidden?: boolean
  permissions: import('discord.js').PermissionString[]
  dmAllowed: boolean
  paramsRequired: boolean
  disabled?: boolean
  movedToSlash?: boolean
}

interface MsgCmd {
  name: string
  info: CmdInfo
  run: Run
  nameUsed: string
  prefixUsed: string
}

type Run = (
  msg: import('discord.js').Message,
  params: string[],
  cmd: MsgCmd,
) => Promise<void>

interface SlashInfo {
  global: boolean
  guilds?: import('discord.js').Snowflake[]
}

type SlashRun = (
  interaction: import('discord.js').CommandInteraction,
) => Promise<void>

type SlashData = import('discord.js').ApplicationCommandData
type SlashPerms = import('discord.js').ApplicationCommandPermissionData[]

interface SlashCmd {
  info: SlashInfo
  commandData: SlashData
  run: SlashRun
  permissions?: SlashPerms
}
