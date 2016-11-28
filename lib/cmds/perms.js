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
  params = params.map(x => x.toLowerCase());
  // Get first passed parameter - COMMAND
  const cmd = params[0];
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
      if (params.length < 2 || (params[1] && params[1] === 'list')) {
        const obj = {
          cmd: result.cmd,
          perms: result.perms,
        };
        msg.channel.sendCode('json', JSON.stringify(obj, null, 2));
        return;
      }
      // Get next passed parameter - ACTION (allow, deny, remove)
      const action = params[1] ? params[1] : null;
      // Show usage if missing ACTION
      if (action !== 'allow' && action !== 'deny' && action !== 'remove') {
        msg.reply(`\`\`${msg.prefix}perms ${cmd} <allow | deny | remove>\`\``);
        return;
      }
      // Get next passed parameter - TYPE (user, channel, role)
      const type = params[2] ? params[2] : null;
      // Show usage if missing TYPE
      if (type !== 'user' && type !== 'channel' && type !== 'role') {
        msg.reply(`\`\`${msg.prefix}perms ${cmd} ${action} <user | channel | role>\`\``);
        return;
      }
      // Get next passed parameter - TARGET (mention, id, or name)
      const target = params[3] ? params.slice(3).join(' ') : null;
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
  logger.debug(data);
  // Resolve the TARGET to a Discord ID
  targetToId(msg, data)
    .then(id => {
      logger.debug('target to id:', id);
    })
    .catch(err => {
      msg.reply(err);
    });
}

function targetToId(msg, data) {
  return new Promise((resolve, reject) => {
    // Works for ID only or for a mention which has the id inside of it
    const matchId = data.target.match(/(\d+)/);

    if (data.type === 'user') {
      let member;
      // Was the user target a mention
      if (matchId) {
        // Target was a mention, get member to make sure the bot can resolve it
        member = msg.guild.members.get(matchId[1]);
        resolve(member.id);
      } else {
        // Target was not a mention, search names and nicknames
        const userMatches = msg.guild.members.filter(m => m.user.username.toLowerCase() === data.target);
        const nickMatches = msg.guild.members.filter(m => m.nickname.toLowerCase() === data.target);
        const matches = userMatches.concat(nickMatches);
        logger.debug('user matches', matches.size);
        if (matches.size === 0) {
          reject('No matches found.');
          return;
        }
        if (matches.size === 1) {
          resolve(matches.first().id);
          return;
        }
        let str = `Multiple matches found for **${data.target}**\nPlease select a number within 20 seconds...\n`;
        let count = 0;
        matches.forEach(m => {
          count++;
          str += `\n\`\`${count}.\`\` ${m.user.username} #${m.user.discriminator} (${m.nickname || 'No Nickname'})`;
        });
        msg.channel.sendMessage(str)
          .then(matchMessage => {
            const collector = msg.channel.createCollector(
              m => m.author.id === msg.author.id && !isNaN(parseInt(m.content)),
              {
                time: 20000,
                maxMatches: 1,
              });
            collector.on('end', (collected, reason) => {
              if (reason === 'time') {
                matchMessage.delete();
                reject('You took to long to reply.');
                return;
              }
              if (reason === 'matchesLimit') {
                const num = parseInt(collected.first().content);
                if (num < 1 || num > matches.size) {
                  reject('The number you entered is out of range.');
                  return;
                }
                matchMessage.delete();
                collected.first().delete();
                resolve(matches.map(m => m.user.id)[num - 1]);
              }
            });
          })
          .catch(logger.error);
      }
      return;
    } else if (data.type === 'channel') {
      let channel;
      // Was the channel target a mention
      if (matchId) {
        // Target was a mention, get channel to make sure the bot can resolve it
        channel = msg.guild.channels.get(matchId[1]);
        resolve(channel.id);
      } else {
        // Target was not a mention, search channel names
        const matches = msg.guild.channels.filter(c => c.name.toLowerCase() === data.target);
        logger.debug('channel matches', matches.size);
        if (matches.size === 0) {
          reject('No matches found.');
          return;
        }
        if (matches.size === 1) {
          resolve(matches.first().id);
          return;
        }
        let str = `Multiple matches found for **${data.target}**\nPlease select a number within 20 seconds...\n`;
        let count = 0;
        matches.forEach(c => {
          count++;
          str += `\n\`\`${count}.\`\` ${c.name} Position: ${c.position + 1}`;
        });
        msg.channel.sendMessage(str)
          .then(matchMessage => {
            const collector = msg.channel.createCollector(
              m => m.author.id === msg.author.id && !isNaN(parseInt(m.content)),
              {
                time: 20000,
                maxMatches: 1,
              });
            collector.on('end', (collected, reason) => {
              if (reason === 'time') {
                matchMessage.delete();
                reject('You took to long to reply.');
                return;
              }
              if (reason === 'matchesLimit') {
                const num = parseInt(collected.first().content);
                if (num < 1 || num > matches.size) {
                  reject('The number you entered is out of range.');
                  return;
                }
                matchMessage.delete();
                collected.first().delete();
                resolve(matches.map(c => c.id)[num - 1]);
              }
            });
          })
          .catch(logger.error);
      }
      return;
    } else if (data.type === 'role') {
      let role;
      // Was the role target a mention
      if (matchId) {
        // Target was a mention, get role to make sure the bot can resolve it
        role = msg.guild.roles.get(matchId[1]);
        resolve(role.id);
      } else if (data.target === 'everyone') {
        resolve(msg.guild.id);
        return;
      } else {
        // Target was not a mention, search role names
        const matches = msg.guild.roles.filter(r => r.name.toLowerCase() === data.target);
        logger.debug('role matches', matches.size);
        if (matches.size === 0) {
          reject('No matches found.');
          return;
        }
        if (matches.size === 1) {
          resolve(matches.first().id);
          return;
        }
        let str = `Multiple matches found for **${data.target}**\nPlease select a number within 20 seconds...\n`;
        let count = 0;
        matches.forEach(r => {
          count++;
          str += `\n\`\`${count}.\`\` ${r.name} Position: ${r.position + 1}`;
        });
        msg.channel.sendMessage(str)
          .then(matchMessage => {
            const collector = msg.channel.createCollector(
              m => m.author.id === msg.author.id && !isNaN(parseInt(m.content)),
              {
                time: 20000,
                maxMatches: 1,
              });
            collector.on('end', (collected, reason) => {
              if (reason === 'time') {
                matchMessage.delete();
                reject('You took to long to reply.');
                return;
              }
              if (reason === 'matchesLimit') {
                const num = parseInt(collected.first().content);
                if (num < 1 || num > matches.size) {
                  reject('The number you entered is out of range.');
                  return;
                }
                matchMessage.delete();
                collected.first().delete();
                resolve(matches.map(r => r.id)[num - 1]);
              }
            });
          })
          .catch(logger.error);
      }
      return;
    }
    reject(`No Discord '${data.type}' id match found for **${data.target}**`);
  });
}
