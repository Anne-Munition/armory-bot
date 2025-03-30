import { ids } from '../config.js';
import logger from '../logger.js';
import { getRandomDecimals, ignore } from '../utilities.js';

export const info: CmdInfo = {
  global: false,
  guilds: [ids.armory.guild, ids.dev.guild],
};

export const structure: CmdStructure = {
  name: 'bed',
  description: 'Chance going to bed.',
};

const randoms: number[] = [];

function getDecimals() {
  getRandomDecimals(20)
    .then((numbers) => {
      logger.debug(`Got random decimals for bed command: ${numbers}`);
      randoms.push(...numbers);
    })
    .catch(ignore);
}

getDecimals();

export const run: ChatCmdRun = async (interaction): Promise<void> => {
  const number = randoms.shift() || Math.random();
  if (randoms.length <= 5) getDecimals();
  logger.info(
    `Bed command used by ${interaction.user.tag} (${interaction.user.id}) - Random Number: ${number}, must be less than or equal to 0.002 (1/500) for a win.`,
  );

  const odds = 1 / 500;
  const isWinner = number <= odds;
  if (isWinner) {
    await interaction.reply('You know what... Yes!');
    if (process.env.OWNER_ID !== undefined) {
      const owner = await interaction.client.users.fetch(process.env.OWNER_ID);
      if (owner) {
        const user = interaction.user.toString();
        const guild = interaction.guild?.name;
        const channel = interaction.channel?.toString();
        await owner.send(`Bed Winner! - ${user} - ${guild} - ${channel}`);
      }
    }
  } else {
    await interaction.reply('No');
  }
};
