import * as app from '../app'

export const info: CmdInfo = {
  desc: 'Restarts the Bot.',
  usage: '',
  aliases: [],
  hidden: true,
  permissions: ['SEND_MESSAGES'],
  dmAllowed: true,
  paramsRequired: false,
}

export const run: Run = async function (msg): Promise<void> {
  if (msg.author.id !== process.env.OWNER_ID) return
  await msg.channel.send(':ok_hand:').then(() => {
    app.stop().finally(() => {
      process.exit(0)
    })
  })
}
