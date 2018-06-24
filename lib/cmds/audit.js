'use strict';
exports.info = {
  desc: 'Manage posting audit messages to channels.',
  usage: '<add | remove | list>',
  aliases: [],
  hidden: true,
  permissions: ['SEND_MESSAGES'],
};

// <add | remove | list> channels to post join / part messages to
exports.run = (client, msg, params = []) => new Promise(async (resolve, reject) => {
  if (msg.channel.type === 'dm') {
    client.utils.dmDenied(msg).then(resolve).catch(reject);
    return;
  }
  if (params.length === 0) {
    client.utils.usage(msg, exports.info).then(resolve).catch(reject);
    return;
  }
  // Lowercase all the parameters
  params = params.map(p => p.toLowerCase());

  if (params[0] === 'list') {
    let owner = false;
    if (msg.author.id === client.config.owner_id) owner = true;
    const search = owner ? {} : { server_id: msg.guild.id };
    // Get list of all audit messages for the msg guild only
    let channels;
    try {
      channels = await client.mongo.auditChannels.find(search);
    } catch (err) {
      client.logger.error('Error getting audit channel data from mongoDB', err);
      reject(err);
      return;
    }
    client.logger.debug('audit channels list', channels.length);
    let str = 'Audit messages are posted in channel(s):\n\n';
    let names = [];
    if (owner && params[1] === 'all') {
      const guilds = {};
      channels.forEach(c => {
        if (guilds[c.server_id]) {
          guilds[c.server_id].push(c.channel_id);
        } else {
          guilds[c.server_id] = [c.channel_id];
        }
      });
      for (const guild in guilds) {
        if (guilds.hasOwnProperty(guild)) {
          const g = client.guilds.get(guild);
          if (g) { // eslint-disable-line max-depth
            names = guilds[guild].map(c => msg.guild.channels.get(c))
              .filter(x => x)
              .sort((a, b) => a.position - b.position)
              .map(x => x.name);
            if (names.length > 0) { // eslint-disable-line max-depth
              str += `**${g.name}:**\n`;
              str += names.join('\n');
            }
          }
        }
      }
      if (names.length === 0) {
        msg.channel.send('No channels currently post audit messages.')
          .then(resolve).catch(reject);
        return;
      }
      msg.channel.send(str).then(resolve).catch(reject);
      return;
    } else {
      names = channels.map(c => msg.guild.channels.get(c.channel_id))
        .filter(x => x)
        .sort((a, b) => a.position - b.position)
        .map(x => x.toString());
    }
    if (names.length === 0) {
      msg.channel.send('No channels on this server currently post audit messages.')
        .then(resolve).catch(reject);
      return;
    }
    str += names.join('\n');
    msg.channel.send(str).then(resolve).catch(reject);
  } else if (params[0] === 'add' || params[0] === 'remove') {
    // Search database for existing entry
    let channel;
    try {
      channel = await client.mongo.auditChannels.findOne({ channel_id: msg.channel.id });
    } catch (err) {
      client.logger.error('Error getting audit channel data from mongoDB', err);
      msg.channel.send('There was a database error. Please try again.');
      reject(err);
      return;
    }
    client.logger.debug('audit channels add/remove');
    switch (params[0]) {
      case 'add':
        addChannel(client, msg, channel).then(resolve).catch(reject);
        break;
      case 'remove':
        removeChannel(client, msg, channel).then(resolve).catch(reject);
        break;
      default:
        client.utils.usage(msg, exports.info).then(resolve).catch(reject);
        break;
    }
  }
});

function addChannel(client, msg, channel) {
  return new Promise((resolve, reject) => {
    if (!channel) {
      const entry = client.mongo.auditChannels({
        server_id: msg.guild.id,
        channel_id: msg.channel.id,
      });
      entry.save()
        .then(() => {
          msg.channel.send('This channel will now post audit messages.')
            .then(resolve).catch(reject);
        })
        .catch(err => {
          client.logger.error('Error saving audit channel to the mongoDB', err);
          msg.channel.send('There was a database error. Please try again.');
          reject(err);
        });
    } else {
      msg.channel.send('This channel already posts audit messages.')
        .then(resolve).catch(reject);
    }
  });
}

function removeChannel(client, msg, channel) {
  return new Promise(async (resolve, reject) => {
    if (!channel) {
      msg.channel.send('This channel doesn\'t currently post audit messages.')
        .then(resolve).catch(reject);
      return;
    }
    try {
      await client.mongo.auditChannels.remove({ _id: channel._id });
    } catch (err) {
      client.logger.error('Error removing audit channel from the mongoDB', err);
      msg.channel.send('There was a database error. Please try again.');
      reject(err);
      return;
    }
    msg.channel.send('This channel will no longer post audit messages.')
      .then(resolve).catch(reject);
  });
}
