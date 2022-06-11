import { HexColorString } from 'discord.js'
import puppeteer from 'puppeteer'
import rgb2hex from 'rgb2hex'
import log from '../logger'
import { palette } from '../utilities'

export default async function (user: HelixUser): Promise<HexColorString | undefined> {
  log.debug(`getting channel color for: ${user.login}`)

  try {
    const browser = await puppeteer.launch()
    const page = await browser.newPage()
    await page.setViewport({ width: 10, height: 10 })
    await page.goto(`https://twitch.tv/${user.login}/about`)
    await page.waitForSelector('.channel-root')

    const style = await page.evaluate(() => {
      const channelRoot = document.querySelector(
        'div.channel-root.channel-root--home.channel-root--unanimated',
      )
      if (!channelRoot) throw new Error('Unable to get channel root element.')
      return JSON.parse(JSON.stringify(getComputedStyle(channelRoot)))
    })
    await page.close()
    await browser.close()
    const { hex } = rgb2hex(style['backgroundColor'])
    log.debug(`got channel color from css: ${hex}`)
    return hex as HexColorString
  } catch (err: any) {
    log.error(err.stack || err.message || err)
  }

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
