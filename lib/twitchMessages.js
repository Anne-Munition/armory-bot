'use strict';
const moment = require('moment');
require('moment-timezone');

module.exports = function TwitchMessages(client) {
  let modChannel;
  if (client.user.id === '120105547633524736') {
    modChannel = client.channels.get('140025699867164673');
  } else {
    modChannel = client.channels.get('252275732628242432');
  }
  const streamInfoSocket = require('socket.io-client')('ws://info.annemunition.tv');
  streamInfoSocket.on('connect', () => {
    client.logger.info('connected to streamInfo websocket');
  });
  streamInfoSocket.on('disconnect', () => {
    client.logger.warn('disconnected from streamInfo websocket');
  });
  streamInfoSocket.on('discord_ban_event', data => {
    if (!data) return;
    if (typeof data !== 'object') return;
    if (Array.isArray(data)) return;
    if (!modChannel) return;
    client.logger.debug('discord_ban_event received');
    let username = data.messages && data.messages[0] ?
      data.messages[0].userstate['display-name'] || data.username :
      data.username;
    if (username.toLowerCase() !== data.username.toLowerCase()) username = data.username;
    const messages = data.messages
      .sort(x => -parseInt(x.userstate['tmi-sent-ts']))
      .map(x => {
        const time = moment(parseInt(x.userstate['tmi-sent-ts']));
        return `\`\`[${time.tz('America/Los_Angeles').format('MM/DD/YY HH:mm:ss')}]\`\` ${x.message}`;
      });
    const embed = new client.Discord.RichEmbed()
      .setTitle(`'${username}' was banned from Twitch Chat`)
      .setColor('DARK_ORANGE')
      .setTimestamp(moment())
      .setDescription(messages.join('\n'));
    if (data.reason) embed.addField('Reason: ', data.reason);
    modChannel.send({ embed }).catch(client.logger.error);
  });


  streamInfoSocket.on('discord_unban_event', username => {
    if (!username) return;
    if (!modChannel) return;
    client.logger.debug('discord_unban_event received');
    const embed = new client.Discord.RichEmbed()
      .setTitle(`'${username}' was un-banned from Twitch Chat`)
      .setColor('DARK_BLUE')
      .setTimestamp(moment());
    modChannel.send({ embed }).catch(client.logger.error);
  });
};
