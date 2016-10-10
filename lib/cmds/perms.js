'use strict';
exports.info = {
  name: 'perms',
  desc: 'Lookup or alter command permissions',
  usage: 'perms',
};

const config = require('../../config');
const logger = require('winston');

exports.run = (d, m, q = [], mongo) => {
  if (q.length === 0) {
    m.reply(`\`\`${config.commands.prefix}perms <cmd> [allow | deny | remove]\`\``);
    return;
  }
  const cmd = q[0].toLowerCase();
  logger.debug('cmd:', cmd);
  mongo.perms.findOne({ server_id: m.guild.id, cmd: cmd }, (err, result) => {
    if (err) {
      logger.error('Error getting perms from mongoDB', err);
      m.reply('Error getting permissions.');
    } else {
      if (q.length < 2) {
        listPerms(result);
        return;
      }
      if (!d.cmds.has(cmd)) {
        m.reply('Unable to set permissions on commands that do not exist.');
        return;
      }
      if (!result) {
        result = mongo.perms({
          server_id: m.guild.id,
          cmd,
        });
      }
      const action = q[1] ? q[1].toLowerCase() : null;
      if (action !== 'allow' && action !== 'deny' && action !== 'remove') {
        m.reply(`\`\`${config.commands.prefix}perms ${cmd} <allow | deny | remove>\`\``);
        return;
      }
      const type = q[2] ? q[2].toLowerCase() : null;
      if (type !== 'member' && type !== 'channel' && type !== 'role') {
        m.reply(`\`\`${config.commands.prefix}perms ${cmd} ${action} <member | channel | role>\`\``);
        return;
      }
      const target = q[3] || null;
      if (!target) {
        m.reply(`\`\`${config.commands.prefix}perms ${cmd} ${action} ${type} <target>\`\``);
        return;
      }
      const id = targetToId(target, type);
      if (!id) {
        m.reply(`Unable to resolve ${type} '${target}' to a Discord ID.`);
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
        m.reply('The permission did not exist.');
        return;
      }
      removeIndexes();
      save(err => {
        if (err) {
          m.reply('Error removing permission.');
        } else {
          m.reply('Permission removed.');
        }
      });
      return;
    }

    if (result.perms[action][`${type}s`].indexOf(id) === -1) {
      removeIndexes();
      result.perms[action][`${type}s`].push(id);
      save(err => {
        if (err) {
          m.reply('Error adding permission.');
        } else {
          m.reply('Permission added.');
        }
      });
    } else {
      m.reply('This permission already exists.');
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
      const allowed = config.commands.deny_blank_perms ? '**DENIED**' : '**ALLOWED**';
      m.reply(`No explicit permissions set for **${cmd}**. Using defaults. ${allowed}`);
      return;
    }
    const obj = {
      cmd: result.cmd,
      perms: result.perms,
    };
    m.channel.sendCode('json', JSON.stringify(obj, null, 2));
  }

  function targetToId(target, type) {
    const matchId = target.match(/(\d+)/);

    if (type === 'member') {
      let member;
      if (matchId) {
        member = m.guild.members.find('id', matchId[1]);
      } else {
        member = m.guild.members.find(x => x.user.username === target);
        if (!member) {
          member = m.guild.members.find('nickname', target);
        }
      }
      if (member) {
        return member.id;
      }
    }

    if (type === 'channel') {
      let channel;
      if (matchId) {
        channel = m.guild.channels.find('id', matchId[1]);
      } else {
        channel = m.guild.channels.find('name', target);
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
        role = m.guild.roles.find('id', matchId[1]);
      }
      if (!role) {
        role = m.guild.roles.find('name', target);
      }
      if (role) {
        return role.id;
      }
    }

    return null;
  }
};
