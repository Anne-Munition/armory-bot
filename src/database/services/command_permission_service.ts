import CmdPerm, { CmdPermDoc } from '../models/command_permission_model'

async function getByCmd(cmd: string): Promise<CmdPermDoc[]> {
  return CmdPerm.find({ command_name: cmd })
}

async function getByGuildId(guildId: string): Promise<CmdPermDoc[]> {
  return CmdPerm.find({ guild_id: guildId })
}

export default {
  getByCmd,
  getByGuildId,
}
