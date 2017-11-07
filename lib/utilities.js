'use strict';
const logger = require('winston');
const fs = require('fs');
const path = require('path');
const Vibrant = require('node-vibrant');
const moment = require('moment');
const config = require('../config');
const qs = require('querystring');
const request = require('snekfetch');

module.exports = {

  getRandomInt: (min, max) => Math.floor(Math.random() * (max - min)) + min,

  removeCommand: (client, cmdName) => {
    logger.debug(`Flushing command: '${cmdName}'`);
    client.aliases.forEach((cmd, alias) => {
      if (cmd.name === cmdName) client.aliases.delete(alias);
    });
    delete require.cache[require.resolve(path.join(client.commandsDir, `${cmdName}.js`))];
    client.commands.delete(cmdName);
  },

  loadOneCommand: (client, file) => new Promise((resolve, reject) => {
    const cmdPath = path.join(client.commandsDir, file);
    const name = path.parse(cmdPath).name;
    if (client.commands.has(name)) module.exports.removeCommand(client, name);
    logger.debug(`Loading command: '${name}'`);
    try {
      const command = require(cmdPath);
      command.name = name;
      client.commands.set(name, command);
      if (command.info.aliases) {
        command.info.aliases.forEach(alias => {
          if (client.commands.has(alias)) {
            logger.warn(`The command ${name} alias ${alias} already exists.`);
          } else {
            client.aliases.set(alias, command);
          }
        });
      }
      resolve();
    } catch (e) {
      reject(e);
    }
  }),

  loadAllCommands: (client) => new Promise((resolve, reject) => {
    logger.debug('Loading commands into memory');
    fs.readdir(client.commandsDir, (err, files) => {
      if (err) {
        reject(err);
      } else {
        logger.info(`Loading ${files.length} command(s).`);
        const promiseArray = files.map(file => module.exports.loadOneCommand(client, file));
        client.commands.map(c => c.name)
          .filter(c => files.indexOf(`${c}.js`) === -1)
          .forEach(c => {
            logger.debug(`Command file '${c}' not found.`);
            module.exports.removeCommand(client, c);
          });
        Promise.all(promiseArray).then(resolve).catch(reject);
      }
    });
  }),

  palette: (image) => new Promise(async (resolve, reject) => {
    if (module.exports.isURI(image)) image = (await request.get(image, { encoding: null })).body;
    Vibrant.from(image).getPalette((err, palette) => {
      if (err) {
        reject(err);
      }
      const lightVibrant = module.exports.get(['LightVibrant', '_rgb'], palette);
      const vibrant = module.exports.get(['Vibrant', '_rgb'], palette);
      resolve(vibrant || lightVibrant || null);
    });
    return null;
  }),

  isURI: (text) => text.match(/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/), // eslint-disable-line

  formatTimeDiff: (time) => module.exports.formatDuration(moment.duration(moment().diff(moment(time)))),

  formatDuration: (time) => {
    let str = '';
    const years = parseInt(time._data.years);
    if (years > 0) {
      str += `${years} year${years === 1 ? '' : 's'} `;
      time = time.subtract(moment.duration(years, 'years'));
    }
    const months = parseInt(time._data.months);
    if (months > 0) {
      str += `${months} month${months === 1 ? '' : 's'} `;
      time = time.subtract(moment.duration(months, 'months'));
    }
    const days = parseInt(time._data.days);
    if (days > 0) {
      str += `${days} day${days === 1 ? '' : 's'} `;
    }
    str += `${time._data.hours} hour${parseInt(time._data.hours) === 1 ? '' : 's'} `;
    str += `${time._data.minutes} minute${parseInt(time._data.minutes) === 1 ? '' : 's'} `;
    str += `${time._data.seconds} second${parseInt(time._data.seconds) === 1 ? '' : 's'} `;
    return str.trim();
  },

  capitalize: word => word.replace(/\b\w/g, l => l.toUpperCase()),

  usage: (msg, info) => new Promise((resolve, reject) => {
    if (msg.channel.type !== 'dm' && !msg.channel.permissionsFor(msg.client.user).has('SEND_MESSAGES')) {
      return reject('Missing SEND_MESSAGES permissions');
    }
    let str = `Usage: \`\`${msg.prefix}${msg.cmd} ${info.usage}\`\``;
    if (msg.cmd === 'help') {
      str += `\nRun \`\`${msg.prefix}cmds\`\` to see a list of commands`;
    }
    return msg.reply(str).then(resolve).catch(reject);
  }),

  dmDenied: (msg) => new Promise((resolve, reject) => {
    msg.reply(`Unable to run command **${msg.cmd}** from a DM channel.`).then(resolve).catch(reject);
  }),

  makePossessive: (name) => `${name}'${name.endsWith('s') ? '' : 's'}`,

  ownerError: (type, client, err, msg, cmd) => {
    if (err) logger.error('Bot Error', err);
    if (msg) logger.error('Bot Err Message', msg);
    // Exit if we don't want to receive errors as owner
    // Exit if bot is test bot 120105547633524736
    if (config.receiveErrors !== 'force' && (!config.receiveErrors || client.user.id === '120105547633524736')) return;
    const owner = client.users.get(config.owner_id);
    if (owner) {
      let details = '```qml\n';
      if (msg) {
        const guild = msg.channel.type === 'dm' ? msg.author : msg.guild;
        const user = msg.channel.type === 'dm' ? msg.author.username : msg.member.nickname || msg.author.username;
        details += `Guild: ${msg.channel.type === 'dm' ? 'DM' : guild.name || guild.username} (${guild.id})\n`;
        details += `Channel: ${msg.channel.type === 'dm' ? 'DM' : msg.channel.name} (${msg.channel.id})\n`;
        details += `User: ${user} (${msg.author.id})\n`;
      }
      if (cmd) {
        details += `CMD: ${cmd}\n`;
        details += `Perms_Needed: ${JSON.stringify(client.commands.get(cmd).info.permissions)}\n`;
      }
      if (msg) details += `Content: ${msg.content}\n`;
      details += '```';
      let errStr = '';
      if (err) {
        errStr = '```js\n';
        errStr += err.stack || err;
        errStr += '```';
      }
      owner.send(`${type} Error on \`\`${moment().utc().format()}\`\`\n${msg ? details : ''}${errStr}`).catch(e => {
        client.logger.error('Unable to send message to bot owner. May be blocked or DMs are disabled in general', e);
      });
    }
  },

  buildUri: (base, query) => `${base}?${qs.stringify(query)}`,

  get: (p, o) => p.reduce((xs, x) => xs && xs[x] ? xs[x] : null, o),

};
