'use strict';
exports.info = {
  desc: 'Manage command permissions for this guild.',
  usage: '',
  aliases: [],
};

const config = require('../../config');
const logger = require('winston');

exports.run = (client, msg, params = []) => {
  if (msg.channel.type === 'dm') {
    msg.reply('Unable to check **perms** from DM channels.');
    return;
  }
  if (params.length === 0) {
    msg.reply(`\`\`${msg.prefix}perms <cmd> [allow | deny | remove]\`\``);
    return;
  }
  // Get permissions action
  const cmd = params[0].toLowerCase();
  logger.debug('perms cmd:', cmd);
  // We don't want to add permissions for commands that do not exits
  if (!client.commands.has(cmd)) {
    msg.reply(`Cannot set or alter permissions for commands that do not exist or are nor loaded. ` +
      `\`\`${msg.prefix}cmds\`\` to see list.`);
    return;
  }
  client.mongo.perms.findOne({ server_id: msg.guild.id, cmd: cmd })
    .then(result => {
      // If there is no result, make a new, blank permission
      if (!result) {
        result = client.mongo.perms({
          server_id: msg.guild.id,
          cmd,
        });
      }
      // If no action set or action is list, show list even if plank perm that is not saved yet
      if (params.length < 2 || (params[1] && params[1].toLowerCase() === 'list')) {
        const obj = {
          cmd: result.cmd,
          perms: result.perms,
        };
        msg.channel.sendCode('json', JSON.stringify(obj, null, 2));
        return;
      }
      // Get next passed parameter - ACTION (allow, deny, remove)
      const action = params[1] ? params[1].toLowerCase() : null;
      // Show usage if missing ACTION
      if (action !== 'allow' && action !== 'deny' && action !== 'remove') {
        msg.reply(`\`\`${msg.prefix}perms ${cmd} <allow | deny | remove>\`\``);
        return;
      }
      // Get next passed parameter - TYPE (user, channel, role)
      const type = params[2] ? params[2].toLowerCase() : null;
      // Show usage if missing TYPE
      if (type !== 'user' && type !== 'channel' && type !== 'role') {
        msg.reply(`\`\`${msg.prefix}perms ${cmd} ${action} <user | channel | role>\`\``);
        return;
      }
      // Get next passed parameter - TARGET (mention, id, or name)
      const target = params[3] || null;
      if (!target) {
        msg.reply(`\`\`${config.commands.prefix}perms ${cmd} ${action} ${type} <target>\`\``);
        return;
      }
      processCommand(msg, { cmd, action, type, target });
    })
    .catch(err => {
      logger.error('Error getting perms from mongoDB', cmd, err);
      msg.reply(`Error getting permissions for '${cmd}'.`);
    });
};

function processCommand(msg, data) {
  // Resolve the TARGET to a Discord ID
  targetToId(msg, data, id => {
    logger.debug('target to id:', id);
    if (!id) {
      msg.reply(`Unable to resolve ${data.type} '${data.target}' to a Discord ID.`);
    }
    msg.reply(id);
  });
}

function targetToId(msg, data, callback) {
  // Works for ID only or for a mention which has the id inside of it
  const matchId = data.target.match(/(\d+)/);

  if (data.type === 'user') {
    let member;
    // Was the user target a mention
    if (matchId) {
      // Target was a mention, get member to make sure the bot can resolve it.
      member = msg.guild.members.get(matchId[1]);
      // If the id passed was a member id (non mention) pass it back
      if (member) {
        callback(member.id);
        return;
      }
    }
  }

  if (data.type === 'channel') {
    let channel;
    // Was the channel target a mention
    if (matchId) {
      // Target was a mention, get channel to make sure the bot can resolve it.
      channel = msg.guild.channels.get(matchId[1]);
      // If the id passed was a channel id (non mention) pass it back
      if (channel) {
        callback(channel.id);
        return;
      }
    }
  }

  if (data.type === 'role') {
    // If target is @everyone, set the target to the guild id as it's the same at the everyone role id
    if (data.target.toLowerCase().replace('@', '') === 'everyone') {
      callback(msg.guild.id);
      return;
    }
    let role;
    // Was the role target a mention
    if (matchId) {
      // Target was a mention, get role to make sure the bot can resolve it.
      role = msg.guild.roles.get(matchId[1]);
      // If the id passed was a role id (non mention) pass it back
      if (role) {
        callback(role.id);
        return;
      }
    }
  }
}

/*function waitForConfirmation(msg, list = [], callback) {
  msg.channel.sendMessage('Please select from one of the following. Times out in 15 seconds...')
    .then(m => {
      msg.channel.sendMessage(list.join('\n'));
      const collector = msg.channel.createCollector(mc => mc.author === msg.author, {
        time: 15000,
      });
      collector.on('message', message => {
        const num = parseInt(message.content);
        if (!isNaN(num) && num >= 1 && num <= 5) {
          collector.stop(`success${num}`);
        }
      });
      collector.on('end', (collected, reason) => {
        if (reason === 'time') {
          m.edit('The prompt timed out.');
          callback(null);
          return;
        }
        if (reason.startsWith('success')) {
          const num = reason.lastIndex;
          logger.debug('selection:', num);
          m.edit(num);
          callback(matches[num].id);
          return;
        }
        callback();
        return;
      });
    })
    .catch(() => {
      callback();
      return;
    });
}*/


/*


 st allowIndex = result.perms.allow[`${type}s`].indexOf(id);
 const denyIndex = result.perms.deny[`${type}s`].indexOf(id);

 function removeIndexes() {
 if (allowIndex > -1) {
 result.perms.allow[`${type}s`].splice(allowIndex, 1);
 }
 if (denyIndex > -1) {
 result.perms.deny[`${type}s`].splice(denyIndex, 1);
 }
 }

 if (action === 'remove') {
 logger.debug('remove', allowIndex, denyIndex);
 if (allowIndex === -1 && denyIndex === -1) {
 msg.reply('The permission did not exist.');
 return;
 }
 removeIndexes();
 save(err => {
 if (err) {
 msg.reply('Error removing permission.');
 } else {
 msg.reply('Permission removed.');
 }
 });
 return;
 }

 if (result.perms[action][`${type}s`].indexOf(id) === -1) {
 removeIndexes();
 result.perms[action][`${type}s`].push(id);
 save(err => {
 if (err) {
 msg.reply('Error adding permission.');
 } else {
 msg.reply('Permission added.');
 }
 });
 } else {
 msg.reply('This permission already exists.');
 }
 /*/

/*function save(model) {
 return new Promise((resolve, reject) => {
 model.save()
 .then(resolve)
 .catch(reject);
 });
 }*/

/**/
