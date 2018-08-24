'use strict';
exports.info = {
  desc: 'Embeds the hexagon gif.',
  usage: '',
  aliases: ['praise', 'sphere'],
  permissions: ['SEND_MESSAGES', 'ATTACH_FILES'],
};

const path = require('path');

exports.run = (client, msg) => new Promise((resolve, reject) => {
  // Send the hexagon gif from our assets directory to the channel where the command was ran
  msg.channel.send({
    files: [{
      attachment: path.join(client.assetsDir, 'hexagon.gif'),
      name: 'hexagon.gif',
    }],
  }).then(resolve).catch(reject);
});
