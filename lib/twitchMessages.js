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
  streamInfoSocket.on('discord_ban_event', async data => {
    client.logger.debug(data);
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
    const embed = new client.Discord.RichEmbed()
      .setAuthor(data.banee, await client.twitch.getUserLogo(data.banee_id))
      .setColor('DARK_ORANGE')
      .setDescription(messages.join('\n'))
      .setFooter(`Banned by ${data.banear}`)
      .setTimestamp(moment(data.time));
    if (data.reason) embed.addField('Ban Reason:', data.reason);
    modChannel.send({ embed }).catch(client.logger.error);
  });


  streamInfoSocket.on('discord_unban_event', async data => {
    client.logger.debug(data);
    if (!data) return;
    if (typeof data !== 'object') return;
    if (Array.isArray(data)) return;
    if (!modChannel) return;
    client.logger.debug('discord_unban_event received');
    const embed = new client.Discord.RichEmbed()
      .setAuthor(data.banee, await client.twitch.getUserLogo(data.banee_id))
      .setColor('DARK_BLUE')
      .setFooter(`Unbanned by ${data.banear}`)
      .setTimestamp(moment(data.time));
    modChannel.send({ embed }).catch(client.logger.error);
  });
};
