import * as Discord from 'discord.js';

export const info: CmdInfo = {
  global: true,
};

export const structure: CmdStructure = {
  name: 'ping',
  description: 'Get bot latency and heartbeat.',
};

export const run: ChatCmdRun = async (interaction): Promise<void> => {
  const msg = (await interaction.reply({
    content: 'Ping...',
    fetchReply: true,
  })) as Discord.Message;

  const diff = msg.createdTimestamp - interaction.createdTimestamp;
  await interaction.editReply(
    `Roundtrip Latency: ${diff}ms\nDiscord Heartbeat: ${interaction.client.ws.ping}ms`,
  );
};
