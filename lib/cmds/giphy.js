'use strict';
exports.info = {
  name: 'giphy',
  desc: 'Searches for and Embeds a Giphy Gif',
  usage: 'giphy <search>',
};

const fetch = require('node-fetch');
const utils = require('../utilities');
const logger = require('winston');
const path = require('path');

// Gets G rated random giphy result from the supplied query
exports.run = (d, m, q = []) => {
  // Exit if no search query was passed
  if (q.length === 0) {
    return;
  }

  const query = q.join(' ');
  const uri = `http://api.giphy.com/v1/gifs/search?q=${query}&api_key=dc6zaTOxFJmzC&fmt=json&limit=100`;

  fetch(encodeURI(uri))
    .then(r => r.json())
    .then(body => {
      if (body.data.length === 0) {
        m.channel.sendMessage(`No Giphy results found for \`\`${query}\`\``);
        return;
      }
      const filtered = body.data
        .filter(g => g.rating !== 'r' && g.type === 'gif')
        .filter(g => g.images.original && g.images.original.size < 8000000);
      logger.debug('giphy results:', body.data.length, 'filtered results:', filtered.length);
      if (filtered.length === 0) {
        m.channel.sendMessage(`No Giphy results found for \`\`${query}\`\` after filtering for size and content.`);
        return;
      }
      const max = filtered.length > 10 ? 10 : filtered.length;
      logger.debug('max index to search to', max);
      const r = utils.getRandomInt(0, max);
      logger.debug('random index chosen', r);
      const image = filtered[r].images.original.url;
      const name = path.parse(image).base;
      logger.debug(image, name);
      m.channel.sendMessage(`\`\`${query}\`\`\n${image}`);
    })
    .catch(err => {
      logger.error(`Error getting Giphy results for: '${query}'`, err);
      m.channel.sendMessage(`Error getting Giphy results for:\`\`${query}\`\``);
    });
};
