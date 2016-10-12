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
exports.run = (discord, msg, params = []) => {
  // Exit if no search query was passed
  if (params.length === 0) {
    return;
  }

  // Join params into a string
  const query = params.join(' ');
  // Create search uri
  const uri = `http://api.giphy.com/v1/gifs/search?q=${query}&api_key=dc6zaTOxFJmzC&fmt=json&limit=100`;

  // Fetch Giphy
  fetch(encodeURI(uri))
    .then(r => r.json())
    .then(body => {
      if (body.data.length === 0) {
        msg.channel.sendMessage(`No Giphy results found for \`\`${query}\`\``);
        return;
      }
      // Filter out rated r results and those to large to embed
      const filtered = body.data
        .filter(g => g.rating !== 'r' && g.type === 'gif')
        .filter(g => g.images.original && g.images.original.size < 8000000);
      logger.debug('giphy results:', body.data.length, 'filtered results:', filtered.length);
      // No results remain after filtering
      if (filtered.length === 0) {
        msg.channel.sendMessage(`No Giphy results found for \`\`${query}\`\` after filtering for size and content.`);
        return;
      }
      // Set the max index to get random gif from to 10 or max results if less
      const max = filtered.length > 10 ? 10 : filtered.length;
      logger.debug('max index to search to', max);
      // Get random index
      const r = utils.getRandomInt(0, max);
      logger.debug('random index chosen', r);
      // Get gif uri
      const image = filtered[r].images.original.url;
      // Parse name for discord image name property
      const name = path.parse(image).base;
      logger.debug(image, name);
      msg.channel.sendMessage(`\`\`${query}\`\`\n${image}`);
    })
    .catch(err => {
      logger.error(`Error getting Giphy results for: '${query}'`, err);
      msg.channel.sendMessage(`Error getting Giphy results for:\`\`${query}\`\``);
    });
};
