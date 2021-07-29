export const info: CmdInfo = {
  desc: 'Post a link for people to join this bot to their own Discord server.',
  usage: '',
  aliases: [],
  permissions: ['SEND_MESSAGES'],
  dmAllowed: true,
  paramsRequired: false,
}

export const run: Run = async function (msg): Promise<void> {
  if (!msg.client.user) return
  await msg.channel.send(
    `Follow this link to add **${msg.client.user.username}** to your Discord server:\n<https://discord.com/oauth2/authorize?&client_id=${msg.client?.application?.id}&scope=bot%20applications.commands>`,
  )
}
