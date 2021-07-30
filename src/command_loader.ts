import fs from 'fs'
import path from 'path'
import { aliases, commands } from './collections'
import { msgCmdsDir } from './directories'
import log from './logger'

async function loadAllMsgCmds(): Promise<void> {
  log.debug('loading all commands into memory')
  const files = fs.readdirSync(msgCmdsDir)
  log.debug(`Loading ${files.length} command(s).`)
  const promiseArray = files.map((file) => loadMsgCommand(file))
  const ext = process.env.NODE_ENV === 'production' ? 'js' : 'ts'
  commands
    .map((command) => command.name)
    .filter((command) => !files.includes(`${command}.${ext}`))
    .forEach((command) => {
      log.debug(`command file '${command}' not found.`)
      removeMsgCommand(command)
    })
  await Promise.all(promiseArray)
  log.info(
    `Loaded ${commands.size} command${commands.size === 1 ? '' : 's'} with ${
      aliases.size
    } aliases.`,
  )
}

async function loadMsgCommand(cmdName: string): Promise<void> {
  const cmdPath = path.join(msgCmdsDir, cmdName)
  const name = path.parse(cmdPath).name
  if (commands.has(name)) removeMsgCommand(name)
  log.debug(`loading command: '${name}'`)
  let command: Cmd
  try {
    command = await import(cmdPath)
  } catch (e) {
    log.warn(`The cmd '${cmdName}' was unable to be imported`)
    return
  }
  if (!command.info || typeof command.info !== 'object') {
    log.warn(`The cmd '${cmdName}' is missing the 'info' object`)
    return
  }
  if (!command.run || typeof command.run !== 'function') {
    log.warn(`The cmd '${cmdName}' is missing the 'run' function`)
    return
  }
  command.name = name
  commands.set(name, command)
  if (command.info.aliases) {
    command.info.aliases.forEach((alias) => {
      if (commands.has(alias)) {
        log.warn(`The command ${name} alias ${alias} already exists.`)
      } else {
        aliases.set(alias, command)
      }
    })
  }
}

function removeMsgCommand(cmdName: string) {
  log.debug(`flushing command: '${cmdName}'`)
  aliases.forEach((cmd, alias) => {
    if (cmd.name === cmdName) aliases.delete(alias)
  })
  const ext = process.env.NODE_ENV === 'production' ? 'js' : 'ts'
  delete require.cache[
    require.resolve(path.join(msgCmdsDir, `${cmdName}.${ext}`))
  ]
  commands.delete(cmdName)
}

export default {
  loadAllMsgCmds,
  loadMsgCommand,
}
