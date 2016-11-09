'use strict';
exports.info = {
  name: 'stats',
  desc: 'Posts statistics about this process/system/client',
  usage: 'stats',
};

const moment = require('moment');
const os = require('os');
const pusage = require('pidusage');
const utils = require('../utilities');

exports.run = (discord, msg) => {
  const nodeUp = moment.duration(process.uptime() * 1000);
  const totalMem = (os.totalmem() / 1024 / 1024).toFixed(0);
  const freeMem = (os.freemem() / 1024 / 1024).toFixed(0);
  const load = os.loadavg().map(x => (x * 100).toFixed(3));
  const osUp = moment.duration(os.uptime() * 1000);
  const cpuData = os.cpus();
  const usedRam = (totalMem - freeMem).toFixed(0);
  let msgPm = '..';
  let cmdPm = '..';
  let tweetPm = '..';

  if (discord.client.count.messages > 0 && nodeUp.asMinutes() > 1) {
    msgPm = (discord.client.count.messages / nodeUp.asMinutes()).toFixed(0);
  }
  if (discord.client.count.commands > 0 && nodeUp.asHours() > 1) {
    cmdPm = (discord.client.count.commands / nodeUp.asHours()).toFixed(0);
  }
  if (discord.client.count.tweets > 0 && nodeUp.asDays() > 1) {
    tweetPm = (discord.client.count.tweets / nodeUp.asDays()).toFixed(0);
  }

  let members = 0;
  discord.client.guilds.forEach(g => {
    members += g.members.size;
  });

  pusage.stat(process.pid, (err, stat) => {
    let cpu;
    if (err) {
      cpu = '--';
    } else {
      cpu = stat.cpu.toFixed(3);

      let str = '--Bot Stats--\n';
      str += `Name: '${discord.client.user.username} #${discord.client.user.discriminator}' ` +
        `(ID: ${discord.client.user.id})\n`;
      str += `Uptime: ${utils.formatDuration(nodeUp)}\n`;
      str += `RAM: ${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)}MB\n`;
      str += `CPU: ${cpu}%\n`;
      str += `Guilds: ${discord.client.guilds.size}\n`;
      str += `Channels: ${discord.client.channels.filter(c => c.type === 'text').size} text`;
      str += ` / ${discord.client.channels.filter(c => c.type === 'voice').size} voice\n`;
      str += `Members: ${members}\n`;

      str += '\n--System Stats--\n';
      str += `OS: '${os.type()} - ${os.release()}'\n`;
      str += `Core: '${cpuData[0].model}' (${cpuData.length}x)\n`;
      str += `Uptime: ${utils.formatDuration(osUp)}\n`;
      str += `RAM: ${usedRam}MB/${totalMem}MB (${(usedRam / totalMem * 100).toFixed(2)}%)\n`;
      str += `CPU: ${load[0]}%\n`;

      str += '\n--Session Stats--\n';
      str += `Messages: ${discord.client.count.messages} (${msgPm}/min)\n`;
      str += `Commands: ${discord.client.count.commands} (${cmdPm}/hr)\n`;
      str += `Tweets: ${discord.client.count.tweets} (${tweetPm}/day)\n`;

      msg.channel.sendCode('qml', str);
    }
  });
};
