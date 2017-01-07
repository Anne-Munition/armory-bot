'use strict';
exports.info = {
  desc: 'Manage posting welcome/part messages to channels.',
  usage: '<add | remove | list>',
  aliases: [],
};

// <add | remove | list> channels to post join / part messages to
exports.run = (client, msg, params = []) => new Promise(async(resolve, reject) => {
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
    // Get list of all welcome messages for the msg guild only
    let channels;
    try {
      channels = await client.mongo.welcomeChannels.find(search);
    } catch (err) {
      client.logger.error('Error getting welcome channels from mongoDB', err);
      reject(err);
      return;
    }
    client.logger.debug('welcome channels list', channels.length);
    let str = 'Welcome messages are posted in channel(s):\n\n';
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
        if (!guilds.hasOwnProperty(guild)) break;
        const g = client.guilds.get(guild);
        if (!g) break;
        names = guilds[guild].map(c => msg.guild.channels.get(c))
          .filter(x => x)
          .sort((a, b) => a.position - b.position)
          .map(x => x.name);
        if (names.length > 0) {
          str += `**${g.name}:**\n`;
          str += names.join('\n');
        }
      }
      if (names.length === 0) {
        msg.channel.sendMessage('No channels currently post a welcome message.')
          .then(resolve).catch(reject);
        return;
      }
      msg.channel.sendMessage(str).then(resolve).catch(reject);
      return;
    } else {
      names = channels.map(c => msg.guild.channels.get(c.channel_id))
        .filter(x => x)
        .sort((a, b) => a.position - b.position)
        .map(x => x.toString());
    }
    if (names.length === 0) {
      msg.channel.sendMessage('No channels on this server currently post a welcome message.')
        .then(resolve).catch(reject);
      return;
    }
    str += names.join('\n');
    msg.channel.sendMessage(str).then(resolve).catch(reject);
  } else if (params[0] === 'add' || params[0] === 'remove') {
    // Search database for existing entry
    let channels;
    try {
      channels = await client.mongo.welcomeChannels.find({ channel_id: msg.channel.id });
    } catch (err) {
      client.logger.error('Error getting welcome channels from mongoDB', err);
      msg.channel.sendMessage('There was a database error. Please try again.');
      reject(err);
      return;
    }
    client.logger.debug('welcome channels add/remove', channels.length);
    switch (params[0]) {
      case 'add':
        addChannel(client, msg, channels).then(resolve).catch(reject);
        break;
      case 'remove':
        removeChannel(client, msg, channels).then(resolve).catch(reject);
        break;
      default:
        client.utils.usage(msg, exports.info).then(resolve).catch(reject);
        break;
    }
  }
});

function addChannel(client, msg, channels) {
  return new Promise((resolve, reject) => {
    if (channels.length === 0) {
      const entry = client.mongo.welcomeChannels({
        server_id: msg.guild.id,
        channel_id: msg.channel.id,
      });
      entry.save()
        .then(() => {
          msg.channel.sendMessage('This channel will now post welcome messages.')
            .then(resolve).catch(reject);
        })
        .catch(err => {
          client.logger.error('Error Saving welcome channel to the mongoDB', err);
          msg.channel.sendMessage('There was a database error. Please try again.');
          reject(err);
        });
    } else {
      msg.channel.sendMessage('This channel already posts welcome messages.')
        .then(resolve).catch(reject);
    }
  });
}

function removeChannel(client, msg, channels) {
  return new Promise(async(resolve, reject) => {
    if (channels.length === 0) {
      msg.channel.sendMessage('This channel doesn\'t currently post welcome messages.')
        .then(resolve).catch(reject);
      return;
    }
    try {
      await client.mongo.welcomeChannels.remove({ _id: channels[0]._id });
    } catch (err) {
      client.logger.error('Error removing welcome channel from the mongoDB', err);
      msg.channel.sendMessage('There was a database error. Please try again.');
      reject(err);
      return;
    }
    msg.channel.sendMessage('This channel will no longer post welcome messages.')
      .then(resolve).catch(reject);
  });
}
