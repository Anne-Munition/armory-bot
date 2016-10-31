'use strict';
exports.info = {
  desc: 'Search for and embeds a Giphy gif from random Top 10 filtered results.',
  usage: '<search>',
  aliases: [],
};

const utils = require('../utilities');
const logger = require('winston');
const path = require('path');

// Gets G rated random giphy result from the supplied query
exports.run = (client, msg, params = []) => {
  // Exit if no search query was passed
  if (params.length === 0) {
    logger.debug('No parameters passed to giphy');
    return;
  }

  // Join params into a string
  const query = params.join(' ');
  // Create search uri
  const uri = `http://api.giphy.com/v1/gifs/search?q=${query}&api_key=dc6zaTOxFJmzC&fmt=json&limit=100`;

  // Fetch Giphy
  utils.jsonRequest(uri)
    .then(body => {
      logger.debug(`Giphy results in: ${client.now() - msg.start}ms`);
      if (body.data.length === 0) {
        msg.channel.sendMessage(`No Giphy results found for \`\`${query}\`\``);
        utils.finish(client, msg, exports.name);
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
        utils.finish(client, msg, exports.name);
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
      utils.finish(client, msg, exports.name);
    })
    .catch(err => {
      logger.error(`Error getting Giphy results for: '${query}'`, err);
      msg.channel.sendMessage(`Error getting Giphy results for:\`\`${query}\`\``);
      utils.finish(client, msg, exports.name);
    });
};
