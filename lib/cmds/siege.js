'use strict';
exports.info = {
  desc: 'Lookup RB6 Siege Stats / Top Operators for PC.',
  usage: '<name> [pc, xbl, psn]',
  aliases: [],
};

const request = require('superagent');
const moment = require('moment');

let ticket;
let expiration;

// Scrape RB6 Siege stats to show in Discord
exports.run = (client, msg, params = []) => new Promise(async (resolve, reject) => {
  if (!params[0]) params[0] = 'annemunition';
  const name = params[0];
  let platform = params[1] ? params[1].toLowerCase() : 'uplay';
  if (platform === 'pc') platform = 'uplay';
  if (platform !== 'uplay' && platform !== 'xbl' && platform !== 'psn') {
    msg.channel.send(`**${platform}** is not a known platform. **pc** (default), **xbl**, or **psn**`);
    return;
  }
  const token = new Buffer(`${client.config.ubi.email}:${client.config.ubi.password}`).toString('base64');
  msg.channel.send(`Looking up **${platform}** RB6 Siege stats for **${name}**. Please wait...`)
    .then(async m => {
      try {
        // Check that we have a ticket that won't expire in the next 30 seconds
        try {
          if (ticket && expiration) {
            const exp = moment(expiration);
            const future = moment().add(30, 's');
            if (future > exp) {
              await getTicket(token);
            }
          } else {
            await getTicket(token);
          }
        } catch (e) {
          msg.reply('Error with the Ubisoft authentication flow');
          client.logger.error(e);
        }
        const user = await fetch(`https://public-ubiservices.ubi.com/v2/profiles?nameOnPlatform=${name}` +
          `&platformType=${platform}`);
        if (user.body.profiles.length === 0) {
          Promise.all([
            m.delete(),
            msg.channel.send(`No ${platform} stats found for **${name}**.`),
          ]).catch(client.logger.error);
          return;
        }
        const userId = user.body.profiles[0].userId;
        const userName = user.body.profiles[0].nameOnPlatform;
        const stats = [
          'casualpvp_timeplayed',
          'rankedpvp_timeplayed',
          'operatorpvp_timeplayed',
        ];
        const results = await Promise.all([
          /* eslint-disable max-len */
          fetch(`https://public-ubiservices.ubi.com/v1/spaces/5172a557-50b5-4665-b7db-e3f2e8c5041d/sandboxes/OSBOR_PC_LNCH_A/playerstats2/statistics?populations=${userId}&statistics=${stats.join(',')}`, client),
          fetch(`https://public-ubiservices.ubi.com/v1/spaces/5172a557-50b5-4665-b7db-e3f2e8c5041d/sandboxes/OSBOR_PC_LNCH_A/r6karma/players?board_id=pvp_ranked&profile_ids=${userId}&region_id=ncsa&season_id=-1`, client),
          fetch(`https://public-ubiservices.ubi.com/v1/spaces/5172a557-50b5-4665-b7db-e3f2e8c5041d/sandboxes/OSBOR_PC_LNCH_A/r6playerprofile/playerprofile/progressions?profile_ids=${userId}`, client),
          /* eslint-enable max-len */
        ]);
        const data = results[0].body.results[userId];
        const rankedData = results[1].body.players[userId];
        const profileData = results[2].body.player_profiles[0];
        const opTimePlayed = [];
        for (const key in data) {
          if (data.hasOwnProperty(key)) {
            if (key.startsWith('operatorpvp_timeplayed')) {
              const op = key.replace('operatorpvp_timeplayed', '').replace('infinite', '');
              opTimePlayed.push({ name: opCodes[op] || op, time: data[key] });
            }
          }
        }
        const statistics = {
          name: userName,
          id: userId,
          platform,
          level: profileData.level,
          mmr: rankedData.mmr.toFixed(0),
          max_mmr: rankedData.max_mmr.toFixed(0),
          rank: rankNames[rankedData.rank - 1],
          avatar: `https://ubisoft-avatars.akamaized.net/${userId}/default_146_146.png` +
          `?appId=39baebad-39e5-4552-8c25-2c9b919064e2`,
          casualTime: formatTime(data['casualpvp_timeplayed:infinite']),
          rankedTime: formatTime(data['rankedpvp_timeplayed:infinite']),
          rb6Uri: `https://game-rainbow6.ubi.com/en-us/${platform}/player-statistics/${userId}/multiplayer`,
          operators: opTimePlayed.sort((a, b) => b.time - a.time).slice(0, 6),
        };
        // Post results to Discord
        const embed = new client.Discord.RichEmbed()
          .setDescription(buildStringToPost(statistics))
          .setThumbnail(statistics.avatar);
        Promise.all([
          m.delete(),
          msg.channel.send({ embed }).then(resolve),
        ]).catch(client.logger.error);
      } catch (e) {
        client.logger.error(e);
        Promise.all([
          m.delete(),
          msg.reply(`Error looking up **${platform}** stats for **${name}**.`),
        ]).catch(client.logger.error);
      }
    })
    .catch(reject);
});

