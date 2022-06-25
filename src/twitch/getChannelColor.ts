import { HexColorString } from 'discord.js'
import rgb2hex from 'rgb2hex'
import log from '../logger'
import { palette } from '../utilities'

export default async function (
  user: HelixUser,
  twitchChannelColor: string | null,
): Promise<HexColorString | undefined> {
  if (twitchChannelColor) return `#${twitchChannelColor}`

  log.debug(`getting channel color for: ${user.login}`)
  try {
    const rgb = await palette(user.profile_image_url)
    if (!rgb) return
    const { hex } = rgb2hex(`rgb(${rgb.join(',')})`)
    log.debug(`got channel color from profile image: ${hex}`)
    return hex as HexColorString
  } catch (err: any) {
    log.error(err.stack || err.message || err)
  }
}
