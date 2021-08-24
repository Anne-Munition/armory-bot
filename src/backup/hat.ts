import fs from 'fs'
import path from 'path'
import axios from 'axios'
import Discord from 'discord.js'
import gm from 'gm'
import { assetsDir, tempDir } from '../directories'
import log from '../logger'
import { capitalize } from '../utilities'

// TODO DMs?

const hats: string[] = fs
  .readdirSync(path.join(assetsDir, 'hats'))
  .filter((x) => x.endsWith('.png'))
  .map((x) => path.parse(x).name)

export const info: CmdInfo = {
  global: true,
  defaultPermission: true,
  editablePermissions: true,
}

export const structure: CmdStructure = {
  name: 'hat',
  defaultPermission: true,
  description: 'Composite a hat onto your avatar image.',
  options: [
    {
      name: 'hat',
      type: 'STRING',
      description: 'Select what hat you want.',
      required: true,
      choices: hats.map((x) => {
        return { name: capitalize(x), value: x }
      }),
    },
    {
      name: 'x-offset',
      type: 'INTEGER',
      description: 'How many pixels to shift the hat horizontally.',
    },
    {
      name: 'y-offset',
      type: 'INTEGER',
      description: 'How many pixels to shift the hat vertically.',
    },
    {
      name: 'scale',
      type: 'INTEGER',
      description: 'Percentage to scale the hat.',
    },
    {
      name: 'rotation',
      type: 'INTEGER',
      description: 'Degrees to rotate the hat.',
    },
  ],
}

export const run: CmdRun = async (interaction): Promise<void> => {
  await interaction.deferReply({ ephemeral: true })

  const avatarUri = interaction.user.displayAvatarURL({ dynamic: false })
  const hat = interaction.options.getString('hat', true)
  const xOffset = interaction.options.getInteger('x-offset') || 0
  const yOffset = interaction.options.getInteger('y-offset') || 0
  const scale = interaction.options.getInteger('scale') || 0
  const rot = interaction.options.getInteger('rotation') || 0

  const hatFile = path.join(assetsDir, 'hats', `${hat}.png`)
  if (!fs.existsSync(hatFile)) {
    await interaction.editReply(`Unable to load the hat file: '${hat}'.`)
    return
  }

  const hatBuffer = await loadHat(hatFile)
  const hatSize = await getSize(hatBuffer)
  const avatarBuffer = await downloadAvatar(avatarUri)
  const avatarSize = await getSize(avatarBuffer)

  const hatScale = avatarSize.width / hatSize.width
  const pixels = Math.floor(
    ((scale === 0 ? 100 : scale) / 100) * (hatSize.width * hatScale),
  )

  const alteredHat = await alterHat(hatBuffer, pixels, rot)
  const alteredHatSize = await getSize(alteredHat)
  const alteredHatFile = await saveAlteredHat(
    alteredHat,
    interaction.user.id,
    hat,
  )

  const shiftX = (pixels - alteredHatSize.width) / 2
  const shiftY = (pixels - alteredHatSize.height) / 2
  const finalX = shiftX + xOffset
  const finalY = shiftY + yOffset
  const x = finalX >= 0 ? `+${finalX.toString()}` : finalX.toString()
  const y = finalY >= 0 ? `+${finalY.toString()}` : finalY.toString()

  const compositeBuffer: Buffer = await new Promise((resolve, reject) => {
    log.debug('compositing the modified hat image onto the users avatar')
    gm(avatarBuffer)
      .composite(alteredHatFile)
      .geometry(`${x}${y}`)
      .toBuffer('PNG', (err, buffer) => {
        if (err) {
          reject(err)
        } else {
          resolve(buffer)
        }
      })
  })

  log.debug('responding to the user with their hatted avatar')
  const file = new Discord.MessageAttachment(
    compositeBuffer,
    `${interaction.user.id}_${hat}.png`,
  )
  await interaction.editReply(':mailbox:')
  await interaction.user.send({ files: [file] })

  try {
    log.debug('removing modified hat temp file')
    fs.unlinkSync(alteredHatFile)
  } catch (err) {
    log.error(err.stack || err.message || err)
    // Do Nothing
  }
}

function loadHat(hatFile: string): Promise<Buffer> {
  log.debug('loading hat into memory buffer')
  return new Promise((resolve, reject) => {
    fs.readFile(hatFile, (err, buffer) => {
      if (err) {
        reject(err)
      } else {
        resolve(buffer)
      }
    })
  })
}

function getSize(hatBuffer: Buffer): Promise<gm.Dimensions> {
  log.debug('getting the hat dimensions')
  return new Promise((resolve, reject) => {
    gm(hatBuffer).size((err, size) => {
      if (err) {
        reject(err)
      } else {
        resolve(size)
      }
    })
  })
}

function downloadAvatar(avatarUri: string): Promise<Buffer> {
  log.debug('downloading the users avatar')
  return new Promise((resolve, reject) => {
    axios
      .get(avatarUri, { responseType: 'arraybuffer' })
      .then((response) => {
        resolve(response.data)
      })
      .catch(reject)
  })
}

function alterHat(
  hatBuffer: Buffer,
  pixels: number,
  rotation: number,
): Promise<Buffer> {
  log.debug('modifying (scale and rotate) the hat buffer')
  return new Promise((resolve, reject) => {
    gm(hatBuffer)
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      .scale(`${pixels}x${pixels}`) // TODO: Custom Typing?
      .rotate('#FFFF', rotation)
      .toBuffer('PNG', (err, buffer) => {
        if (err) {
          reject(err)
        } else {
          resolve(buffer)
        }
      })
  })
}

function saveAlteredHat(
  modifiedHatBuffer: Buffer,
  authorId: string,
  hat: string,
): Promise<string> {
  log.debug('saving the modified hat image to temp file')
  return new Promise((resolve, reject) => {
    const tempHatPath = path.join(tempDir, `hat_${authorId}_${hat}.png`)
    fs.writeFile(tempHatPath, modifiedHatBuffer, (err) => {
      if (err) {
        reject(err)
      } else {
        resolve(tempHatPath)
      }
    })
  })
}
