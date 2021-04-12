const reg = /^.* \|\|.*\|\|$/

module.exports = async function (msg) {
  const channelId = msg.channel.id
  if (channelId !== '148124154602717193' && channelId !== '831018476260032523')
    return

  const attachments = msg.attachments
  const hasUntagged = attachments.filter((x) => !x.spoiler)
  if (hasUntagged.size) {
    await msg.delete()
    await msg.reply("Please 'Mark as spoiler' on all attachments. Thanks!")
    return
  }

  if (attachments.size && !msg.content) {
    await msg.delete()
    await msg.reply('Please add a topic comment to your attachments. Thanks!')
    return
  }

  if (
    (attachments.size && msg.content.length > 50 && !reg.test(msg.content)) ||
    (!attachments.size && !reg.test(msg.content))
  ) {
    await msg.delete()
    await msg.reply('Please use the format: `topic ||spoiler||`. Thanks!')
  }
}
