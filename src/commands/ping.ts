export const info: CmdInfo = {
  global: true,
};

export const structure: CmdStructure = {
  name: 'ping',
  description: 'Get bot latency and heartbeat.',
};

export const run: ChatCmdRun = async (interaction): Promise<void> => {
  const response = await interaction.reply({ content: 'Ping...', withResponse: true });
  const msg = response.resource?.message;
  if (!msg) throw new Error('Unable to get the ping reply message.');

  const diff = msg.createdTimestamp - interaction.createdTimestamp;
  await interaction.editReply(
    `Roundtrip Latency: ${diff}ms\nDiscord Heartbeat: ${interaction.client.ws.ping}ms`,
  );
};
