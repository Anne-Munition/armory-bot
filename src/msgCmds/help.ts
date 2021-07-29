import { commands } from '../collections'
import { usage } from '../utilities'

export const info: CmdInfo = {
  desc: 'Show base usage for a command.',
  usage: '<command>',
  aliases: [],
  permissions: ['SEND_MESSAGES'],
  dmAllowed: true,
  paramsRequired: true,
}

export const run: Run = async function (msg, params, cmd): Promise<void> {
  params = params.map((p) => p.toLowerCase())
  const cmdName = params[0]

  const helpCmd = commands.get(cmdName)
  if (!helpCmd) {
    await msg.reply(`**${cmdName}** is not a registered command.`)
    return
  }

  if (!cmd.info.usage || cmd.info.usage === '') {
    await msg.reply(
      `\`\`${cmd.prefixUsed}${cmdName}\`\` does not need any additional arguments to run.`,
    )
    return
  }

  helpCmd.prefixUsed = cmd.prefixUsed
  helpCmd.nameUsed = cmdName
  await usage(msg, helpCmd)
}
