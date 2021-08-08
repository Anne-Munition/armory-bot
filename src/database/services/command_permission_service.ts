import { commandPerms } from '../../collections'
import log from '../../logger'
import CmdPerm, { PermDoc } from '../models/command_permission_model'

export async function load(): Promise<void> {
  const perms = await CmdPerm.find({})
  commandPerms.clear()
  perms.forEach((perm) => {
    commandPerms.set(`${perm.server_id}-${perm.cmd}`, perm.perms)
  })
  log.info(`Loaded ${commandPerms.size} command permissions.`)
}

export async function search(
  guildId: string,
  cmd: string,
): Promise<PermDoc | null> {
  return CmdPerm.findOne({ guild_id: guildId, cmd })
}

export function create(guildId: string, cmd: string): PermDoc {
  return new CmdPerm({ guild_id: guildId, cmd })
}
