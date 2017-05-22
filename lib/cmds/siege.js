'use strict';
exports.info = {
  desc: 'Lookup RB6 Siege Stats / Top Operators for PC.',
  usage: '<name> [pc, xbl, psn]',
  aliases: [],
};

const request = require('superagent');
const moment = require('moment');

// Scrape RB6 Siege stats to show in Discord
exports.run = (client, msg, params = []) => new Promise((resolve, reject) => {
  if (!params[0]) params[0] = 'annemunition';
  const name = params[0];
  let platform = params[1].toLowerCase() || 'uplay';
  if (platform === 'pc') platform = 'uplay';
  if (platform !== 'uplay' && platform !== 'xbl' && platform !== 'psn') {
    msg.channel.send(`**${platform}** is not a known platform. **pc** (default), **xbl**, or **psn**`);
    return;
  }
  msg.channel.send(`Looking up **${platform}** RB6 Siege stats for **${name}**. Please wait...`)
    .then(m => {
      fetch(`https://public-ubiservices.ubi.com/v2/profiles?nameOnPlatform=${name}&platformType=${platform}`, client)
        .then(result => {
          if (result.body.profiles.length === 0) {
            m.delete();
            msg.channel.send(`No ${platform} stats found for **${name}**.`);
            return;
          }
          const userId = result.body.profiles[0].userId;
          const userName = result.body.profiles[0].nameOnPlatform;
          const stats = [
            'casualpvp_timeplayed',
            'rankedpvp_timeplayed',
            'operatorpvp_timeplayed',
          ];
          Promise.all([
            /* eslint-disable max-len */
            fetch(`https://public-ubiservices.ubi.com/v1/spaces/5172a557-50b5-4665-b7db-e3f2e8c5041d/sandboxes/OSBOR_PC_LNCH_A/playerstats2/statistics?populations=${userId}&statistics=${stats.join(',')}`, client),
            fetch(`https://public-ubiservices.ubi.com/v1/spaces/5172a557-50b5-4665-b7db-e3f2e8c5041d/sandboxes/OSBOR_PC_LNCH_A/r6karma/players?board_id=pvp_ranked&profile_ids=${userId}&region_id=ncsa&season_id=-1`, client),
            fetch(`https://public-ubiservices.ubi.com/v1/spaces/5172a557-50b5-4665-b7db-e3f2e8c5041d/sandboxes/OSBOR_PC_LNCH_A/r6playerprofile/playerprofile/progressions?profile_ids=${userId}`, client),
            /* eslint-enable max-len */
          ])
            .then(results => {
              const data = results[0].body.results[userId];
              const rankedData = results[1].body.players[userId];
              const profileData = results[2].body.player_profiles[0];
              const opTimePlayed = [];
              for (const key in data) {
                if (data.hasOwnProperty(key)) {
                  if (key.startsWith('operatorpvp_timeplayed')) {
                    const op = key.replace('operatorpvp_timeplayed', '').replace('infinite', '');
                    opTimePlayed.push({ name: resolveOperator(op) || op, time: data[key] });
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
                rank: resolveRank(rankedData.rank),
                avatar: `https://ubisoft-avatars.akamaized.net/${userId}/default_146_146.png` +
                `?appId=39baebad-39e5-4552-8c25-2c9b919064e2`,
                casualTime: formatTime(data['casualpvp_timeplayed:infinite']),
                rankedTime: formatTime(data['rankedpvp_timeplayed:infinite']),
                rb6Uri: `https://game-rainbow6.ubi.com/en-us/${platform}/player-statistics/${userId}/multiplayer`,
                operators: opTimePlayed.sort((a, b) => b.time - a.time).slice(0, 6),
              };
              // Post results to Discord
              m.delete().catch(client.logger.error);
              const embed = new client.Discord.RichEmbed()
                .setDescription(buildStringToPost(statistics))
                .setThumbnail(statistics.avatar);
              msg.channel.send({ embed }).then(resolve).catch(reject);
            })
            .catch(err => {
              client.logger.error(err);
              m.delete().catch(client.logger.error);
              msg.reply(`Error looking up **${platform}** stats for **${name}**.`);
            });
        })
        .catch(err => {
          client.logger.error(err);
          m.delete().catch(client.logger.error);
          msg.reply(`Error looking up **${platform}** stats for **${name}**.`);
        });
    })
    .catch(reject);
});

function fetch(uri) {
  return new Promise((resolve, reject) => {
    request
      .get(uri)
      .type('json')
      .set('Ubi-AppId', '39baebad-39e5-4552-8c25-2c9b919064e2')
      /* eslint-disable max-len */
      .set('Authorization', 'Ubi_v1 t=ew0KICAidmVyIjogIjEiLA0KICAiYWlkIjogIjM5YmFlYmFkLTM5ZTUtNDU1Mi04YzI1LTJjOWI5MTkwNjRlMiIsDQogICJlbnYiOiAiUHJvZCIsDQogICJzaWQiOiAiYmU2MTk1YzItOTAwMC00NmI2LTkzZmItZGI0YTVmYzNjMjIyIiwNCiAgInR5cCI6ICJKV0UiLA0KICAiZW5jIjogIkExMjhDQkMiLA0KICAiaXYiOiAiWFJhQU5ZT0F2ZlBUMWVmb2lVaFZiQSIsDQogICJpbnQiOiAiSFMyNTYiDQp9.qAolPxOJu7-Yc0uBQZLj6q_PgUMdgAatu2ymrE9DoSvMQ5rIc3GewdJgZPEyr-qEIzHcyK5RkwJdMV53GlPbJQIDsJKQPWQaLGbW8CUP25FfbwDLRjaXNMcSe6q9gHzorlsyglI1GQHYTp3IYMmMHvD7HDImi2SVirRY919CEACgD4EeBsox3GwhwRY_npOiop5wbePFTa4okOf_hiCopvNf2ZbDtdCF9V5ooDxE1QRxui5grS5BQoOWRc97_yTCFO1A9SY6zTfu6JEM45ecIncjnF2F4KfdG03iFuFIv0moxk5tGWvWUbun-2gaDEDri9YIy70XzBs8xFm33eulKhCT_dC5A0DeXD7Om2rr3j8znSo5YBpXDtCivEdJ1ZTrKBYx61NeAL68pJAsD5wh5TTbE2J1Dtwsvf3RB2PkKKCFy405tpn4p8MARVT6hCIZ-S6WX0gAwpJwXXQka7GZNn-tkWa5TM6oBrtEKycsk3Z7oBdRKxEAoN7o2HJs2SX5BJxrwgiRr3OoeLvj9zP-ETLEEHffhAYhE45OzVWMwba-S-UYk-p3xW3DUG9sMR5OhwXUcwclTyjbmY1DSfDUD6GW1hGjWEOw9sEj4gIoGtvA3qYjmpdojY2CMQYZhILFEm5NjhyGRYD8Dd2lMq8LlksTKzLzyuWW4B0YEx56gVlcr2x49ci_hvh3gaazvj4wSKVjpnmdUljT-oIDQeL-3MQKcDudzheJGz_cbRG8_sm2XLQ5zSjJg1vvXAB2kyHc46TS8TGaMphAYKCs5VDgMISMWdm0IYxRslGKkD4qhAxA7QQ4hRfEXH3HgV76_WXcuudNUTj538C1qM29FGcwRQr5HrvgU3zYXHlczqonEQFrGZjtY_I_S2WMkQK1qmOXlguRUt0xhq5PuuEFW3vOaRZwAZ9yd2uf-UzMuscfQyeDaUORv_CCNDjPUH0QnTxZ83_AzsvTJzKrd4zgS0LtMBmspOY4oC2wkHNWfAN20IPdrRBI1iYP0KZCqoUFH0ZI7XLd5M48SovVnnpTEjkF1JOegVIrDOjBEZ4pdwFmDUzW5GWeRBBhcSCyl1mvpounOXFp3PcI7QCPZ4DU_CblqhZ3smOfU0-Yg4f5fmSJAHE_g1CdFZhTL_yJ872GPLb5uzJlMhEYKaWRzJ1XiUzPMm5aAkkjbX4YiuujZ3lepDHvoZqX7hoqzWNjd4bkn65vwRAg5Ndz6WzBncRb5LUDrmEpvn0W9Nr3Pd8JAIVxftNmKsYWypL2ZM5X20z4W79VrjJqmZSF4f7DxlISLIioytiw7o5c8IYxqPAkD8I2eYhd8RbQBdhzf-6B-pWTgo7lmxxgcXuq6t-0kX1bbLJCLGoSK2HbUR9jfRKJHZVr_6GA7Su_w0jju6V5LW3lLB0u-MpfrbwbtN3ACYNcPCfCUg.xbpxYIFU9KLFvLaK5xVLr_vLbB1PDoBORO-f9wrWfjM')
      /* eslint-enable max-len */
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

function resolveOperator(code) {
  return opCodes[code];
}

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

function resolveRank(num) {
  return rankNames[num - 1];
}
