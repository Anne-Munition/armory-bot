import fs from 'fs'
import path from 'path'
import { aliases, msgCommands, slashCommands } from './collections'
import { msgCmdsDir, slashCmdsDir } from './directories'
import log from './logger'

const ext = process.env.NODE_ENV === 'production' ? 'js' : 'ts'

async function loadAllMsgCmds(): Promise<void> {
  log.debug('loading all msg commands into memory')
  const files = fs
    .readdirSync(msgCmdsDir)
    .filter((file) => file.endsWith(`.${ext}`))
  log.debug(`loading ${files.length} msg command(s)`)
  await Promise.all(files.map((file) => loadMsgCommand(file)))
  log.info(
    `Loaded ${msgCommands.size} msg command(s) with ${aliases.size} aliases.`,
  )
}

async function loadMsgCommand(cmdName: string): Promise<void> {
  const cmdPath = path.join(msgCmdsDir, cmdName)
  const name = path.parse(cmdPath).name
  if (msgCommands.has(name)) removeMsgCommand(name)
  log.debug(`loading msg command: '${name}'`)
  let cmd: MsgCmd
  try {
    cmd = await import(cmdPath)
  } catch (e) {
    log.warn(`The msg command '${name}' was unable to be imported.`)
    return
  }
  if (!cmd.info) {
    log.warn(`The msg command '${name}' is missing the 'info' object.`)
    return
  }
  if (!cmd.run) {
    log.warn(`The msg command '${name}' is missing the 'run' function.`)
    return
  }
  cmd.name = name
  msgCommands.set(name, cmd)
  if (cmd.info.aliases) {
    cmd.info.aliases.forEach((alias) => {
      if (msgCommands.has(alias)) {
        log.warn(`The msg command '${name}' alias '${alias}' already exists.`)
      } else {
        aliases.set(alias, cmd)
      }
    })
  }
}

function removeMsgCommand(cmdName: string) {
  log.debug(`flushing msg command: '${cmdName}'`)
  aliases.forEach((cmd, alias) => {
    if (cmd.name === cmdName) aliases.delete(alias)
  })
  delete require.cache[
    require.resolve(path.join(msgCmdsDir, `${cmdName}.${ext}`))
  ]
  msgCommands.delete(cmdName)
}

async function loadAllSlashCommands(): Promise<void> {
  log.debug('loading all slash commands into memory')
  const files = fs
    .readdirSync(slashCmdsDir)
    .filter((file) => file.endsWith(`.${ext}`))
  log.debug(`loading ${files.length} slash command(s).`)
  await Promise.all(files.map((file) => loadSlashCommand(file)))
  log.info(`Loaded ${slashCommands.size} slash command(s).`)
}

async function loadSlashCommand(cmdName: string): Promise<void> {
  const cmdPath = path.join(slashCmdsDir, cmdName)
  const name = path.parse(cmdPath).name
  if (slashCommands.has(name)) removeSlashCommand(name)
  log.debug(`loading slash command: '${name}'`)
  let cmd: SlashCmd
  try {
    cmd = await import(cmdPath)
  } catch (e) {
    log.warn(`The slash command '${name}' was unable to be imported.`)
    return
  }
  if (!cmd.info) {
    log.warn(`The slash command '${name}' is missing the 'info' object.`)
    return
  }
  if (!cmd.commandData) {
    log.warn(`The slash command '${name}' is missing the 'commandData' object.`)
    return
  }
  if (cmd.commandData.name !== name) {
    log.warn(
      `The slash command '${name}' command options name MUST match the filename.`,
    )
    return
  }
  if (!cmd.run) {
    log.warn(`The slash command '${name}' is missing the 'run' function.`)
    return
  }
  slashCommands.set(name, cmd)
}

function removeSlashCommand(cmdName: string) {
  log.debug(`flushing slash command: '${cmdName}'`)
  delete require.cache[
    require.resolve(path.join(slashCmdsDir, `${cmdName}.${ext}`))
  ]
  slashCommands.delete(cmdName)
}

export default {
  loadAllMsgCmds,
  loadMsgCommand,
  loadAllSlashCommands,
  loadSlashCommand,
}
