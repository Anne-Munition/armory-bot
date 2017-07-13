'use strict';
exports.info = {
  desc: 'Embeds a Giphy gif from random top 10 filtered results.',
  usage: '<query>',
  aliases: [],
};

const path = require('path');

exports.run = (client, msg, params = []) => new Promise(async (resolve, reject) => {
  // Exit if no search query was passed
  if (params.length === 0) {
    client.utils.usage(msg, exports.info).then(resolve).catch(reject);
    return;
  }
  // Join params into a string
  const query = params.join(' ');
  // Create search uri
  const uri = `http://api.giphy.com/v1/gifs/search?q=${query}&api_key=dc6zaTOxFJmzC&fmt=json&limit=100`;
  let giphy;
  try {
    giphy = await client.utils.requestJSON(uri);
  } catch (err) {
    msg.channel.send(`Error getting Giphy results for **${query}**`);
    reject(err);
    return;
  }
  if (giphy.data.length === 0) {
    msg.channel.send(`No Giphy results found for **${query}**`).then(resolve).catch(reject);
    return;
  }
  // Filter out rated r results and those to large to embed
  const filtered = giphy.data
    .filter(g => g.rating !== 'r' && g.type === 'gif')
    .filter(g => g.images.original && g.images.original.size < 8000000);
  client.logger.debug('giphy results:', giphy.data.length, 'filtered results:', filtered.length);
  // No results remain after filtering
  if (filtered.length === 0) {
    msg.channel.send(`No Giphy results found for \`\`${query}\`\` after filtering for size and content.`)
      .then(resolve).catch(reject);
    return;
  }
  // Set the max index to get random gif from to 10 or max results if less
  const max = filtered.length > 10 ? 10 : filtered.length;
  client.logger.debug('max index to search to', max);
  // Get random index
  const r = client.utils.getRandomInt(0, max);
  client.logger.debug('random index chosen', r);
  // Get gif uri
  const image = filtered[r].images.original.url.split('?')[0];
  // Parse name for discord image name property
  const name = path.parse(image).base;
  client.logger.debug(image, name);
  const embed = new client.Discord.RichEmbed()
    .setTitle(query)
    .setColor(client.utils.randomColorInt())
    .setImage(image);
  msg.channel.send({ embed }).then(resolve).catch(reject);
});
