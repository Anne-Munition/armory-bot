'use strict';
exports.info = {
  desc: 'Search messages for user/role mentions and post in a DM.',
  usage: '[number]',
  aliases: [],
};

const moment = require('moment');
const logger = require('winston');
const utils = require('../utilities');

exports.run = (client, msg, params = []) => {
  // Exit if not ran in normal text channel (no DMs)
  if (msg.channel.type !== 'text') {
    msg.reply('Unable to get **mentions** from a DM channel.');
    utils.finish(client, msg, exports.name);
    return;
  }
  // Set amount of messages to retrieve
  let max = parseInt(params[0]) || 500;
  // Don't allow over 10k messages to be searched
  if (max > 10000) {
    max = 10000;
  }
  const responses = [];
  let count = 0;
  const delay = 1000;
  const roles = msg.member.roles;

  msg.channel.sendMessage(':mailbox_with_mail:');
  msg.author.sendMessage(`Searching for @ mentions in **#${msg.channel.name}**. Estimated time: ` +
    `${Math.floor((delay / 1000) * (max / 100))} seconds.`);

  function next(err, lastMessage) {
    if (err) {
      return;
    }
    count += 100;
    if (count >= max || !lastMessage) {
      processLogs();
    } else {
      getLogs(lastMessage);
    }
  }

  getLogs(msg);

  function getLogs(m) {
    setTimeout(() => {
      msg.channel.fetchMessages({ limit: 100, before: m.id })
        .then((messages) => {
          if (messages.size !== 100) {
            extractMentions(messages);
            next(null, null);
            return;
          }
          extractMentions(messages);
          next(null, messages[messages.length - 1]);
        })
        .catch(e => {
          logger.error('There was an error searching for @ mentions', e);
          next(true);
        });
    }, delay);
  }

  function extractMentions(messages) {
    messages.forEach(m => {
      if (m.mentions.everyone) {
        responses.push(m);
        return;
      }
      if (m.isMentioned(msg.author)) {
        responses.push(m);
        return;
      }
      roles.some(r => {
        if (m.isMentioned(r)) {
          m.content = m.content.replace(/<@&\d+>/g, `@${r.name}`);
          responses.push(m);
          return true;
        }
        return false;
      });
    });
  }

  function processLogs() {
    if (responses.length === 0) {
      msg.author.sendMessage(`\`\`No mentions were found in #${msg.channel.name}.\`\``);
      utils.finish(client, msg, exports.name);
      return;
    }
    const chunks = [];
    const header = `\`\`\`Mentions from #${msg.channel.name}.\`\`\`\n`;

    function nextChunk(start) {
      if (start) {
        chunk(start);
      } else {
        chunks.forEach(c => {
          msg.author.sendMessage(header + c);
        });
        utils.finish(client, msg, exports.name);
      }
    }

    chunk(responses.length - 1);

    function chunk(start) {
      let str = '';
      for (let i = start; i >= 0; i--) {
        const dur = moment(responses[i].timestamp).fromNow();
        const strToAdd = `\`\`${responses[i].author.username} - ${dur}\`\`\n${responses[i].content}\n\n`;
        const combinedLength = str.length + strToAdd.length + header.length;
        if (combinedLength > 2000) {
          chunks.push(str);
          nextChunk(i);
          return;
        } else {
          str += strToAdd;
        }
      }
      chunks.push(str);
      nextChunk(null);
    }
  }
};
