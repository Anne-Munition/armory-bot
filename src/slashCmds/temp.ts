import tuc from 'temp-units-conv'

export const info: SlashInfo = {
  global: true,
}

export const commandData: SlashData = {
  name: 'temp',
  defaultPermission: true,
  description: 'Convert a temperature.',
  options: [
    {
      name: 'degrees',
      type: 'NUMBER',
      description: 'Temperature value to convert',
      required: true,
    },
    {
      name: 'from',
      type: 'STRING',
      description: 'Temperature unit to convert FROM.',
      required: true,
      choices: [
        {
          name: 'Celsius',
          value: 'c',
        },
        {
          name: 'Fahrenheit',
          value: 'f',
        },
        {
          name: 'Kelvin',
          value: 'k',
        },
      ],
    },
    {
      name: 'to',
      type: 'STRING',
      description: 'Temperature unit to convert TO.',
      required: true,
      choices: [
        {
          name: 'Celsius',
          value: 'c',
        },
        {
          name: 'Fahrenheit',
          value: 'f',
        },
        {
          name: 'Kelvin',
          value: 'k',
        },
      ],
    },
  ],
}

export const run: SlashRun = async (interaction): Promise<void> => {
  const degrees = interaction.options.getNumber('degrees', true)
  const from = interaction.options.getString('from', true)
  const to = interaction.options.getString('to', true)

  const converted = tuc[`${from}2${to}`](degrees)
  const trimmed = Math.floor(converted * 10) / 10

  await interaction.reply(
    `${degrees}*${from.toUpperCase()}* => **${trimmed}*${to.toUpperCase()}***`,
  )
}
