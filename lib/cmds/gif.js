'use strict';
exports.info = {
  desc: 'Embeds a Giphy gif from random top 10 filtered results.',
  usage: '<query>',
  aliases: [],
  permissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
};

const path = require('path');
const request = require('snekfetch');

exports.run = (client, msg, params = []) => new Promise(async (resolve, reject) => {
  // Exit if no search query was passed
  if (params.length === 0) {
    client.utils.usage(msg, exports.info).then(resolve).catch(reject);
    return;
  }
  // Join params into a string
  const query = params.join(' ');
  // Create search uri
  const uri = client.utils.buildUri('http://api.giphy.com/v1/gifs/search', {
    q: query,
    api_key: 'dc6zaTOxFJmzC',
    fmt: 'json',
    limit: 100,
  });
  // Make the giphy request
  const giphy = client.utils.get(['body', 'data'], await request.get(uri));
  // Error if we don't get and giphy data
  if (!giphy || giphy.length === 0) {
    msg.channel.send(`No Giphy results found for **${query}**`).then(resolve).catch(reject);
    return;
  }
  // Filter out rated r results and those to large to embed
  const filtered = giphy
    .filter(g => g.rating !== 'r' && g.type === 'gif')
    .filter(g => g.images.original && g.images.original.size < 8000000);
  client.logger.debug('giphy results:', giphy.length, 'filtered results:', filtered.length);
  // If no results remain after filtering
  if (filtered.length === 0) {
    msg.channel.send(`No Giphy results found for \`\`${query}\`\` after filtering for size and content.`)
      .then(resolve).catch(reject);
    return;
  }
  // Set the max index to get random gif from to 10 or max results if less
  const max = filtered.length > 10 ? 10 : filtered.length;
  client.logger.debug('max index to search to', max);
  // Get random index
  const randomIndex = client.utils.getRandomInt(0, max);
  client.logger.debug('random index chosen', randomIndex);
  // Get gif uri
  const image = filtered[randomIndex].images.original.url.split('?')[0];
  // Parse name for discord image name property
  const name = path.parse(image).base;
  client.logger.debug(image, name);
  // Send final result
  const embed = new client.Discord.RichEmbed()
    .setTitle(query)
    .setColor('RANDOM')
    .setImage(image);
  msg.channel.send({ embed }).then(resolve).catch(reject);
});
