'use strict';
exports.info = {
  desc: 'Manage command permissions on this guild.',
  usage: '',
  aliases: [],
};

const config = require('../../config');
const logger = require('winston');

exports.run = (client, msg, params = []) => {
  /*if (params.length === 0) {
    msg.reply(`\`\`${config.commands.prefix}perms <cmd> [allow | deny | remove]\`\``);
    return;
  }
  if (msg.channel.type === 'dm') {
    msg.reply('Unable to check permissions from DM channels.');
    return;
  }
  const cmd = params[0].toLowerCase();
  logger.debug('cmd:', cmd);
  mongo.perms.findOne({ server_id: msg.guild.id, cmd: cmd }, (err, result) => {
    if (err) {
      logger.error('Error getting perms from mongoDB', err);
      msg.reply('Error getting permissions.');
    } else {
      if (params.length < 2) {
        listPerms(result);
        return;
      }
      // This is as far as we let you get without permissions
      if (!allowed) {
        return;
      }
      if (!discord.cmds.has(cmd)) {
        msg.reply('Unable to set permissions on commands that do not exist.');
        return;
      }
      if (!result) {
        result = mongo.perms({
          server_id: msg.guild.id,
          cmd,
        });
      }
      const action = params[1] ? params[1].toLowerCase() : null;
      if (action !== 'allow' && action !== 'deny' && action !== 'remove') {
        msg.reply(`\`\`${config.commands.prefix}perms ${cmd} <allow | deny | remove>\`\``);
        return;
      }
      const type = params[2] ? params[2].toLowerCase() : null;
      if (type !== 'member' && type !== 'channel' && type !== 'role') {
        msg.reply(`\`\`${config.commands.prefix}perms ${cmd} ${action} <member | channel | role>\`\``);
        return;
      }
      const target = params[3] || null;
      if (!target) {
        msg.reply(`\`\`${config.commands.prefix}perms ${cmd} ${action} ${type} <target>\`\``);
        return;
      }
      const id = targetToId(target, type);
      if (!id) {
        msg.reply(`Unable to resolve ${type} '${target}' to a Discord ID.`);
        return;
      }
      processCommand(result, action, type, id);
    }
  });

  function processCommand(result, action, type, id) {
    const allowIndex = result.perms.allow[`${type}s`].indexOf(id);
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

    function save(callback) {
      result.save()
        .then(() => {
          callback(null);
        })
        .catch(() => {
          callback(new Error('Permissions result update error'));
        });
    }
  }

  function listPerms(result) {
    if (!result) {
      const allow = config.commands.deny_blank_perms ? '**DENIED**' : '**ALLOWED**';
      msg.reply(`No explicit permissions set for **${cmd}**. Using defaults. ${allow}`);
      return;
    }
    const obj = {
      cmd: result.cmd,
      perms: result.perms,
    };
    msg.channel.sendCode('json', JSON.stringify(obj, null, 2));
  }

  function targetToId(target, type) {
    const matchId = target.match(/(\d+)/);

    if (type === 'member') {
      let member;
      if (matchId) {
        member = msg.guild.members.find('id', matchId[1]);
      } else {
        member = msg.guild.members.find(x => x.user.username === target);
        if (!member) {
          member = msg.guild.members.find('nickname', target);
        }
      }
      if (member) {
        return member.id;
      }
    }

    if (type === 'channel') {
      let channel;
      if (matchId) {
        channel = msg.guild.channels.find('id', matchId[1]);
      } else {
        channel = msg.guild.channels.find('name', target);
      }
      if (channel) {
        return channel.id;
      }
    }

    if (type === 'role') {
      let role;
      if (target.toLowerCase() === 'everyone') {
        target = '@everyone';
      }
      if (matchId) {
        role = msg.guild.roles.find('id', matchId[1]);
      }
      if (!role) {
        role = msg.guild.roles.find('name', target);
      }
      if (role) {
        return role.id;
      }
    }

    return null;
  }*/
};