function getTicket(token) {
  return new Promise((resolve, reject) => {
    request
      .post('https://connect.ubi.com/ubiservices/v2/profiles/sessions')
      .type('json')
      .set('Ubi-AppId', '39baebad-39e5-4552-8c25-2c9b919064e2')
      .set('Authorization', `Basic ${token}`)
      .send({ rememberMe: true })
      .end((err, result) => {
        if (!err) {
          ticket = result.body.ticket;
          expiration = result.body.expiration;
          resolve();
        } else {
          ticket = null;
          expiration = null;
          reject();
        }
      });
  });
}

function fetch(uri) {
  return new Promise((resolve, reject) => {
    if (!ticket) reject();
    request
      .get(uri)
      .type('json')
      .set('Ubi-AppId', '39baebad-39e5-4552-8c25-2c9b919064e2')
      .set('Authorization', `Ubi_v1 t=${ticket}`)
      .end((err, res) => {
        if (err) return reject(err);
        return resolve(res);
      });
  });
}

function formatTime(seconds) {
  const t = moment.duration(seconds, 'seconds');
  const hours = t.asHours().toFixed(0);
  if (hours > 1) return `${hours} hour${hours === 1 ? '' : 's'}`;
  const minutes = t.asMinutes().toFixed(0);
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
}

function buildStringToPost(stats) {
  let str = `RB6 Siege Statistics - ${stats.name}:\n\n`;
  if (stats.casualTime) str += `Casual: ${stats.casualTime} played - Level: ${stats.level}\n`;
  if (stats.rankedTime) {
    str += `Ranked: ${stats.rankedTime} played - Rank: '${stats.rank}'\n`;
    str += `MMR: ${stats.mmr} - Max: ${stats.max_mmr}\n`;
  }
  str += '\nTop Operators =>\n';
  stats.operators.forEach(op => {
    const padName = padString(op.name, 9);
    const timePlayed = padTime(op.time);
    str += `${(stats.operators.indexOf(op) + 1)}: ${padName} - ${timePlayed}\n`;
  });
  str = `\`\`\`qml\n${str}\`\`\`[Rainbow 6 Siege Stats](${stats.rb6Uri})`;
  return str;
}

function padTime(str) {
  if (typeof str === 'number') str = formatTime(str);
  let i = str.split(' ')[0].split('').length;
  for (i; i < 3; i++) {
    str = ` ${str}`;
  }
  return str;
}

function padString(str, p) {
  if (p < str.length) {
    return str;
  }
  const a = str.split('');
  for (let i = str.length; i <= p; i++) {
    a[i] = ' ';
  }
  return a.join('');
}

const opCodes = {
  ':2:1:': 'Smoke',
  ':3:1:': 'Mute',
  ':4:1:': 'Sledge',
  ':5:1:': 'Thatcher',
  ':2:2:': 'Castle',
  ':3:2:': 'Ash',
  ':4:2:': 'Pulse',
  ':5:2:': 'Thermite',
  ':2:3:': 'Doc',
  ':3:3:': 'Rook',
  ':4:3:': 'Twitch',
  ':5:3:': 'Montagne',
  ':2:4:': 'Glaz',
  ':3:4:': 'Fuze',
  ':4:4:': 'Kapkan',
  ':5:4:': 'Tachanka',
  ':2:5:': 'Blitz',
  ':3:5:': 'IQ',
  ':4:5:': 'Jager',
  ':5:5:': 'Bandit',
  ':2:6:': 'Buck',
  ':3:6:': 'Frost',
  ':2:7:': 'Blackbeard',
  ':3:7:': 'Valkyrie',
  ':2:8:': 'Capitao',
  ':3:8:': 'Caveira',
  ':2:9:': 'Hibana',
  ':3:9:': 'Echo',
  ':2:A:': 'Jackal',
  ':3:A:': 'Mira',
};

const rankNames = [
  'COPPER IV',
  'COPPER III',
  'COPPER II',
  'COPPER I',
  'BRONZE IV',
  'BRONZE III',
  'BRONZE II',
  'BRONZE I',
  'SILVER IV',
  'SILVER III',
  'SILVER II',
  'SILVER I',
  'GOLD IV',
  'GOLD III',
  'GOLD II',
  'GOLD I',
  'PLATINUM III',
  'PLATINUM II',
  'PLATINUM I',
  'DIAMOND',
];