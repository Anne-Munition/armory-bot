'use strict';
const eightBallResponses = require('../assets/8ball.json'), //Array of responses an 8ball would make
    gm = require('gm'), //GraphicsMagik module
    cheerio = require('cheerio'), //HTML scraper (HTML string to JQuery object)
    moment = require('moment'),
    request = require('request'),
    fs = require('fs'),
    path = require('path'),
    utils = require('./utilities.js')(),
    evaluate = require('static-eval'),
    parse = require('esprima').parse;

module.exports = function (options, discord, mongo, twitter) {
    const hat = require('./hat.js')(options, discord);

    discord.client.on('message', (message) => { //A message was sent in a Discord channel
        if (message.author.id == discord.client.user.id) return; //Exit if message is from self(bot)
        if (message.content.startsWith(options.commands.prefix)) handleCommands(message); //If the first part of the message is the command prefix handle commands
    });

    //A command was ran, send to proper function
    function handleCommands(message) {
        if (!message.channel.isPrivate) { //Log command usage
            utils.log("[" + message.server.name + "] {#" + message.channel.name + "} <" + message.author.username + "> " + message.content);
        } else {
            utils.log("[PRIVATE] <" + message.author.username + "> " + message.content);
        }
        let query = message.content.substring(options.commands.prefix.length, message.length).split(' '); //Remove prefix and split into an array
        let cmd = query.shift().toLowerCase(); //Get command out of the message
        switch (cmd) { //Determine which command was run
            case '8ball':
                ask8Ball(message, query);
                break;
            case 'shame':
                shame(message);
                break;
            case 'giphy':
                giphy(message, query);
                break;
            case 'avatar':
                avatar(message);
                break;
            case 'restart':
            case 'reboot':
                restart(message);
                break;
            case 'join':
                join(message);
                break;
            case 'tweets':
                tweets(message, query);
                break;
            case 'welcome':
                welcome(message, query);
                break;
            case 'hat':
                hat.process(message, query);
                break;
            case 'perms':
                perms(message, query);
                break;
            case 'ow':
                ow(message, query);
                break;
            case 'q':
            case 'queue':
                owQueue(cmd, message, query);
                break;
            case 'b':
            case 'bump':
                owBump(message, query);
                break;
            case 'n':
            case 'next':
                owNext(message, query);
                break;
            case 'f':
            case 'flush':
                owFlush(message);
                break;
            case 'math':
                discord.client.reply(message, "**" + evaluate(parse(query.join(' ')).body[0].expression) + "**");
                break;
            case 'roll':
                roll(query, (str) => {
                    discord.client.reply(message, str);
                });
                break;
        }
    }

    //Dice Roll
    function roll(query, callback) {
        if (!query[0]) return;
        let t = new RegExp("^[1-9]\\d*$"); //only a number
        if (t.test(query[0])) {
            if (callback) callback("**" + utils.getRandomInt(1, parseInt(query[0]) + 1) + "**");
            return;
        }
        t = new RegExp("\\d*d[1-9]\\d*", 'g');
        let myArray,
            dice = [];
        while ((myArray = t.exec(query[0])) !== null) {
            dice.push({
                text: myArray[0].startsWith("d") ? "1" + myArray[0] : myArray[0],
                pos: {
                    start: t.lastIndex - myArray[0].length,
                    end: t.lastIndex - 1
                }
            });
        }
        let exploded = query[0].split('');
        let _exploded = query[0].split('');
        dice.forEach((die) => {
            let s = "(";
            let _s = "(";
            let a = die.text.split('d');
            for (let i = 0; i < a[0]; i++) {
                let r = utils.getRandomInt(1, parseInt(a[1]) + 1);
                if (r == 1 || r == parseInt(a[1])) {
                    _s += "**" + r + "**";
                } else {
                    _s += r;
                }
                s += r;
                if (i < a[0] - 1) {
                    s += "+";
                    _s += "+";
                }
            }
            s += ")";
            _s += ")";
            for (let j = die.pos.start; j <= die.pos.end; j++) {
                delete exploded[j];
                delete _exploded[j];
            }
            exploded[die.pos.start] = s;
            _exploded[die.pos.start] = _s;
        });
        let m = exploded.join('');
        let r = evaluate(parse(m).body[0].expression);
        if (r == null || r == undefined || !parseInt(r)) return;
        if (callback) {
            if (dice.length < 2 && dice[0].text.split('d')[0] == 1) {
                callback("**" + r + "**");
            } else {
                callback(_exploded.join('') + " = **" + r + "**");
            }
        }
    }

    //8ball answers
    function ask8Ball(message, query) {
        if (query.length == 0) return; //Return if no 'question' was asked
        let response = eightBallResponses[utils.getRandomInt(0, eightBallResponses.length)]; //Get random response
        if (message.author.id == '84770528526602240' && query[query.length - 1].endsWith("?")) response = "Of course!"; //If the last char is a '?' do troll response for DBKynd only :D
        discord.typeReply(message, response); //Reply with @ mention
    }

    //Upload shame.gif
    function shame(message) {
        discord.client.sendFile(message, path.join(__dirname, "../assets/shame.gif"), "shame.gif");
    }

    //Gets G rated random giphy result from the supplied query
    function giphy(message, query) {
        if (query.length == 0) return;
        let limit = 10;
        let results = [];
        query = query.join(" ");
        let url = "http://api.giphy.com/v1/gifs/search?q=" + query + "&api_key=dc6zaTOxFJmzC&fmt=json&limit=" + limit;
        request.get({
            url: encodeURI(url),
            json: true
        }, (err, res, body) => {
            if (err || res.statusCode != 200) return discord.typeMessage(message, "Error getting giphy results for: ``" + query + "``");
            results = body.data;
            if (results.length == 0) return discord.typeMessage(message, "No Giphy results found for ``" + query + "``");
            if (results.length < limit) limit = results.length;
            let count = 0;
            getRandomGiphy(query);

            function getRandomGiphy(query) {
                function next() {
                    count++;
                    if (count < limit) {
                        getRandomGiphy(query);
                    } else {
                        discord.typeMessage(message, "No acceptable Giphy results found for ``" + query + "``");
                    }
                }

                let r = utils.getRandomInt(0, results.length);
                let gif = results[r];
                results = results.splice(r, 1);
                let image = utils.get(gif, "images.original");
                if (gif.rating == "r" || gif.type != "gif" || !image || image.size > 8000000) return next();
                discord.typeMessage(message, "``" + query + "``\n" + image.url);
            }
        });
    }

    //Uploads users avatar to chat
    function avatar(message) {
        let url = message.author.avatarURL;
        if (!url) return discord.typeReply(message, "You do not have a custom avatar.");
        request.get({url: encodeURI(url), encoding: null}, (err, res, buffer) => {
            if (!err && res.statusCode == 200) {
                discord.client.sendFile(message, buffer, message.author.id + ".jpg", "``" + (message.server.detailsOf(message.author).nick || message.author.username) + "``");
            } else {
                discord.typeReply(message, "There was an error getting your avatar.");
            }
        })
    }

    //Force quits the app. Need to have a method in place to auto start the script on crash (forever-service)
    function restart(message) {
        if (message.author.id == message.server.owner.id || message.author.id == "84770528526602240") {
            process.exit();
        }
    }

    //Posts join message and url for users to follow, to get the bot joined to their server
    function join(message) {
        discord.typeMessage(message, "Follow this link to add **" + discord.client.user.name + "** to your Discord server:\n" +
            "<https://discordapp.com/oauth2/authorize?&client_id=" + options.bot_app_id + "&scope=bot>");
    }

    //List add or remove channels to post tweets to
    function tweets(message, query) {
        if (query[0] == 'list') {
            mongo.twitterChannels.find({server_id: message.server.id}, (err, channels) => {
                if (err) return utils.log(JSON.stringify(err));
                let str = "Tweets from '" + twitter.getName() + "' are pushed to channel(s):\n\n";
                let names = [];
                for (let i = 0; i < channels.length; i++) {
                    let channel = discord.client.channels.get('id', channels[i].channel_id);
                    if (!channel) continue;
                    names.push("*#" + channel.name + "*");
                }
                if (names.length == 0) {
                    discord.typeMessage(message, "No channels on this server currently receive tweets from '" + twitter.getName() + "'.");
                    return;
                }
                str += names.join("\n");
                discord.typeMessage(message, str); //Send List of twitter feed channels
            });
        } else {
            mongo.twitterChannels.find({channel_id: message.channel.id}, (err, channels) => { //Search database for existing entry
                if (err) return utils.log(JSON.stringify(err));
                switch (query[0]) {
                    case 'add':
                        if (channels.length != 0) {
                            discord.typeMessage(message, "This channel already receives tweets from '" + twitter.getName() + "'.");
                        } else {
                            let entry = new mongo.twitterChannels({
                                server_id: message.server.id,
                                channel_id: message.channel.id
                            });
                            entry.save((err) => {
                                if (err) return utils.log(JSON.stringify(err));
                                discord.typeMessage(message, "This channel will now receives tweets from '" + twitter.getName() + "'.");
                            });
                        }
                        break;
                    case 'remove':
                        if (channels.length == 0) {
                            discord.typeMessage(message, "This channel doesn't receive tweets from '" + twitter.getName() + "'.");
                            return;
                        }
                        mongo.twitterChannels.remove({_id: channels[0]._id}, (err) => {
                            if (err) return utils.log(JSON.stringify(err));
                            discord.typeMessage(message, "This channel will no longer receive tweets from '" + twitter.getName() + "'.");
                        });
                        break;
                    default:
                        discord.typeMessage(message, "``" + options.commands.prefix + "tweets < list | add | remove >``");
                        break;
                }
            });
        }
    }

    //List add or remove channels to post join / part messages to
    function welcome(message, query) {
        if (query[0] == 'list') {
            mongo.welcomeChannels.find({server_id: message.server.id}, (err, channels) => {
                if (err) return utils.log(JSON.stringify(err));
                let str = "Welcome messages are posted in channel(s):\n\n";
                let names = [];
                for (let i = 0; i < channels.length; i++) {
                    let channel = discord.client.channels.get('id', channels[i].channel_id);
                    if (!channel) continue;
                    names.push("*#" + channel.name + "*");
                }
                if (names.length == 0) {
                    discord.typeMessage(message, "No channels on this server currently post a welcome message.");
                    return;
                }
                str += names.join("\n");
                discord.typeMessage(message, str); //Send List of twitter feed channels
            });
        } else {
            mongo.welcomeChannels.find({channel_id: message.channel.id}, (err, channels) => { //Search database for existing entry
                if (err) return utils.log(JSON.stringify(err));
                switch (query[0]) {
                    case 'add':
                        if (channels.length != 0) {
                            discord.typeMessage(message, "This channel already posts welcome messages.");
                        } else {
                            let entry = new mongo.welcomeChannels({
                                server_id: message.server.id,
                                channel_id: message.channel.id
                            });
                            entry.save((err) => {
                                if (err) return utils.log(JSON.stringify(err));
                                discord.typeMessage(message, "This channel will now post welcome messages.");
                            });
                        }
                        break;
                    case 'remove':
                        if (channels.length == 0) {
                            discord.typeMessage(message, "This channel doesn't post welcome messages.");
                            return;
                        }
                        mongo.welcomeChannels.remove({_id: channels[0]._id}, (err) => {
                            if (err) return utils.log(JSON.stringify(err));
                            discord.typeMessage(message, "This channel will no longer post welcome messages.");
                        });
                        break;
                    default:
                        discord.typeMessage(message, "``" + options.commands.prefix + "welcome < list | add | remove >``");
                        break;
                }
            });
        }
    }

    //Future permissions check for commands
    function perms(message, query) {
        discord.typeMessage(message, "WIP");
    }

    //Scrape Overwatch stats to show in Discord
    function ow(message, query) {
        let tag = options.battle_net_tag;
        if (query[0]) tag = query[0];
        if (tag.indexOf("#") == -1) return discord.typeReply(message, "Invalid format for lookup. ``" + options.commands.prefix + "ow name#id``");
        let name = tag.split("#")[0];
        let regions = ["us", "eu"]; // us | eu | cn | kr
        let count = 0;
        let results = {};
        regions.forEach((region) => {
            let url = encodeURI("https://playoverwatch.com/en-us/career/pc/" + region + "/" + tag + "/").replace("#", "-");
            getStatsPage(url, region);
        });

        function getStatsPage(url, region) {
            request.get(url, (err, res, body) => {
                if (err || res.statusCode != 200) {
                    scrapeData(null, url, region);
                } else {
                    scrapeData(body, url, region);
                }
            });
        }

        function scrapeData(html, url, region) {
            if (!html) {
                next(null, url, region);
                return;
            }
            let $ = cheerio.load(html);
            let level = parseInt($('.player-level').text().trim());
            let prestige_image = $('.player-rank').attr('style');

            if (prestige_image == "background-image:url(https://blzgdapipro-a.akamaihd.net/game/playerlevelrewards/0x0250000000000926_Rank.png)") {
                level += 100;
            } else if (prestige_image == "background-image:url(https://blzgdapipro-a.akamaihd.net/game/playerlevelrewards/0x0250000000000923_Rank.png)") {
                level += 200;
            } else if (prestige_image == "background-image:url(https://blzgdapipro-a.akamaihd.net/game/playerlevelrewards/0x0250000000000934_Rank.png)") {
                level += 300;
            } else if (prestige_image == "background-image:url(https://blzgdapipro-a.akamaihd.net/game/playerlevelrewards/0x0250000000000935_Rank.png)") {
                level += 400;
            } else if (prestige_image == "background-image:url(https://blzgdapipro-a.akamaihd.net/game/playerlevelrewards/0x025000000000092F_Rank.png)") {
                level += 500;
            }

            let rank = $('.competitive-rank').text().trim();
            let qp_time = null;
            try {
                let qp = $('#quick-play .career-stats-section div[data-category-id="0x02E00000FFFFFFFF"]')[0].children[6].children[0].children[0].children[1].children;
                qp.forEach((row) => {
                    let text = $(row).text().trim();
                    if (text.includes("Time Played")) {
                        qp_time = text.split("Time Played")[1];
                    }
                });
            } catch (e) {
            }
            let ranked_time = null;
            try {
                let ranked = $('#competitive-play .career-stats-section div[data-category-id="0x02E00000FFFFFFFF"]')[0].children[6].children[0].children[0].children[1].children;
                ranked.forEach((row) => {
                    let text = $(row).text().trim();
                    if (text.includes("Time Played")) {
                        ranked_time = text.split("Time Played")[1];
                    }
                });
            } catch (e) {
            }
            let qp_heroes = [];
            try {
                let heroes = $('#quick-play .hero-comparison-section div[data-category-id="overwatch.guid.0x0860000000000021"]')[0];
                for (let i = 0; i < 5; i++) {
                    let hero = $(heroes).children()[i];
                    let name = $(hero).find('.title').text().trim();
                    let time = $(hero).find('.description').text().trim();
                    qp_heroes.push({name: name, time: time});
                }
            } catch (e) {
            }
            let ranked_heroes = [];
            try {
                let heroes = $('#competitive-play .hero-comparison-section div[data-category-id="overwatch.guid.0x0860000000000021"]')[0];
                for (let i = 0; i < 5; i++) {
                    let hero = $(heroes).children()[i];
                    let name = $(hero).find('.title').text().trim();
                    let time = $(hero).find('.description').text().trim();
                    ranked_heroes.push({name: name, time: time});
                }
            } catch (e) {
            }
            next({
                level: level,
                rank: rank,
                qp_time: qp_time,
                ranked_time: ranked_time,
                qp_heroes: qp_heroes,
                ranked_heroes: ranked_heroes
            }, url, region);
        }

        function next(data, url, region) {
            if (data) {
                results[region] = {
                    data: data,
                    url: url
                };
            }
            count++;
            if (count >= regions.length) {
                if (Object.keys(results).length === 0 && results.constructor === Object) return discord.typeReply(message, "Error getting stats for ``" + name + "``");
                let highest_level = 0;
                let highest_region = "";
                regions.forEach((region) => {
                    if (results[region]) {
                        if (results[region].data.level > highest_level) {
                            highest_level = results[region].data.level;
                            highest_region = region;
                        }
                    }
                });
                showResults(results[highest_region].data, results[highest_region].url);
            }
        }

        function showResults(stats, url) {
            if (!stats.qp_time && !stats.ranked_time) return discord.typeReply(message, "``" + name + "`` has an Overwatch profile, but has no time played.");
            let str = "```" + name + (name.endsWith("s") ? "'" : "'s") + " Overwatch statistics:```";
            if (tag != options['battle_net_tag']) str += "<" + url + ">\n";
            if (stats.qp_time) {
                str += "``Quick Play: Level " + stats.level + " - " + stats.qp_time + " played - Top Heroes:``";
                for (let i = 0; i < stats.qp_heroes.length; i++) {
                    if (stats.qp_heroes[i].time == "--") continue;
                    str += "\n``" + (i + 1) + ".`` **" + stats.qp_heroes[i].name + "** - " + stats.qp_heroes[i].time;
                }
            }
            if (stats.ranked_time) {
                str += "\n``Competitive Play: Rank " + (stats.rank == "" ? "(not placed)" : stats.rank) + " - " + stats.ranked_time + " played - Top Heroes:``";
                for (let i = 0; i < stats.ranked_heroes.length; i++) {
                    if (stats.ranked_heroes[i].time == "--") continue;
                    str += "\n``" + (i + 1) + ".`` **" + stats.ranked_heroes[i].name + "** - " + stats.ranked_heroes[i].time;
                }
            }
            discord.client.sendMessage(message, str);
        }
    }

    function owQueue(cmd, message, query) {
        if (message.channel.id != "188197329356980224") return;
        mongo.gameQueues.findOne({game: "overwatch"}, (err, result) => {
            if (!err) {
                if (!result) {
                    result = {
                        game: "overwatch",
                        members: []
                    }
                }
                let i = utils.findInArray(result.members, "member_id", message.author.id);
                if ((query.length != 0 && query[0].indexOf("#") == -1) || (i == -1 && query.length == 0)) return discord.client.reply(message, "Please provide your battle.net id. ``" + options.commands.prefix + cmd + " name#id``");
                if (i > -1) return discord.client.reply(message, "You are already in the queue, position (" + (i + 1) + ") - ***" + result.members[i].tag + "***.");
                result.members.push({member_id: message.author.id, tag: query[0]});
                mongo.gameQueues.update({game: "overwatch"}, {members: result.members}, {upsert: true}, (err) => {
                    if (!err) discord.client.reply(message, "You were added to the queue, position (" + result.members.length + ") - ***" + query[0] + "***.");
                });
            }
        });
    }

    function owBump(message, query) {
        if (message.channel.id != "188197329356980224") return;
        if (utils.findInArray(message.server.rolesOfUser(message.author), "id", "188173775995535360") == -1 && utils.findInArray(message.server.rolesOfUser(message.author), "id", "84778943529365504") == -1 && message.author.id != message.server.owner.id) return;
        mongo.gameQueues.findOne({game: "overwatch"}, (err, result) => {
            if (!err) {
                if (!result) {
                    result = {
                        game: "overwatch",
                        members: []
                    }
                }
                if (result.members.length == 0) return discord.client.sendMessage(message, "The queue is empty.");
                let pos = 0;
                if (query.length != 0) {
                    let i = utils.findInArray(result.members, "member_id", query[0].substring(2, query[0].length - 1).replace("!", ""));
                    if (i != -1) pos = i;
                }
                let bumped = result.members.splice(pos, 1);
                mongo.gameQueues.update({game: "overwatch"}, {members: result.members}, {upsert: true}, (err) => {
                    if (!err) {
                        let member = message.server.members.get("id", bumped[0].member_id);
                        let str = (message.server.detailsOf(member).nick || member.username) + ", ***" + bumped[0].tag + "*** - was removed from the queue.\n\n";
                        str += getNextList(result, message, 6, true);
                        discord.client.sendMessage(message, str);
                    }
                });
            }
        });
    }

    function owNext(message, query) {
        if (message.channel.id != "188197329356980224") return;
        mongo.gameQueues.findOne({game: "overwatch"}, (err, result) => {
            if (!err) {
                if (!result) {
                    result = {
                        game: "overwatch",
                        members: []
                    }
                }
                if (result.members.length == 0) return discord.client.sendMessage(message, "The queue is empty.");
                let count;
                if (query.length != 0 && (utils.findInArray(message.server.rolesOfUser(message.author), "id", "188173775995535360") != -1 || utils.findInArray(message.server.rolesOfUser(message.author), "id", "84778943529365504") != -1) || message.author.id == message.server.owner.id) {
                    if (query[0] == "*") {
                        count = result.members.length;
                    } else {
                        if (parseInt(query[0])) count = parseInt(query[0]);
                    }
                }
                if (!count) count = 6;
                let str = getNextList(result, message, count, false);
                discord.client.sendMessage(message, str);
            }
        });
    }

    function owFlush(message) {
        if (utils.findInArray(message.server.rolesOfUser(message.author), "id", "84778943529365504") == -1 && message.author.id != message.server.owner.id) return;
        mongo.gameQueues.update({game: "overwatch"}, {members: []}, {upsert: true}, (err) => {
            if (!err) discord.client.sendMessage(message, "The queue was flushed.");
        });
    }

    function getNextList(result, message, count, mention) {
        if (result.members.length == 0) return "The queue is empty.";
        if (count > result.members.length) count = result.members.length;
        let str = "```Up next to be pulled into the 'On Deck' Overwatch team is:```\n";
        for (let i = 0; i < count; i++) {
            str += "``" + (i + 1) + ".`` ";
            let member = message.server.members.get("id", result.members[i].member_id);
            if (i <= 1 && mention) {
                str += member;
            } else {
                str += message.server.detailsOf(member).nick || member.username;
            }
            str += " - ***" + result.members[i].tag + "***\n";
        }
        if (result.members.length - count > 0) str += "\nPlus (" + (result.members.length - count) + ") more...";
        return str;
    }
};
