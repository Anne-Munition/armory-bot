'use strict';
exports.info = {
  desc: 'Show base usage for a command.',
  usage: '<command>',
  aliases: [],
  permissions: ['SEND_MESSAGES'],
};

exports.run = (client, msg, params = []) => new Promise((resolve, reject) => {
  if (params.length === 0) {
    client.utils.usage(msg, exports.info).then(resolve).catch(reject);
    return;
  }
  params = params.map(p => p.toLowerCase());
  const cmd = params[0];
  const command = client.commands.get(cmd);
  if (!command) {
    msg.reply(`**${cmd}** is not a registered command.`).then(resolve).catch(reject);
    return;
  }
  if (!command.info.usage || command.info.usage === '') {
    msg.reply(`\`\`${msg.prefix}${cmd}\`\` does not need any additional arguments to run.`)
      .then(resolve).catch(reject);
    return;
  }
  msg.cmd = cmd;
  client.utils.usage(msg, command.info).then(resolve).catch(reject);
});
