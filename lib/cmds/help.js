'use strict';
exports.info = {
  desc: 'Show base usage for a command.',
  usage: '<command>',
  aliases: [],
  permissions: ['SEND_MESSAGES'],
};

exports.run = (client, msg, params = []) => new Promise((resolve, reject) => {
  // Show usage if no params were passed
  if (params.length === 0) {
    client.utils.usage(msg, exports.info).then(resolve).catch(reject);
    return;
  }
  // Lowercase all params
  params = params.map(p => p.toLowerCase());
  // Extract the cmd the user wants help about
  const cmd = params[0];
  // Get command from command collection
  const command = client.commands.get(cmd);
  // Error if command not found
  if (!command) {
    msg.reply(`**${cmd}** is not a registered command.`).then(resolve).catch(reject);
    return;
  }
  // If there are no arguments needed for the command simply say that
  if (!command.info.usage || command.info.usage === '') {
    msg.reply(`\`\`${msg.prefix}${cmd}\`\` does not need any additional arguments to run.`)
      .then(resolve).catch(reject);
    return;
  }
  // Otherwise fake the usage cmd with the extracted cmd name from above
  // so the user gets usage about that command and not this one
  msg.cmd = cmd;
  client.utils.usage(msg, command.info).then(resolve).catch(reject);
});
