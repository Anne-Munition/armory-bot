'use strict';
exports.info = {
  desc: 'Lookup Overwatch Stats / Top Heroes for PC or console.',
  usage: '<battletag | PSN | XB! Name>',
  aliases: [],
};

const config = require('../../config');
const moment = require('moment');
const logger = require('winston');
const utils = require('../utilities');

// Scrape Overwatch stats to show in Discord
exports.run = (client, msg, params = []) => {
  // Get tag from config to start
  let tag = config.overwatch.default_battle_tag;
  // Use supplied tag if exists
  if (params[0]) {
    tag = params.join(' ');
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

  utils.time(msg, 'cpu');
  regions.forEach(r => {
    platforms.forEach(p => {
      const i = p.toString() === 'pc' ? `${r}/` : '';
      const overwatchUri = `https://playoverwatch.com/en-us/career/${p}/${i}${tag}/`.replace('#', '-');
      const ovrstatUri = `https://ovrstat.com/v1/stats/${p}/${r}/${tag}/`.replace('#', '-');
      logger.debug('getstats', ovrstatUri, overwatchUri, r, p);
      getStats(ovrstatUri, overwatchUri, r, p);
    });
  });

  // TODO: Use Promise.all

  function getStats(ovrstatUri, overwatchUri, region, platform) {
    utils.jsonRequest(ovrstatUri)
      .then(body => {
        logger.debug('OK ovrstat response');
        scrapeData(body, overwatchUri, region, platform);
      })
      .catch(err => {
        logger.error('Error getting OW stats from ovrstat', err, ovrstatUri);
        return next(null, overwatchUri, region, platform);
      });
    return null;
  }

  function scrapeData(data, overwatchUri, region, platform) {
    const level = data.level + (data.prestige * 100);
    const rank = data.rating;
    logger.debug(level, rank);

    let qpTime = data.quickPlayStats.topHeros;
    let t = moment.duration(0);
    for (const hero in qpTime) {
      if (qpTime.hasOwnProperty(hero)) {
        const arr = qpTime[hero].timePlayed.split(' ');
        const d = moment.duration(parseInt(arr[0]), arr[1]);
        t.add(d);
      }
    }
    let hours = t.asHours().toFixed(0);
    if (hours === 0) {
      const minutes = t.asMinutes().toFixed(0);
      qpTime = `${minutes} minute${minutes === 1 ? '' : 's'}`;
    } else {
      qpTime = `${hours} hour${hours === 1 ? '' : 's'}`;
    }

    let rankedTime = data.competitiveStats.topHeros;
    t = moment.duration(0);
    for (const hero in rankedTime) {
      if (rankedTime.hasOwnProperty(hero)) {
        const arr = rankedTime[hero].timePlayed.split(' ');
        const d = moment.duration(parseInt(arr[0]), arr[1]);
        t.add(d);
      }
    }
    hours = t.asHours().toFixed(0);
    if (hours === 0) {
      const minutes = t.asMinutes().toFixed(0);
      rankedTime = `${minutes} minute${minutes === 1 ? '' : 's'}`;
    } else {
      rankedTime = `${hours} hour${hours === 1 ? '' : 's'}`;
    }
    logger.debug(qpTime, rankedTime);

    const qpHeroes = [];
    if (data.quickPlayStats) {
      for (const hero in data.quickPlayStats.topHeros) {
        if (data.quickPlayStats.topHeros.hasOwnProperty(hero)) {
          qpHeroes.push({ name: utils.capitalize(hero), data: data.quickPlayStats.topHeros[hero] });
        }
      }
    }

    const rankedHeroes = [];
    if (data.competitiveStats) {
      for (const hero in data.competitiveStats.topHeros) {
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
        msg.reply(`No stats found for \`\`${name}\`\`. Capitalization counts.`);
        utils.finish(msg, exports.name);
        return;
      }
      utils.time(msg, 'io');
      let highestLevel = 0;
      let highestRegion = '';
      for (const result in results) {
        if (results.hasOwnProperty(result)) {
          if (results[result].data.level > highestLevel) {
            highestLevel = results[result].data.level;
            highestRegion = result;
          }
        }
      }
      showResults(results[highestRegion].data, results[highestRegion].url);
    }
  }

  function showResults(stats, url) {
    if (parseInt(stats.qpTime.split(' ')[0]) === 0 && parseInt(stats.rankedTime.split(' ')[0]) === 0) {
      msg.reply(`\`\`${name}\`\` has an Overwatch profile, but has no time played.`);
      utils.finish(msg, exports.name);
      return;
    }
    let str = `Overwatch Statistics - ${name}:\n\n`;
    if (stats.qpTime) {
      str += `QP: ${stats.qpTime} played - Level ${stats.level} - Top Heroes =>\n`;
      stats.qpHeroes.forEach(h => {
        if (h.data.timePlayed !== '--') {
          const padName = utils.pad(h.name.replace(':', ''), 9);
          const timePlayed = padTime(h.data.timePlayed);
          str += `${(stats.qpHeroes.indexOf(h) + 1)}: ${padName} - ${timePlayed}\n`;
        }
      });
      str += '\n';
    }
    if (stats.rankedTime) {
      const r = stats.rank === '' ? '(not placed)' : stats.rank;
      str += `Ranked: ${stats.rankedTime} played - Rank ${r} - Top Heroes =>\n`;
      stats.rankedHeroes.forEach(h => {
        if (h.data.timePlayed !== '--') {
          const padName = utils.pad(h.name.replace(':', ''), 9);
          const timePlayed = padTime(h.data.timePlayed);
          str += `${(stats.rankedHeroes.indexOf(h) + 1)}: ${padName} - ${timePlayed}\n`;
        }
      });
    }

    let code = `\`\`\`qml\n${str}\`\`\``;
    if (config.overwatch.hide_battle_tags.indexOf(tag) === -1) {
      code += `<${url}>\n`;
    }
    utils.finish(msg, exports.name);
    msg.channel.sendMessage(code);
  }
};

function sortHeroes(arr) {
  arr.sort((a, b) => {
    const c = a.data.timePlayed.split(' ');
    const d = b.data.timePlayed.split(' ');
    const e = moment.duration(parseInt(c[0]), c[1])._milliseconds;
    const f = moment.duration(parseInt(d[0]), d[1])._milliseconds;
    return f - e;
  });
  return arr;
}

function padTime(str) {
  let i = str.split(' ')[0].split('').length;
  for (i; i < 3; i++) {
    str = ` ${str}`;
  }
  return str;
}
