import fs from 'fs'
import path from 'path'
import { commands } from './collections'
import CmdPerm from './database/services/command_permission_service'
import { cmdsDir } from './directories'
import log from './logger'

const ext = process.env.NODE_ENV === 'production' ? 'js' : 'ts'

async function loadAllCommands(): Promise<void> {
  log.debug('loading all commands into memory')
  const files = fs
    .readdirSync(cmdsDir)
    .filter((file) => file.endsWith(`.${ext}`))
    .filter((file) => !file.startsWith('permissions'))
    .map((file) => path.parse(file).name)
  log.debug(`loading ${files.length} command(s).`)
  await Promise.all(files.map((file) => loadCommand(file)))
  log.info(`Loaded ${commands.size} slash command(s).`)
}

async function loadCommand(name: string): Promise<void> {
  const cmdPath = path.join(cmdsDir, `${name}.${ext}`)
  if (commands.has(name)) removeSlashCommand(name)
  log.debug(`loading command: '${name}'`)
  let cmd: Cmd
  try {
    cmd = await import(cmdPath)
  } catch (e) {
    log.warn(`The '${name}' command was unable to be imported.`)
    return
  }
  if (!cmd.info) {
    log.warn(`The '${name}' command is missing the 'info' object.`)
    return
  }
  if (!cmd.structure) {
    log.warn(`The '${name}' command is missing the 'structure' object.`)
    return
  }
  if (cmd.structure.name !== name) {
    log.warn(`The '${name}' command structure name MUST match the filename.`)
    return
  }
  if (!cmd.run) {
    log.warn(`The '${name}' command is missing the 'run' function.`)
    return
  }
  cmd.structure.defaultPermission = cmd.info.defaultPermission
  if (!cmd.permissions) cmd.permissions = []
  const ids = cmd.permissions.map((x) => x.id)
  const overwrites = await CmdPerm.getByCmd(name)
  log.debug(
    `${overwrites.length} permission overwrites found for '${name}' command`,
  )
  overwrites.forEach((overwrite) => {
    const id = overwrite.permission.id
    const index = ids.indexOf(id)
    log.debug(`perm overwrite: ${overwrite.permission.type} permission ${id}`)
    if (index > -1) {
      const oldPerm = cmd.permissions?.[index]
      if (overwrite.permission.permission !== oldPerm?.permission) {
        log.debug(
          `perm overwrite: ${overwrite.permission.type} permission ${id}: removing permission ${oldPerm?.permission}`,
        )
        cmd.permissions?.splice(index, 1)
        ids.splice(index, 1)
      }
    }
    log.debug(
      `perm overwrite: ${overwrite.permission.type} permission ${id}: adding permission ${overwrite.permission.permission}`,
    )
    cmd.permissions?.push(overwrite.permission)
    ids.push(id)
  })
  if (!cmd.permissions.length) delete cmd.permissions
  commands.set(name, { cmd })
}

function removeSlashCommand(name: string) {
  log.debug(`flushing command: '${name}'`)
  delete require.cache[require.resolve(path.join(cmdsDir, `${name}.${ext}`))]
  commands.delete(name)
}

export default {
  loadAllCommands,
  loadCommand,
}
