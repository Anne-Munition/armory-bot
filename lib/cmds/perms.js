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
      if (params.length < 2 || (params[1] && params[1] === 'id')) {
        const obj = {
          cmd: result.cmd,
          perms: result.perms,
        };

        if (!params[1] && params[1] !== 'id') {
          obj.perms.allow.members = obj.perms.allow.members.map(m => msg.guild.members.get(m).user.username);
          obj.perms.allow.channels = obj.perms.allow.channels.map(c => msg.guild.channels.get(c).name);
          obj.perms.allow.roles = obj.perms.allow.roles.map(r => msg.guild.roles.get(r).name);
          obj.perms.deny.members = obj.perms.deny.members.map(m => msg.guild.members.get(m).user.username);
          obj.perms.deny.channels = obj.perms.deny.channels.map(c => msg.guild.channels.get(c).name);
          obj.perms.deny.roles = obj.perms.deny.roles.map(r => msg.guild.roles.get(r).name);
        }

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
      if (type !== 'member' && type !== 'channel' && type !== 'role') {
        msg.reply(`\`\`${msg.prefix}perms ${cmd} ${action} <member | channel | role>\`\``);
        return;
      }
      // Get next passed parameter - TARGET (mention, id, or name)
      const target = params[3] ? params.slice(3).join(' ') : null;
      if (!target) {
        msg.reply(`\`\`${config.commands.prefix}perms ${cmd} ${action} ${type} <target>\`\``);
        return;
      }
      processCommand(client, msg, { cmd, action, type, target });
    })
    .catch(err => {
      logger.error('Error getting perms from mongoDB', cmd, err);
      msg.reply(`Error getting permissions for '${cmd}'.`);
    });
};

function processCommand(client, msg, data) {
  logger.debug(data);
  // Resolve the TARGET to a Discord ID
  targetToId(msg, data)
    .then(id => {
      logger.debug('target to id:', id);
      data.id = id;
      return alterDbEntry(client, msg, data);
    })
    .then(() => {
      msg.reply('The permissions operation completed successfully.');
    })
    .catch(err => {
      if (err.discordReply) {
        msg.reply(err.discordReply);
      } else if (err) {
        logger.error(err);
        msg.reply('There was an error performing this operation. Please try again.');
      }
    });
}

function targetToId(msg, data) {
  return new Promise((resolve, reject) => {
    // Works for ID only or for a mention which has the id inside of it
    const matchId = data.target.match(/(\d+)/);

    if (data.type === 'member') {
      let member;
      // Was the user target a mention
      if (matchId) {
        // Target was a mention, get member to make sure the bot can resolve it
        member = msg.guild.members.get(matchId[1]);
        resolve(member.id);
      } else {
        // Target was not a mention, search names and nicknames
        const userMatches = msg.guild.members.filter(m => m.user.username.toLowerCase() === data.target);
        const nickMatches = msg.guild.members.filter(m => m.nickname && m.nickname.toLowerCase() === data.target);
        const matches = userMatches.concat(nickMatches);
        logger.debug('user matches', matches.size);
        if (matches.size === 0) {
          reject({ discordReply: 'No matches found.' });
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
                reject({ discordReply: 'You took to long to reply.' });
                return;
              }
              if (reason === 'matchesLimit') {
                const num = parseInt(collected.first().content);
                if (num < 1 || num > matches.size) {
                  reject({ discordReply: 'The number you entered is out of range.' });
                  return;
                }
                matchMessage.delete();
                collected.first().delete();
                resolve(matches.map(m => m.user.id)[num - 1]);
              }
            });
          })
          .catch(reject);
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
          reject({ discordReply: 'No matches found.' });
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
                reject({ discordReply: 'You took to long to reply.' });
                return;
              }
              if (reason === 'matchesLimit') {
                const num = parseInt(collected.first().content);
                if (num < 1 || num > matches.size) {
                  reject({ discordReply: 'The number you entered is out of range.' });
                  return;
                }
                matchMessage.delete();
                collected.first().delete();
                resolve(matches.map(c => c.id)[num - 1]);
              }
            });
          })
          .catch(reject);
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
          reject({ discordReply: 'No matches found.' });
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
                reject({ discordReply: 'You took to long to reply.' });
                return;
              }
              if (reason === 'matchesLimit') {
                const num = parseInt(collected.first().content);
                if (num < 1 || num > matches.size) {
                  reject({ discordReply: 'The number you entered is out of range.' });
                  return;
                }
                matchMessage.delete();
                collected.first().delete();
                resolve(matches.map(r => r.id)[num - 1]);
              }
            });
          })
          .catch(reject);
      }
      return;
    }
    reject({ discordReply: `No Discord '${data.type}' id match found for **${data.target}**` });
  });
}

function alterDbEntry(client, msg, data) {
  return new Promise((resolve, reject) => {
    data.type = `${data.type}s`;
    client.mongo.perms.findOne({
      server_id: msg.guild.id,
      cmd: data.cmd,
    })
      .then(result => {
        if (!result) {
          // There are no permissions set yet, make a new entry
          result = client.mongo.perms({
            server_id: msg.guild.id,
            cmd: data.cmd,
          });
        }
        const allowI = result.perms.allow[data.type].indexOf(data.id);
        const denyI = result.perms.deny[data.type].indexOf(data.id);
        if (allowI > -1) {
          result.perms.allow[data.type].splice(allowI, 1);
        }
        if (denyI > -1) {
          result.perms.deny[data.type].splice(denyI, 1);
        }
        if (data.action !== 'remove') {
          result.perms[data.action][data.type].push(data.id);
        }
        result.save()
          .then(resolve)
          .catch(logger.error);
      })
      .catch(err => {
        if (err) {
          logger.error(err);
        }
        reject();
      });
  });
}
