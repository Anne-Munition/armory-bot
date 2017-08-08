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
    const messages = data.messages
      .sort(x => -parseInt(x.userstate['tmi-sent-ts']))
      .map(x => {
        const time = moment(parseInt(x.userstate['tmi-sent-ts']));
        return `\`\`[${time.tz('America/Los_Angeles').format('MM/DD/YY HH:mm:ss')}]\`\` ${x.message}`;
      });
    let title = `'${data.banee}' was banned from Twitch Chat by '${data.banear}'`;
    if (data.reason) title += ` for: '${data.reason}'`;
    const embed = new client.Discord.RichEmbed()
      .setTitle(title)
      .setColor('DARK_ORANGE')
      .setTimestamp(moment(data.time))
      .setDescription(messages.join('\n'));
    modChannel.send({ embed }).catch(client.logger.error);
  });


  streamInfoSocket.on('discord_unban_event', data => {
    if (!data) return;
    if (typeof data !== 'object') return;
    if (Array.isArray(data)) return;
    if (!modChannel) return;
    client.logger.debug('discord_unban_event received');
    const embed = new client.Discord.RichEmbed()
      .setTitle(`'${data.banee}' was un-banned from Twitch Chat by '${data.banear}'`)
      .setColor('DARK_BLUE')
      .setTimestamp(moment(data.time));
    modChannel.send({ embed }).catch(client.logger.error);
  });
};
