'use strict';
exports.info = {
  desc: 'Lookup Overwatch Stats / Top Heroes for PC or console.',
  usage: '<battletag | PSN | XB1 Name>',
  aliases: [],
  permissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
};

const moment = require('moment');
const request = require('snekfetch');

// Scrape Overwatch stats to show in Discord
exports.run = (client, msg, params = []) => new Promise((resolve, reject) => {
  // Set ow tag
  const tag = params[0] ? params.join(' ') : client.config.overwatch.default_battle_tag;
  // Extract name from tag
  const name = tag.split('#')[0];


  // Send message telling user we are looking up stats
  const plat = tag.includes('#') ? 'PC' : 'Console';
  msg.channel.send(`Looking up **${plat}** OW stats for **${name}**. Please wait...`)
    .then(m => {
      // Var to hold web request promises
      const promiseAllUris = [];
      const platforms = [];
      // Was tag a battle net tag or a console ign?
      if (tag.includes('#')) {
        promiseAllUris.push(request.get(`https://owapi.net/api/v3/u/${tag.replace('#', '-')}/blob`));
        platforms.push('pc');
      } else {
        promiseAllUris.push(request.get(`https://owapi.net/api/v3/u/${tag}/blob?platform=xb1`));
        platforms.push('xb1');
        promiseAllUris.push(request.get(`https://owapi.net/api/v3/u/${tag}/blob?platform=psn`));
        platforms.push('psn');
      }
      // Get info blobs from owapi.net
      delayedPromiseAll(promiseAllUris)
        .then(results => {
          let platformResults;
          let platform;
          // Get the first platform result with no error
          for (let i = 0; i < results.length; i++) {
            if (results[i]) {
              platformResults = results[i];
              platform = platforms[i];
              break;
            }
          }
          // None of the results had data
          if (!platformResults || !platform) {
            m.delete().catch(client.logger.error);
            msg.channel.send(`No stats found for **${name}**. Capitalization does count.`)
              .then(resolve).catch(reject);
            return;
          }
          // Determine what region has the highest level - eu or na
          const stats = platformResults.body;
          const regions = ['us', 'eu', 'kr', 'any'];

          const highestRegion = {
            name: '',
            level: null,
          };

          regions.forEach(region => {
            let level;
            if (stats[region] && stats[region].stats.quickplay) {
              level = stats[region].stats.quickplay.overall_stats.level +
                (stats[region].stats.quickplay.overall_stats.prestige * 100);
            }
            if (level > highestRegion.level) {
              highestRegion.name = region;
              highestRegion.level = level;
            }
          });

          if (!highestRegion.level) {
            m.delete().catch(client.logger.error);
            msg.channel.send(`**${name}** has an Overwatch profile, but has no time played.`)
              .then(resolve).catch(reject);
            return;
          }

          // Extract the data we are interested in
          const extractedData = scrapeData(client, stats[highestRegion.name], highestRegion.level);
          const regionName = highestRegion.name === 'any' ? '' : `/${highestRegion.name}`;
          extractedData.overwatchUri =
            `https://playoverwatch.com/en-us/career/${platform}${regionName}/${tag.replace('#', '-')}`;
          extractedData.name = name;
          extractedData.tag = tag;

          // Post results to Discord
          m.delete().catch(client.logger.debug);
          const embed = new client.Discord.MessageEmbed()
            .setDescription(buildStringToPost(client, extractedData))
            .setThumbnail(extractedData.avatar);
          msg.channel.send({ embed }).then(resolve).catch(reject);
        })
        .catch(err => {
          m.delete().catch(client.logger.error);
          msg.reply(`There was an error retrieving OW stats.`).catch(client.logger.error);
          reject(err);
        });
    })
    .catch(reject);
});

function scrapeData(client, ow, level) {
  const rank = ow.stats.competitive.overall_stats.comprank;
  const avatar = ow.stats.quickplay.overall_stats.avatar;

  const qpTime = formatTime(ow.stats.quickplay.game_stats.time_played);
  const rankedTime = formatTime(ow.stats.competitive.game_stats.time_played);

  const playtime = ow.heroes.playtime;

  const qpHeroes = [];
  for (const hero in playtime.quickplay) {
    if (playtime.quickplay.hasOwnProperty(hero)) {
      qpHeroes.push({ name: client.utils.capitalize(hero), hours: playtime.quickplay[hero] });
    }
  }

  const rankedHeroes = [];
  for (const hero in playtime.competitive) {
    if (playtime.competitive.hasOwnProperty(hero)) {
      rankedHeroes.push({ name: client.utils.capitalize(hero), hours: playtime.competitive[hero] });
    }
  }

  return {
    level,
    rank,
    qpTime,
    rankedTime,
    avatar,
    tier: client.utils.capitalize(ow.stats.competitive.overall_stats.tier),
    qpHeroes: qpHeroes.sort((a, b) => b.hours - a.hours).slice(0, 5),
    rankedHeroes: rankedHeroes.sort((a, b) => b.hours - a.hours).slice(0, 5),
  };
}

function formatTime(hours) {
  if (hours >= 1) return `${hours} hour${hours === 1 ? '' : 's'}`;
  const t = moment.duration(hours, 'hours');
  const minutes = t.asMinutes().toFixed(0);
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
}

function buildStringToPost(client, stats) {
  let str = `Overwatch Statistics - ${stats.name}:\n\n`;
  if (stats.qpTime) {
    str += `QP: ${stats.qpTime} played - Level ${stats.level}\n`;
    stats.qpHeroes.forEach(hero => {
      const padName = padString(hero.name, 9);
      const timePlayed = padTime(hero.hours);
      str += `${(stats.qpHeroes.indexOf(hero) + 1)}: ${padName} - ${timePlayed}\n`;
    });
    str += '\n';
  }
  if (stats.rankedTime) {
    const r = stats.rank === '' ? '(not placed)' : stats.rank;
    str += `Ranked: ${stats.rankedTime} played - Rank ${r} (${stats.tier})\n`;
    stats.rankedHeroes.forEach(hero => {
      const padName = padString(hero.name, 9);
      const timePlayed = padTime(hero.hours);
      str += `${(stats.rankedHeroes.indexOf(hero) + 1)}: ${padName} - ${timePlayed}\n`;
    });
  }
  str = `\`\`\`qml\n${str}\`\`\``;
  if (client.config.overwatch.hide_battle_tags.indexOf(stats.tag) === -1) {
    str += `<${stats.overwatchUri}>\n`;
  }
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

function delayedPromiseAll(promiseArray) {
  return new Promise((resolve, reject) => {
    const results = [];

    function runNext() {
      const nextPromise = promiseArray.shift();
      nextPromise
        .then(r => {
          results.push(r);
          next();
        })
        .catch(err => {
          if (err.status === 429) {
            reject(err);
          }
          results.push(null);
          next();
        });
    }

    function next() {
      if (promiseArray.length === 0) {
        resolve(results);
        return;
      }
      setTimeout(runNext, 5000);
    }

    runNext();
  });
}
