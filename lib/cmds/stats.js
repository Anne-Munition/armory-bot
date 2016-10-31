'use strict';
exports.info = {
  desc: 'Posts statistics about this process/system/client',
  usage: 'stats',
  aliases: [],
};

const moment = require('moment');
const os = require('os');
const pusage = require('pidusage');
const utils = require('../utilities');

exports.run = (client, msg) => {
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

  if (client.count.messages > 0 && nodeUp.asHours() > 1) {
    msgPm = (client.count.messages / nodeUp.asHours()).toFixed(0);
  }
  if (client.count.commands > 0 && nodeUp.asHours() > 1) {
    cmdPm = (client.count.commands / nodeUp.asHours()).toFixed(0);
  }
  if (client.count.tweets > 0 && nodeUp.asDays() > 1) {
    tweetPm = (client.count.tweets / nodeUp.asDays()).toFixed(0);
  }

  let members = 0;
  client.guilds.forEach(g => {
    members += g.members.size;
  });

  pusage.stat(process.pid, (err, stat) => {
    let cpu;
    if (err) {
      cpu = '--';
    } else {
      cpu = stat.cpu.toFixed(3);

      let str = '--Bot Stats--\n';
      str += `Name: '${client.user.username} #${client.user.discriminator}' ` +
        `(ID: ${client.user.id})\n`;
      str += `Uptime: ${formatUptime(nodeUp)}\n`;
      str += `RAM: ${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)}MB\n`;
      str += `CPU: ${cpu}%\n`;
      str += `Guilds: ${client.guilds.size}\n`;
      str += `Channels: ${client.channels.filter(c => c.type === 'text').size} text`;
      str += ` / ${client.channels.filter(c => c.type === 'voice').size} voice\n`;
      str += `Members: ${members}\n`;

      str += '\n--System Stats--\n';
      str += `OS: '${os.type()} - ${os.release()}'\n`;
      str += `Core: '${cpuData[0].model}' (${cpuData.length}x)\n`;
      str += `Uptime: ${formatUptime(osUp)}\n`;
      str += `RAM: ${usedRam}MB/${totalMem}MB (${(usedRam / totalMem * 100).toFixed(2)}%)\n`;
      str += `CPU: ${load[0]}%\n`;

      str += '\n--Session Stats--\n';
      str += `Messages: ${client.count.messages} (${msgPm}/hr)\n`;
      str += `Commands: ${client.count.commands} (${cmdPm}/hr)\n`;
      str += `Tweets: ${client.count.tweets} (${tweetPm}/day)\n`;

      msg.channel.sendCode('qml', str);
      utils.finish(client, msg, exports.info.name);
    }
  });
};

function formatUptime(time) {
  let str = '';
  const days = time.asDays().toFixed(0);
  if (days > 0) {
    str += `${days} day${time.days() === 1 ? '' : 's'} `;
  }
  str += `${time.hours()} hour${time.hours() === 1 ? '' : 's'} `;
  str += `${time.minutes()} minute${time.minutes() === 1 ? '' : 's'} `;
  str += `${time.seconds()} second${time.seconds() === 1 ? '' : 's'} `;
  return str.trim();
}
