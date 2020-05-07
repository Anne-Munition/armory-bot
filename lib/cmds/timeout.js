'use strict';
const moment = require('moment');
const timeouts = require('../timeouts');
const { timeouts: TimeoutModel } = require('../mongo');

exports.info = {
  desc: 'Add a timeout to a user, giving them the Muted Role',
  usage: '<id> <minutes>',
  aliases: [],
  hidden: true,
  permissions: [],
};


exports.run = (client, msg, params = []) => new Promise(async (resolve, reject) => {
  // command not allowed in DMs
  if (msg.channel.type === 'dm') {
    client.utils.dmDenied(msg).then(resolve).catch(reject);
    return;
  }
  // delete any timeout command messages posted in ANY channel
  msg.delete();
  // allow command only from #mod-logs
  // this means only moderators can run this command
  // so no need to role check
  if (msg.channel.id !== '252275732628242432') return;
  // return usage if not enough parameters are passed
  if (params.length < 2) {
    client.utils.usage(msg, exports.info).then(resolve).catch(reject);
    return;
  }
  // extract the target id and the timeout duration
  const { targetId, duration } = params;
  // get the target user
  const target = msg.guild.members.get(targetId);
  // tell the author if the target is not found
  if (!target) {
    msg.channel.sendMessage('Nobody with that ID was found. Are you sure it is correct?').then(resolve).catch(reject);
    return;
  }
  let minutes;
  // make sure the duration is an int
  try {
    minutes = parseInt(duration);
  } catch (e) {
    // tell the author if the duration is malformed
    msg.channel.sendMessage('The duration must be a whole number.').then(resolve).catch(reject);
    return;
  }
  // give the muted role to the target user
  target.addRole('706906565784895509').then(() => {
    // notify the author that the role has been added
    const targetString = `${target.user.username}#${target.user.discriminator} (${target.user.id})`;
    msg.channel.sendMessage(`**${targetString}** has been timed out for **${minutes}** minute(s) by ${msg.author.username}`);
    // start the timer to remove the role later
    timeouts.startTimeout(target.id, 1000 * 60 * minutes);
    // create the database entry
    const entry = new TimeoutModel({
      discordId: targetId,
      expiresAt: moment().add(minutes, 'minutes'),
      username: targetString,
    });
    // save the entry to the database
    entry.save();
  }).catch(reject);
});
