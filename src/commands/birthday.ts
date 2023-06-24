import { ApplicationCommandOptionType } from 'discord.js'
import { DateTime } from 'luxon'
import { ids } from '../config'
import Birthday from '../database/services/birthday_service'

const formatMap = {
  'en-us': 'MM/dd',
  'en-gb': 'dd/MM',
}

export const info: CmdInfo = {
  global: false,
  guilds: [ids.armory.guild, ids.dev.guild],
}

export const structure: CmdStructure = {
  name: 'birthday',
  description: 'Add/remove yourself to the birthday announcements.',
  options: [
    {
      name: 'add',
      type: ApplicationCommandOptionType.Subcommand,
      description: 'Add yourself to the birthday announcements.',
      options: [
        {
          name: 'format',
          type: ApplicationCommandOptionType.String,
          description: 'Month',
          required: true,
          choices: [
            { name: formatMap['en-us'].toLowerCase(), value: 'en-us' },
            { name: formatMap['en-gb'].toLowerCase(), value: 'en-gb' },
          ],
        },
        {
          name: 'birthdate',
          type: ApplicationCommandOptionType.String,
          description: 'Your birthdate in the specified format.',
          required: true,
        },
      ],
    },
    {
      name: 'remove',
      type: ApplicationCommandOptionType.Subcommand,
      description: 'Remove yourself from the birthday announcements.',
    },
  ],
}

export const run: ChatCmdRun = async (interaction): Promise<void> => {
  await interaction.deferReply({ ephemeral: true })
  const subCommand = interaction.options.getSubcommand()
  const doc = await Birthday.find(interaction.user.id)
  if (subCommand === 'add') {
    const locale = interaction.options.getString('format', true) as 'en-us' | 'en-gb'
    let birthdate = interaction.options.getString('birthdate', true)
    if (!birthdate.match(/^\d{1,2}[\/\\-]\d{1,2}$/)) {
      await interaction.editReply('Invalid date.')
      return
    }
    birthdate = birthdate
      .split(/[\/\\-]/)
      .map((x) => x.padStart(2, '0'))
      .join('/')

    const enteredDate = DateTime.fromFormat(birthdate, formatMap[locale])
    if (!enteredDate.isValid) {
      await interaction.editReply('Invalid date.')
      return
    }

    if (doc) {
      const docDate = DateTime.fromFormat(doc.birthdate, 'MM/dd')

      if (docDate.valueOf() === enteredDate.valueOf()) {
        if (doc.active) {
          await interaction.editReply(`Your birthday is already announced: \`\`${doc.format}\`\``)
          return
        } else {
          await Birthday.activate(interaction.user.id)
          await interaction.editReply(`Your birthday will now be announced: \`\`${doc.format}\`\``)
          return
        }
      } else {
        if (doc.edits_remaining === 0) {
          await Birthday.deactivate(interaction.user.id)
          await interaction.editReply(
            'You have exceeded the allotted number of birthdate edits. Please DM DBKynd and explain why you needed to alter your birthdate so much.',
          )
          return
        }
        const format = getLocaleDate(enteredDate, locale)
        await Birthday.update(interaction.user.id, enteredDate.toFormat('MM/dd'), format)
        await interaction.editReply(`Your birthday has been updated to: \`\`${format}\`\``)
        return
      }
    } else {
      const format = getLocaleDate(enteredDate, locale)
      await Birthday.add(interaction.user.id, enteredDate.toFormat('MM/dd'), format)
      await interaction.editReply(`Your birthday will now be announced: \`\`${format}\`\``)
      return
    }
  } else if (subCommand === 'remove') {
    if (doc) {
      await Birthday.deactivate(interaction.user.id)
      await interaction.editReply('Your birthday will no longer be announced.')
      return
    } else {
      await interaction.editReply('Your birthday is not currently announced.')
      return
    }
  }
}

function getLocaleDate(date: DateTime, format: 'en-us' | 'en-gb'): string {
  const day = date.toFormat('d')
  const month = date.toFormat('MMMM')
  return format === 'en-us' ? `${month} ${day}` : `${day} ${month}`
}
