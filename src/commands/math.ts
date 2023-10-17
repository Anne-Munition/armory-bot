import { ApplicationCommandOptionType } from 'discord.js';
import * as math from 'mathjs';
import logger from '../logger';

export const info: CmdInfo = {
  global: true,
};

export const structure: CmdStructure = {
  name: 'math',
  description: 'Evaluate an expression using mathjs.',
  options: [
    {
      name: 'expression',
      type: ApplicationCommandOptionType.String,
      description: 'Expression to evaluate.',
      required: true,
    },
  ],
};

export const run: ChatCmdRun = async (interaction): Promise<void> => {
  const expression = interaction.options.getString('expression', true);
  logger.debug(expression);

  let parsed, result;

  try {
    parsed = math.parse(expression);
    result = math.evaluate(expression);
    await interaction.reply(`${parsed} = **${result}**`);
  } catch (err) {
    if (err instanceof Error) {
      await interaction.reply({
        content: err.message,
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: 'Mathjs Error',
        ephemeral: true,
      });
    }
  }
};
