'use strict';
exports.info = {
  desc: 'Shuffle sub games queue',
  usage: '',
  aliases: [],
  permissions: ['SEND_MESSAGES'],
  hidden: true,
};

const subGames = require('../subGames');

exports.run = (client, msg) => new Promise((resolve, reject) => {
  // Exit if this command is in cool down
  // Twitch and Discord combined CD
  if (subGames().getCd()) {
    msg.channel.send('This command is in cool down.').then(resolve).catch(reject);
    return;
  }
  // Start cool down
  subGames().startCd();
  // Only allowed in Armory and Test server
  if (msg.guild.id !== '84764735832068096' && msg.guild.id !== '140025699867164673') return;
  // Get the moderators role
  const moderatorRole = msg.guild.roles.find('name', 'Moderators');
  // Exit if no moderators role or unresolvable
  if (!moderatorRole) return;
  // Exit if member is not a moderator, DBKynd, or AnneMunition
  if (!msg.member.roles.has(moderatorRole.id) &&
    msg.author.id !== '84770528526602240' &&
    msg.author.id !== '84761911010267136') return;
  subGames().moveMembers(client, true)
    .then(() => msg.channel.send('The sub queue has been successfully advanced.'),
      () => msg.channel.send('There was an error advancing the sub queue.'))
    .then(resolve)
    .catch(reject);
});
