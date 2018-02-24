'use strict';
const moment = require('moment');
require('moment-timezone');

module.exports = function TwitchMessages(client) {
  const modChannel = client.channels.get('252275732628242432') || client.channels.get('373924698075037706');
  if (!modChannel) {
    client.utils.ownerError('twitchMessages', client, 'Unable to find Mod Channel');
    return;
  }
  const streamInfoSocket = require('socket.io-client')('wss://info.annemunition.tv');
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
    const embed = new client.Discord.MessageEmbed()
      .setAuthor(`${data.banee} (${data.banee_id})`, await client.twitch.getUserLogo(data.banee_id),
        `https://www.twitch.tv/${data.banee.toLowerCase()}`)
      .setColor('DARK_ORANGE')
      .setDescription(messages.join('\n'))
      .setFooter(`Banned by ${data.banear}`)
      .setTimestamp(new Date(data.time));
    if (data.reason) embed.addField('Ban Reason:', data.reason);
    if (!['SEND_MESSAGES', 'EMBED_LINKS'].every(perm => modChannel.permissionsFor(client.user).has(perm))) {
      client.utils.ownerError('twitchMessages', client, 'Missing Channel Permissions');
      return;
    }
    modChannel.send({ embed })
      .catch(err => {
        client.utils.ownerError('twitchMessages', client, err);
      });
  });

  streamInfoSocket.on('discord_unban_event', async data => {
    client.logger.debug(data);
    if (!data) return;
    if (typeof data !== 'object') return;
    if (Array.isArray(data)) return;
    if (!modChannel) return;
    client.logger.debug('discord_unban_event received');
    const embed = new client.Discord.MessageEmbed()
      .setAuthor(`${data.banee} (${data.banee_id})`, await client.twitch.getUserLogo(data.banee_id),
        `https://www.twitch.tv/${data.banee.toLowerCase()}`)
      .setColor('DARK_BLUE')
      .setFooter(`Unbanned by ${data.banear}`)
      .setTimestamp(new Date(data.time));
    if (!['SEND_MESSAGES', 'EMBED_LINKS'].every(perm => modChannel.permissionsFor(client.user).has(perm))) {
      client.utils.ownerError('twitchMessages', client, 'Missing Channel Permissions');
      return;
    }
    modChannel.send({ embed })
      .catch(err => {
        client.utils.ownerError('twitchMessages', client, err);
      });
  });

  streamInfoSocket.on('discord_report_ban', async data => {
    client.logger.debug(data);
    if (!data) return;
    if (typeof data !== 'object') return;
    if (Array.isArray(data)) return;
    if (!modChannel) return;
    client.logger.debug('discord_report_ban received');
    const duration = moment.duration(moment(data.created_at).valueOf() - Date.now());
    const embed = new client.Discord.MessageEmbed()
      .setAuthor(`${data.username} (${data.data.id})`, await
          client.twitch.getUserLogo(data.data.id),
        `https://www.twitch.tv/${data.username.toLowerCase()}`
      )
      .setColor('PURPLE')
      .setDescription(`Count: ${data.count}\nResponse Time: **${duration.humanize()}**`)
      .setFooter('Banned by Twitch')
      .setTimestamp(new Date(data.time));
    if (!['SEND_MESSAGES', 'EMBED_LINKS'].every(perm => modChannel.permissionsFor(client.user).has(perm))) {
      client.utils.ownerError('twitchMessages', client, 'Missing Channel Permissions');
      return;
    }
    modChannel.send({ embed })
      .catch(err => {
        client.utils.ownerError('twitchMessages', client, err);
      });
  });
};
