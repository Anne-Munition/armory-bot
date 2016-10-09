'use strict';
exports.info = {
  name: 'mentions',
  desc: 'Posts stats and online user list of a Nodecraft MC server',
  usage: 'mentions [number]',
};

const moment = require('moment');
const logger = require('winston');

exports.run = (d, m, q = []) => {
  // Exit if not ran in normal text channel (no DMs)
  if (m.channel.type !== 'text') {
    return;
  }
  // Set amount of messages to retrieve
  let max = parseInt(q[0]) || 500;
  // Don't allow over 10k messages to be searched
  if (max > 10000) {
    max = 10000;
  }
  const responses = [];
  let count = 0;
  const delay = 1000;
  const roles = m.member.roles;

  m.channel.sendMessage(':mailbox_with_mail:');
  m.author.sendMessage(`Searching for @ mentions in **#${m.channel.name}**. Estimated time: ` +
    `${Math.floor(((delay / 1000) * (max / 100)) + 5)} seconds.`);

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

  getLogs(m);

  function getLogs(msg) {
    setTimeout(() => {
      m.channel.fetchMessages({ limit: 100, before: msg.id })
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
    messages.forEach((msg) => {
      if (msg.mentions.everyone) {
        responses.push(msg);
        return;
      }
      if (msg.isMentioned(m.author)) {
        responses.push(msg);
        return;
      }
      roles.some(r => {
        if (msg.isMentioned(r)) {
          msg.content = msg.content.replace(/<@&\d+>/g, `@${r.name}`);
          responses.push(msg);
          return true;
        }
        return false;
      });
    });
  }

  function processLogs() {
    if (responses.length === 0) {
      m.author.sendMessage(`\`\`No mentions were found in #${m.channel.name}.\`\``);
      return;
    }
    const chunks = [];
    const header = `\`\`\`Mentions from #${m.channel.name}.\`\`\`\n`;

    function nextChunk(start) {
      if (start) {
        chunk(start);
      } else {
        chunks.forEach(c => {
          m.author.sendMessage(header + c);
        });
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
