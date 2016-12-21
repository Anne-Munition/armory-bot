'use strict';
exports.info = {
  desc: 'Search messages for user/role mentions and posts results via DM.',
  usage: '[number]',
  aliases: [],
};

const moment = require('moment');
const logger = require('winston');
const utils = require('../utilities');

exports.run = (client, msg, params = []) => new Promise(async(resolve, reject) => {
  // Exit if not ran in normal text channel (no DMs)
  if (msg.channel.type === 'dm') {
    utils.dmDenied(msg).then(resolve).catch(reject);
    return;
  }
  // Set amount of messages to retrieve
  let max = parseInt(params[0]) || 500;
  // Don't allow over 10k messages to be searched
  if (max > 10000) {
    max = 10000;
  }

  const delay = 1000;
  msg.channel.sendMessage(':mailbox_with_mail:');
  msg.author.sendMessage(`Searching for @ mentions in **#${msg.channel.name}**. Estimated time: ` +
    `${Math.floor((delay / 1000) * (max / 100))} seconds.`);

  const responses = [];
  let count = 0;
  let id = msg.channel.lastMessageID;
  let messages;

  while (count < max) {
    try {
      messages = await msg.channel.fetchMessages({ limit: 100, before: id });
      id = messages.first().id;
      responses.concat(messages);
    } catch (err) {
      logger.error(err);
    }
    count += 100;
    await dwell(delay);
  }
  const mentions = extractMentions(msg, messages);
  processMentions(msg, mentions).then(resolve).catch(reject);
});


function dwell(d) {
  return new Promise(resolve => setTimeout(resolve, d));
}

function extractMentions(msg, messages) {
  const mentions = [];
  messages.forEach(m => {
    if (m.mentions.everyone) {
      mentions.push(m);
      return;
    }
    if (m.isMentioned(msg.author)) {
      mentions.push(m);
      return;
    }
    msg.member.roles.some(r => {
      if (m.isMentioned(r)) {
        m.content = m.content.replace(/<@&\d+>/g, `@${r.name}`);
        mentions.push(m);
        return true;
      }
      return false;
    });
  });
  return mentions;
}

function processMentions(msg, mentions) {
  return new Promise((resolve, reject) => {
    if (mentions.length === 0) {
      msg.author.sendMessage(`\`\`No mentions were found in #${msg.channel.name}.\`\``)
        .then(resolve).catch(reject);
      return;
    }
    const header = `\`\`\`Mentions from #${msg.channel.name}.\`\`\`\n`;
    const chunks = [];
    let str = '';
    logger.debug('mentions to mention:', mentions.length);
    mentions.reverse().forEach(message => {
      const dur = moment(message.createdAt).fromNow();
      const strToAdd = `\`\`${message.author.username} - ${dur}\`\`\n${message.content}\n\n`;
      const combinedLength = str.length + strToAdd.length + header.length;
      if (combinedLength < 1950) {
        str += strToAdd;
      } else {
        chunks.push(str);
        str = '';
      }
    });
    chunks.push(str);
    chunks.forEach(c => {
      msg.author.sendMessage(header + c);
    });
  });
}
