import { commandPerms } from '../../collections'
import log from '../../logger'
import CmdPerm from '../models/command_permission_model'

export async function load(): Promise<void> {
  const perms = await CmdPerm.find({})
  commandPerms.clear()
  perms.forEach((perm) => {
    commandPerms.set(`${perm.server_id}-${perm.cmd}`, perm.perms)
  })
  log.info(`Loaded ${commandPerms.size} command permissions.`)
}
