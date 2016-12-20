'use strict';
exports.info = {
  desc: 'Embeds the \'Shame Nun\' gif.',
  usage: '',
  aliases: [],
};

const path = require('path');

exports.run = (client, msg) => new Promise((resolve, reject) => {
  // Send the shame gif from our assets directory to the channel where the command was ran
  msg.channel.sendFile(path.join(client.assetsDir, 'shame.gif'), 'shame.gif').then(resolve).catch(reject);
});
