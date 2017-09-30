'use strict';
const exec = require('child_process').exec;

module.exports = function Timers(client) {
  const musicVoiceChannel = client.channels.get('141778839536664576');
  setTimeout(() => {
    summonMusicBot(client, musicVoiceChannel);
  }, 10000);
  setInterval(() => {
    summonMusicBot(client, musicVoiceChannel);
  }, 600000);
};

function summonMusicBot(client, musicVoiceChannel) {
  if (!musicVoiceChannel) return;
  if (!musicVoiceChannel.members.has('175679693112999936')) {
    client.logger.info('Music Bot missing, restarting client');
    client.utils.ownerError('MusicBot', client, 'Music Bot missing, restarting client');
    exec('pm2 restart musicBot', (err, stdout, stderr) => {
      if (err || stderr) client.utils.ownerError('musicBotTimer', client, err || stderr);
      client.logger.debug(stdout);
    });
  }
}
