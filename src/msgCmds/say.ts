export const info: CmdInfo = {
  desc: "Show latency with a 'Pong!' message.",
  usage: '',
  aliases: [],
  hidden: true,
  permissions: ['SEND_MESSAGES'],
  dmAllowed: true,
  paramsRequired: false,
}
// paramsRequired set to false even though we use params so we don't send a usage message

export const run: Run = async function (msg, params): Promise<void> {
  const promiseArray = []
  if (msg.deletable) promiseArray.push(msg.delete())
  if (params.length !== 0) promiseArray.push(msg.channel.send(params.join(' ')))
  await Promise.all(promiseArray)
}
