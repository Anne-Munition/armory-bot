'use strict';
exports.info = {
  desc: 'Embeds a Giphy gif from random top 10 filtered results.',
  usage: '<query>',
  aliases: [],
};

const utils = require('../utilities');
const logger = require('winston');
const path = require('path');
const Discord = require('discord.js');

exports.run = (client, msg, params = []) => new Promise(async(resolve, reject) => {
  // Exit if no search query was passed
  if (params.length === 0) {
    utils.usage(msg, exports.info).then(resolve).catch(reject);
    return;
  }
  // Join params into a string
  const query = params.join(' ');
  // Create search uri
  const uri = `http://api.giphy.com/v1/gifs/search?q=${query}&api_key=dc6zaTOxFJmzC&fmt=json&limit=100`;
  let giphy;
  try {
    giphy = await utils.requestJSON(uri);
  } catch (err) {
    msg.channel.sendMessage(`Error getting Giphy results for **${query}**`);
    reject(err);
    return;
  }
  if (giphy.data.length === 0) {
    msg.channel.sendMessage(`No Giphy results found for **${query}**`).then(resolve).catch(reject);
    return;
  }
  // Filter out rated r results and those to large to embed
  const filtered = giphy.data
    .filter(g => g.rating !== 'r' && g.type === 'gif')
    .filter(g => g.images.original && g.images.original.size < 8000000);
  logger.debug('giphy results:', giphy.data.length, 'filtered results:', filtered.length);
  // No results remain after filtering
  if (filtered.length === 0) {
    msg.channel.sendMessage(`No Giphy results found for \`\`${query}\`\` after filtering for size and content.`)
      .then(resolve).catch(reject);
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
  msg.channel.sendEmbed(new Discord.RichEmbed()
    .setTitle(query)
    .setColor(utils.randomColorInt())
    .setImage(image)
  ).then(resolve).catch(reject);
});
