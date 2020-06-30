'use strict';
exports.info = {
  desc: 'Enable / Disable Sub Games. (Adds / Removes Voice Channels)',
  usage: '<enable | disable>',
  aliases: [],
  permissions: ['SEND_MESSAGES'],
};

exports.run = (client, msg, params = []) => new Promise(async(resolve, reject) => {
  if (msg.channel.type === 'dm') {
    client.utils.dmDenied(msg)
      .then(resolve)
      .catch(reject);
    return;
  }
  if (params.length === 0) {
    client.utils.usage(msg, exports.info)
      .then(resolve)
      .catch(reject);
    return;
  }
  params = params.map(p => p.toLowerCase());

  function enable() {
    // check to see if voice channels already exist
    // create any that are missing
    // tell the user that we are done
    msg.reply('Sub Games have been enabled. Voice Channels created and ready.').then(resolve).catch(reject);
  }

  function disable() {
    // delete any matching voice channels
    // tell the user we are done
    msg.reply('Sub Games have been disabled. Voice channels have been removed.').then(resolve).catch(reject);
  }


  switch (params[0]) {
    case 'on':
    case 'enable':
    case 'start':
      enable();
      break;
    case 'off':
    case 'disable':
    case 'stop':
      disable();
      break;
    default:
      client.utils.usage(msg, exports.info)
        .then(resolve)
        .catch(reject);
  }
});

