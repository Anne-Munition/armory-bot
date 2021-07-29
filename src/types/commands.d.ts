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

type Message = import('discord.js').Message

interface Cmd {
  name: string
  info: CmdInfo
  run: Run
  nameUsed: string
  prefixUsed: string
}

type Run = (msg: Message, params: string[], cmd: Cmd) => Promise<void>
