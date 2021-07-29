import path from 'path'
import { assetsDir } from '../directories'

export const info: CmdInfo = {
  desc: "Posts the 'Kery's fault' image.",
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
        attachment: path.join(assetsDir, 'kery.png'),
        name: 'kery.png',
      },
    ],
  })
}
