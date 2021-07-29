import path from 'path'
import { assetsDir } from '../directories'

export const info: CmdInfo = {
  desc: "Posts the 'Shame Nun' gif.",
  usage: '',
  aliases: [],
  permissions: ['SEND_MESSAGES', 'ATTACH_FILES'],
  dmAllowed: true,
  paramsRequired: false,
}

export const run: Run = async function (msg): Promise<void> {
  await msg.channel.send({
    files: [
      {
        attachment: path.join(assetsDir, 'shame.gif'),
        name: 'shame.gif',
      },
    ],
  })
}
