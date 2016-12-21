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
const request = require('request');

// Scrape Overwatch stats to show in Discord
exports.run = (client, msg, params = []) => new Promise((resolve, reject) => {
  // Set ow tag
  const tag = params[0] ? params.join(' ') : config.overwatch.default_battle_tag;
  // Extract name from tag
  const name = tag.split('#')[0];
  // Regions to search through
  // us | eu | cn | kr
  const regions = ['us', 'eu'];
  let platforms;
  // let max;
  if (tag.includes('#')) {
    platforms = ['pc'];
    // max = regions.length * platforms.length;
  } else {
    platforms = ['xbl', 'psn'];
    // max = regions.length * platforms.length;
  }

  const owData = regions.map(region => platforms.map(platform => {
    const i = platform.toString() === 'pc' ? `${region}/` : '';
    return {
      overwatchUri: `https://playoverwatch.com/en-us/career/${platform}/${i}${tag}/`.replace('#', '-'),
      ovrstatUri: `https://ovrstat.com/v1/stats/${platform}/${region}/${tag}/`.replace('#', '-'),
      name,
      tag,
    };
  }));
  logger.debug(owData);

  const statsPromiseArray = owData.map(x => requestOW(x[0].ovrstatUri));

  Promise.all(statsPromiseArray)
    .then(statsResults => {
      let count = -1;
      const scrapePromiseArray = statsResults.map(stats => {
        count++;
        return scrapeData(stats, owData[count]);
      });
      Promise.all(scrapePromiseArray)
        .then(scrapeResults => {
          scrapeResults = scrapeResults.filter(x => x);
          if (scrapeResults.length === 0) {
            msg.reply(`No stats found for **${name}**. Capitalization does count.`).then(resolve).catch(reject);
            return;
          }
          // Get result with the highest level
          const finalStats = scrapeResults.sort((a, b) => b.level - a.level)[0];
          processResults(finalStats, msg).then(resolve).catch(reject);
        })
        .catch(err => {
          msg.channel.sendMessage(`There was an error processing OW stats.`);
          reject(err);
        });
    })
    .catch(err => {
      msg.channel.sendMessage(`There was an error retrieving OW stats.`);
      reject(err);
    });
});

function scrapeData(stats, data) {
  return new Promise(resolve => {
    if (!stats) {
      resolve(null);
      return;
    }
    const level = stats.level + (stats.prestige * 100);
    const rank = stats.rating;

    const qpTime = parseTime(stats.quickPlayStats.topHeros);
    const rankedTime = parseTime(stats.competitiveStats.topHeros);

    const qpHeroes = [];
    if (stats.quickPlayStats) {
      for (const hero in stats.quickPlayStats.topHeros) {
        if (stats.quickPlayStats.topHeros.hasOwnProperty(hero)) {
          qpHeroes.push({ name: utils.capitalize(hero), data: stats.quickPlayStats.topHeros[hero] });
        }
      }
    }

    const rankedHeroes = [];
    if (stats.competitiveStats) {
      for (const hero in stats.competitiveStats.topHeros) {
        if (stats.competitiveStats.topHeros.hasOwnProperty(hero)) {
          rankedHeroes.push({ name: utils.capitalize(hero), data: stats.competitiveStats.topHeros[hero] });
        }
      }
    }

    resolve({
      level,
      rank,
      qpTime,
      rankedTime,
      qpHeroes: sortHeroes(qpHeroes).splice(0, 5),
      rankedHeroes: sortHeroes(rankedHeroes).splice(0, 5),
      overwatchUri: data[0].overwatchUri,
      name: data[0].name,
      tag: data[0].tag,
    });
  });
}

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

function requestOW(uri) {
  return new Promise((resolve, reject) => {
    request.get({
      url: encodeURI(uri),
      json: true,
    }, (err, res, body) => {
      if (err) {
        reject(err);
      } else {
        resolve(res.statusCode === 200 ? body : null);
      }
    });
  });
}

function parseTime(data) {
  const t = moment.duration(0);
  for (const hero in data) {
    if (data.hasOwnProperty(hero)) {
      const arr = data[hero].timePlayed.split(' ');
      const d = moment.duration(parseInt(arr[0]), arr[1]);
      t.add(d);
    }
  }
  const hours = t.asHours().toFixed(0);
  if (hours === 0) {
    const minutes = t.asMinutes().toFixed(0);
    data = `${minutes} minute${minutes === 1 ? '' : 's'}`;
  } else {
    data = `${hours} hour${hours === 1 ? '' : 's'}`;
  }
  return data;
}

function processResults(finalStats, msg) {
  return new Promise((resolve, reject) => {
    if (parseInt(finalStats.qpTime.split(' ')[0]) === 0 && parseInt(finalStats.rankedTime.split(' ')[0]) === 0) {
      msg.reply(`**${finalStats.name}** has an Overwatch profile, but has no time played.`)
        .then(resolve).catch(reject);
      return;
    }
    let str = `Overwatch Statistics - ${finalStats.name}:\n\n`;
    if (finalStats.qpTime) {
      str += `QP: ${finalStats.qpTime} played - Level ${finalStats.level} - Top Heroes =>\n`;
      finalStats.qpHeroes.forEach(h => {
        if (h.data.timePlayed !== '--') {
          const padName = padString(h.name.replace(':', ''), 9);
          const timePlayed = padTime(h.data.timePlayed);
          str += `${(finalStats.qpHeroes.indexOf(h) + 1)}: ${padName} - ${timePlayed}\n`;
        }
      });
      str += '\n';
    }
    if (finalStats.rankedTime) {
      const r = finalStats.rank === '' ? '(not placed)' : finalStats.rank;
      str += `Ranked: ${finalStats.rankedTime} played - Rank ${r} - Top Heroes =>\n`;
      finalStats.rankedHeroes.forEach(h => {
        if (h.data.timePlayed !== '--') {
          const padName = padString(h.name.replace(':', ''), 9);
          const timePlayed = padTime(h.data.timePlayed);
          str += `${(finalStats.rankedHeroes.indexOf(h) + 1)}: ${padName} - ${timePlayed}\n`;
        }
      });
    }

    let code = `\`\`\`qml\n${str}\`\`\``;
    if (config.overwatch.hide_battle_tags.indexOf(finalStats.tag) === -1) {
      code += `<${finalStats.overwatchUri}>\n`;
    }
    msg.channel.sendMessage(code).then(resolve).catch(reject);
  });
}

function padTime(str) {
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
