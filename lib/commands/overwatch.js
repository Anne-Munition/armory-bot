'use strict';
const request = require('request'),
    utils = require('../utilities.js')(),
    moment = require('moment');

module.exports = function (message, query, options) {
    //Scrape Overwatch stats to show in Discord
    let tag = options.battle_net_tag;
    if (query[0]) tag = query.join(" ");
    let name = tag.split("#")[0];
    let regions = ["us", "eu"]; // us | eu | cn | kr
    let platforms;
    let max;
    if (tag.includes("#")) {
        platforms = ["pc"];
        max = regions.length * platforms.length;
    } else {
        platforms = ["xbl", "psn"];
        max = regions.length * platforms.length;
    }
    let count = 0;
    let results = {};

    regions.forEach((region) => {
        platforms.forEach((platform) => {
            let overwatch_url = encodeURI("https://playoverwatch.com/en-us/career/" + platform + "/" + (platform == 'pc' ? region + "/" : "") + tag + "/").replace("#", "-");
            let ovrstat_url = encodeURI("https://ovrstat.com/v1/stats/" + platform + "/" + region + "/" + tag + "/").replace("#", "-");
            getStats(ovrstat_url, overwatch_url, region, platform);
        });
    });


    function getStats(ovrstat_url, overwatch_url, region, platform) {
        request.get({url: ovrstat_url, json: true}, (err, res, body) => {
            if (err || res.statusCode != 200) {
                next(null, overwatch_url, region, platform);
            } else {
                scrapeData(body, overwatch_url, region, platform);
            }
        });
    }

    function scrapeData(data, overwatch_url, region, platform) {
        let level = data.level + (data.prestige * 100);
        let rank = data.rating;
        let qp_time = utils.get(data, "quickPlayStats.careerStats.allHeroes.game.timePlayed");
        let ranked_time = utils.get(data, "competitiveStats.careerStats.allHeroes.game.timePlayed");

        let qp_heroes = [];
        for (let hero in data.quickPlayStats.topHeros) {
            if (data.quickPlayStats.topHeros.hasOwnProperty(hero)) {
                qp_heroes.push({name: utils.capitalize(hero), data: data.quickPlayStats.topHeros[hero]});
            }
        }
        qp_heroes.sort((a, b) => {
            let a2 = a.data.timePlayed.split(" ");
            let b2 = b.data.timePlayed.split(" ");
            let a_duration = moment.duration(parseInt(a2[0]), a2[1])._milliseconds;
            let b_duration = moment.duration(parseInt(b2[0]), b2[1])._milliseconds;
            return b_duration - a_duration;
        });
        qp_heroes = qp_heroes.splice(0, 5);

        let ranked_heroes = [];
        for (let hero in data.competitiveStats.topHeros) {
            if (data.competitiveStats.topHeros.hasOwnProperty(hero)) {
                ranked_heroes.push({name: utils.capitalize(hero), data: data.competitiveStats.topHeros[hero]});
            }
        }
        ranked_heroes.sort((a, b) => {
            let a2 = a.data.timePlayed.split(" ");
            let b2 = b.data.timePlayed.split(" ");
            let a_duration = moment.duration(parseInt(a2[0]), a2[1])._milliseconds;
            let b_duration = moment.duration(parseInt(b2[0]), b2[1])._milliseconds;
            return b_duration - a_duration;
        });
        ranked_heroes = ranked_heroes.splice(0, 5);

        next({
            level: level,
            rank: rank,
            qp_time: qp_time,
            ranked_time: ranked_time,
            qp_heroes: qp_heroes,
            ranked_heroes: ranked_heroes
        }, overwatch_url, region, platform);
    }

    function next(data, overwatch_url, region, platform) {
        if (data) {
            results[region + "|" + platform] = {
                data: data,
                url: overwatch_url
            };
        }
        count++;
        if (count >= max) {
            if (Object.keys(results).length === 0 && results.constructor === Object) return message.reply("No stats found for ``" + name + "``");
            let highest_level = 0;
            let highest_name = "";
            for (let result in results) {
                if (results.hasOwnProperty(result)) {
                    if (results[result].data.level > highest_level) {
                        highest_level = results[result].data.level;
                        highest_name = result;
                    }
                }
            }
            showResults(results[highest_name].data, results[highest_name].url);
        }
    }

    function showResults(stats, url) {
        if (!stats.qp_time && !stats.ranked_time) return message.reply("``" + name + "`` has an Overwatch profile, but has no time played.");
        let str = "```" + name + (name.endsWith("s") ? "'" : "'s") + " Overwatch statistics:```";
        if (tag != options['battle_net_tag']) str += "<" + url + ">\n";
        if (stats.qp_time) {
            str += "``Quick Play: Level " + stats.level + " - " + stats.qp_time + " played - Top Heroes:``";
            for (let i = 0; i < stats.qp_heroes.length; i++) {
                if (stats.qp_heroes[i].data.timePlayed == "--") continue;
                str += "\n``" + (i + 1) + ".`` **" + stats.qp_heroes[i].name + "** - " + stats.qp_heroes[i].data.timePlayed;
            }
        }
        if (stats.ranked_time) {
            str += "\n``Competitive Play: Rank " + (stats.rank == "" ? "(not placed)" : stats.rank) + " - " + stats.ranked_time + " played - Top Heroes:``";
            for (let i = 0; i < stats.ranked_heroes.length; i++) {
                if (stats.ranked_heroes[i].data.timePlayed == "--") continue;
                str += "\n``" + (i + 1) + ".`` **" + stats.ranked_heroes[i].name + "** - " + stats.ranked_heroes[i].data.timePlayed;
            }
        }
        message.channel.sendMessage(str);
    }
};
