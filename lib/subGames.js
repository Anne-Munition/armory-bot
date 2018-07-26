'use strict';
let cd = false;

module.exports = () => {
  return {
    prefix: 'subg-',
    getCd() {
      return cd;
    },
    startCd() {
      if (cd) return;
      cd = true;
      setTimeout(() => {
        cd = false;
      }, 1000 * 10);
    },
    voiceStateUpdate(client, oldMember, newMember) {
      // Only in Armory and Test Discord
      if (newMember.guild.id !== '84764735832068096' && newMember.guild.id !== '140025699867164673') return;
      const oldVoice = oldMember.voiceChannel;
      const newVoice = newMember.voiceChannel;

      // Left a sub voice channel and is not in a new voice channel
      if (oldVoice && !newVoice && oldVoice.name.includes(this.prefix)) return this.moveMembers(client, false);
      // Joined a sub voice channel and was not in one prior
      if (!oldVoice && newVoice && newVoice.name.includes(this.prefix)) return this.moveMembers(client, false);
      // Moved voice channels
      if (oldVoice && newVoice) {
        // If coming from other voice channel to subg- voice
        if (!oldVoice.name.includes(this.prefix) &&
          newVoice.name.includes(this.prefix)) return this.moveMembers(client, false);
        // If leaving from subg- voice to channel other than streamer lounge
        if (oldVoice.name.includes(this.prefix) &&
          newVoice.name !== 'Streamer Lounge' &&
          // Only process subg- to subg- moves if moving down in position
          newVoice.position > oldVoice.position) return this.moveMembers(client, false);
      }
    },
    moveMembers(client, sendToStreamerLounge) {
      return new Promise((resolve, reject) => {
        // Get Guild
        const guild = client.guilds.get('84764735832068096') || client.guilds.get('140025699867164673');
        if (!guild) return reject('No Guild');
        // Get subg- voice channels
        const voiceChannels = guild.channels
          .filter(x => x.type === 'voice' && x.name.includes(this.prefix))
          .sort((a, b) => {
            const posA = parseInt(a.name.split(this.prefix)[1]);
            const posB = parseInt(b.name.split(this.prefix)[1]);
            return posA - posB;
          });
        if (!voiceChannels || voiceChannels.length === 0) return reject('No Voice Channels');
        // Get streamer lounge voice channel
        const streamerLounge = guild.channels.find('name', 'Streamer Lounge');
        if (!streamerLounge) return reject('No Streamer Lounge');

        // Array to squeeze together members
        const membersInVoiceChannels = [];
        voiceChannels.forEach(x => {
          if (x.members.first()) {
            membersInVoiceChannels.push(x.members.first());
          }
        });
        // Array of sub voice channel ids
        const voiceChannelIds = voiceChannels.map(x => x.id);
        // If next command was run, add streamer lounge to the beginning of the voice channel array
        if (sendToStreamerLounge) {
          voiceChannelIds.unshift(streamerLounge.id);
        }
        // Promise array of Discord.js calls to setVoiceChannel
        const setVoiceArray = [];
        for (let i = 0; i < membersInVoiceChannels.length; i++) {
          // Only set channel if channel is different
          // Reduces api calls
          if (membersInVoiceChannels[i].voiceChannel.id !== voiceChannelIds[i]) {
            setVoiceArray.push(membersInVoiceChannels[i].setVoiceChannel(voiceChannelIds[i]));
          }
        }
        // setVoiceChannel multi request
        Promise.all(setVoiceArray)
          .then(() => {
            // Get the member that would be in position 1
            const memberToNotify = sendToStreamerLounge ? membersInVoiceChannels[1] : membersInVoiceChannels[0];
            // Notify that member if they exist
            if (memberToNotify) {
              const anneMLG = client.emojis.get('471888236927516703') || client.emojis.get('471888150281715712');
              memberToNotify.user.send('Hello!\nYou are in Position **#1** in queue for ' + // eslint-disable-line prefer-template, max-len
                'AnneMunition\'s Sub Games.\nIf you are using a microphone, please make sure it is connected and ' +
                'working.\nHave a fun time! ' + (anneMLG || ''))
                .catch(() => {
                  // Do Nothing
                  // Don't error if we cannot send the member a DM. They might have the bot blocked
                });
            }
            resolve();
          })
          .catch(reject);
      });
    },
  };
};
