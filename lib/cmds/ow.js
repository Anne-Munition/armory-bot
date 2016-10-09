'use strict';
exports.info = {
  name: 'ow',
  desc: 'Lookup Overwatch Stats / Top Heroes',
  usage: 'ow <battletag | PSN | XB! Name>',
};

const config = require('../../config');
const moment = require('moment');
const fetch = require('node-fetch');
const logger = require('winston');
const utils = require('../utilities');

// Scrape Overwatch stats to show in Discord
exports.run = (d, m, q = []) => {
  // Get tag from config to start
  let tag = config.battle_net_tag;
  // Use supplied tag if exists
  if (q[0]) {
    tag = q.join(' ');
  }
  // Extract name from tag
  const name = tag.split('#')[0];
  // Regions to search through
  // us | eu | cn | kr
  const regions = ['us', 'eu'];
  let platforms;
  let max;
  if (tag.includes('#')) {
    platforms = ['pc'];
    max = regions.length * platforms.length;
  } else {
    platforms = ['xbl', 'psn'];
    max = regions.length * platforms.length;
  }
  let count = 0;
  const results = {};

  regions.forEach(r => {
    platforms.forEach(p => {
      const i = p === 'pc' ? `${r}/` : '';
      const overwatchUri = `https://playoverwatch.com/en-us/career/${p}/${i}${tag}/`.replace('#', '-');
      const ovrstatUri = `https://ovrstat.com/v1/stats/${p}/${r}/${tag}/`.replace('#', '-');
      getStats(ovrstatUri, overwatchUri, r, p);
    });
  });

  function getStats(ovrstatUri, overwatchUri, region, platform) {
    fetch(encodeURI(ovrstatUri))
      .then(r => r.json())
      .then(body => {
        scrapeData(body, overwatchUri, region, platform);
      })
      .catch(err => {
        logger.error('Error getting OW stats from overstat', err);
        next(null, overwatchUri, region, platform);
      });
  }

  function scrapeData(data, overwatchUri, region, platform) {
    const level = data.level + (data.prestige * 100);
    const rank = data.rating;
    const qpTime = utils.get(data, 'quickPlayStats.careerStats.allHeroes.game.timePlayed');
    const rankedTime = utils.get(data, 'competitiveStats.careerStats.allHeroes.game.timePlayed');
    const qpHeroes = [];

    if (data.quickPlayStats) {
      for (let hero in data.quickPlayStats.topHeros) {
        if (data.quickPlayStats.topHeros.hasOwnProperty(hero)) {
          qpHeroes.push({ name: utils.capitalize(hero), data: data.quickPlayStats.topHeros[hero] });
        }
      }
    }

    const rankedHeroes = [];
    if (data.competitiveStats) {
      for (let hero in data.competitiveStats.topHeros) {
        if (data.competitiveStats.topHeros.hasOwnProperty(hero)) {
          rankedHeroes.push({ name: utils.capitalize(hero), data: data.competitiveStats.topHeros[hero] });
        }
      }
    }

    next({
      level,
      rank,
      qpTime,
      rankedTime,
      qpHeroes: sortHeroes(qpHeroes).splice(0, 5),
      rankedHeroes: sortHeroes(rankedHeroes).splice(0, 5),
    }, overwatchUri, region, platform);
  }

  function next(data, overwatchUri, region, platform) {
    if (data) {
      results[`${region}|${platform}`] = {
        data,
        url: overwatchUri,
      };
    }
    count++;
    if (count >= max) {
      if (Object.keys(results).length === 0 && results.constructor === Object) {
        return m.reply(`No stats found for \`\`${name}\`\``);
      }
      let highestLevel = 0;
      let highestRegion = '';
      for (let result in results) {
        if (results.hasOwnProperty(result)) {
          if (results[result].data.level > highestLevel) {
            highestLevel = results[result].data.level;
            highestRegion = result;
          }
        }
      }
      showResults(results[highestRegion].data, results[highestRegion].url);
    }
    return null;
  }

  function showResults(stats, url) {
    logger.debug('stats', JSON.stringify(stats));
    if (!stats.qpTime && !stats.rankedTime) {
      return m.reply(`\`\`${name}\`\` has an Overwatch profile, but has no time played.`);
    }
    let str = `\`\`\`${name}${(name.endsWith('s') ? '' : '\'s')} Overwatch statistics:\`\`\``;
    if (tag !== config.battle_net_tag) {
      str += `<${url}>\n`;
    }
    if (stats.qpTime) {
      str += `\`\`Quick Play: Level ${stats.level} - ${stats.qpTime} played - Top Heroes:\`\``;
      for (let i = 0; i < stats.qpHeroes.length; i++) {
        if (stats.qpHeroes[i].data.timePlayed !== '--') {
          str += `\n\`\`${(i + 1)}.\`\` **${stats.qpHeroes[i].name}** - ${stats.qpHeroes[i].data.timePlayed}`;
        }
      }
    }
    if (stats.rankedTime) {
      const r = stats.rank === '' ? '(not placed)' : stats.rank;
      str += `\n\`\`Competitive Play: Rank ${r} - ${stats.rankedTime} played - Top Heroes:\`\``;
      for (let i = 0; i < stats.rankedHeroes.length; i++) {
        if (stats.rankedHeroes[i].data.timePlayed !== '--') {
          str += `\n\`\`${(i + 1)}.\`\` **${stats.rankedHeroes[i].name}** - ${stats.rankedHeroes[i].data.timePlayed}`;
        }
      }
    }
    m.channel.sendMessage(str);
    return null;
  }
};

function sortHeroes(arr) {
  arr.sort((a, b) => {
    let aa = a.data.timePlayed.split(' ');
    let bb = b.data.timePlayed.split(' ');
    let ad = moment.duration(parseInt(aa[0]), aa[1])._milliseconds;
    let bd = moment.duration(parseInt(bb[0]), bb[1])._milliseconds;
    return bd - ad;
  });
  return arr;
}
