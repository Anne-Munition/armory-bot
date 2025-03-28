import axios from 'axios';

export const info: CmdInfo = {
  global: true,
};

export const structure: CmdStructure = {
  name: 'fact',
  description: 'Post a random fact.',
};

export const run: ChatCmdRun = async (interaction): Promise<void> => {
  await interaction.deferReply();
  const { data } = await axios.get('https://uselessfacts.jsph.pl/api/v2/facts/random');
  const { text: fact } = data;
  const becky1 = interaction.client.emojis.cache.find((x) => x.name === 'becky1');
  await interaction.editReply(`${fact} ${becky1 || ''}`);
};
