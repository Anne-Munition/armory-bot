'use strict';
const eightBallResponses = require('../assets/8ball.json'), //Array of responses an 8ball would make
    gm = require('gm'), //GraphicsMagik module
    cheerio = require('cheerio'), //HTML scraper (HTML string to JQuery object)
    moment = require('moment'),
    jsonfile = require('jsonfile'),
    request = require('request'),
    fs = require('fs'),
    path = require('path');

module.exports = function (utils, options, discord, mongo, twitter, queueList) {

    discord.client.on('message', (message) => { //A message was sent in a Discord channel
        if (message.author.id == discord.client.user.id) return; //Exit if message is from self(bot)
        if (message.content.startsWith(options.commands.prefix)) handleCommands(message); //If the first part of the message is the command prefix handle commands
    });

    //A command was ran, send to proper function
    function handleCommands(message) {
        if (!message.channel.isPrivate) { //Log command usage
            utils.log("[" + message.channel.server.name + "] {#" + message.channel.name + "} <" + message.author.username + "> " + message.content);
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
                hat(message, query);
                break;
            case 'mentions':
                mentions(message, query);
                break;
            case 'perms':
                perms(message, query);
                break;
            case 'ow':
                ow(message, query);
                break;
            case 'q':
            case 'queue':
                queue(message, query);
                break;
            case 'b':
            case 'bump':
                bump(message, query);
                break;
            case 'n':
            case 'next':
                next(message, query);
                break;
            case 'f':
            case 'flush':
                flush(message);
                break;
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
                discord.client.sendFile(message, buffer, message.author.id + ".jpg", "``" + (message.channel.server.detailsOf(message.author).nick || message.author.username) + "``");
            } else {
                discord.typeReply(message, "There was an error getting your avatar.");
            }
        })
    }

    //Force quits the app. Need to have a method in place to auto start the script on crash (forever-service)
    function restart(message) {
        if (message.author.id == options.owner_id || message.author.id == "84770528526602240") {
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
            mongo.twitterChannelsModel.find({server_id: message.channel.server.id}, (err, channels) => {
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
            mongo.twitterChannelsModel.find({channel_id: message.channel.id}, (err, channels) => { //Search database for existing entry
                if (err) return utils.log(JSON.stringify(err));
                switch (query[0]) {
                    case 'add':
                        if (channels.length != 0) {
                            discord.typeMessage(message, "This channel already receives tweets from '" + twitter.getName() + "'.");
                        } else {
                            let entry = new mongo.twitterChannelsModel({
                                server_id: message.channel.server.id,
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
                        mongo.twitterChannelsModel.remove({_id: channels[0]._id}, (err) => {
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
            mongo.welcomeChannelsModel.find({server_id: message.channel.server.id}, (err, channels) => {
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
            mongo.welcomeChannelsModel.find({channel_id: message.channel.id}, (err, channels) => { //Search database for existing entry
                if (err) return utils.log(JSON.stringify(err));
                switch (query[0]) {
                    case 'add':
                        if (channels.length != 0) {
                            discord.typeMessage(message, "This channel already posts welcome messages.");
                        } else {
                            let entry = new mongo.welcomeChannelsModel({
                                server_id: message.channel.server.id,
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
                        mongo.welcomeChannelsModel.remove({_id: channels[0]._id}, (err) => {
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

    //Downloads users avatar and  composites a selectable hat over it then send it back as a PM
    function hat(message, query) {
        let url = message.author.avatarURL;
        if (!url) {
            discord.typeReply(message, "Cannot perform this operation because you do not have a custom avatar.");
            return;
        }
        if (!query[0] || query[0] == 'help') {
            discord.client.sendMessage(message, ":mailbox_with_mail:");
            sendHatFormatMessage();
            return;
        }
        if (!message.channel.isPrivate) {
            discord.client.sendMessage(message, ":mailbox_with_mail:");
            sendHatFormatMessage();
        }

        function sendHatFormatMessage() {
            discord.client.sendMessage(message.author, "```Examples:\n" + options.commands.prefix + "hat <name> <Xoffset> <Yoffset> <scale> <rotation>\n" +
                options.commands.prefix + "hat xmas 0 20 0.9 45\nHats: xmas```");
        }

        let x = 0; //Entered shift amount X
        let y = 0; //Entered shift amount Y
        let s = 0; //Entered Scale amount
        let r = 0; //Entered Rotation Amount

        try {
            if (query[1]) x = parseInt(query[1]);
            if (query[2]) y = -parseInt(query[2]);
            if (query[3]) {
                if (query[3].indexOf(".") == -1) { //%
                    s = parseInt(query[3]);
                } else {
                    s = parseFloat(query[3]) * 100;
                }
            }
            if (query[4]) r = parseInt(query[4]);
        } catch (e) {
            discord.typeMessage(message.author, "Format error. Type ``" + options.commands.prefix + "hat`` to see usage options.");
            return;
        }

        let hatFile = path.join(__dirname, "../assets/hats/" + query[0] + ".png");

        fs.exists(hatFile, (exists) => {
            if (!exists) {
                discord.typeMessage(message.author, "'" + query[0] + "' is not a registered hat.");
            } else {
                let hatData = {
                    hatFile: hatFile,
                    x: x,
                    y: y,
                    s: s,
                    r: r
                };
                discord.client.sendMessage(message.author, "Processing...", () => {
                    loadHat(hatData)
                        .then(getHatSize)
                        .then(downloadAvatar)
                        .then(modifyHat)
                        .then(getModifiedHatSize)
                        .then(saveModifiedHat)
                        .then(applyHatComposite)
                        .then((hatData) => {
                            discord.client.sendFile(message.author, hatData.avatarBufferEdited, message.author.id + "_" + query[0] + ".png", () => {
                                fs.unlink(hatData.tempHatPath);
                            });
                        })
                        .catch((err) => {
                            utils.log("hat error: " + JSON.stringify(err));
                            discord.typeMessage(message, "Error processing your '" + query[0] + "' hat. Please try again...");
                        });
                });
            }
        });

        function loadHat(hatData) {
            return new Promise((resolve, reject) => {
                fs.readFile(hatData.hatFile, (err, buffer) => {
                    if (err) {
                        reject(err);
                    } else {
                        hatData.hatBuffer = buffer;
                        resolve(hatData);
                    }
                })
            });
        }

        function getHatSize(hatData) {
            return new Promise((resolve, reject) => {
                gm(hatData.hatBuffer)
                    .size((err, hatSize) => {
                        if (err) {
                            reject(err);
                        } else {
                            hatData.hatSize = hatSize;
                            hatData.startX = (128 - hatSize.width) / 2;
                            hatData.startY = (128 - hatSize.height) / 2;
                            resolve(hatData);
                        }
                    });
            });
        }

        function downloadAvatar(hatData) {
            return new Promise((resolve, reject) => {
                request.get({url: url, encoding: null}, (err, res, avatarBuffer) => {
                    if (err || res.statusCode != 200) {
                        (err) ? reject(err) : reject(statusCode);
                    } else {
                        hatData.avatarBuffer = avatarBuffer;
                        resolve(hatData);
                    }
                });
            });
        }

        function modifyHat(hatData) {
            return new Promise((resolve, reject) => {
                gm(hatData.hatBuffer)
                    .scale(hatData.s.toString() + "%" + hatData.s.toString() + "%")
                    .rotate("#FFFF", hatData.r)
                    .toBuffer('PNG', (err, hatBufferEdited) => {
                        if (err) {
                            reject(err);
                        } else {
                            hatData.hatBufferEdited = hatBufferEdited;
                            resolve(hatData);
                        }
                    });
            });
        }

        function getModifiedHatSize(hatData) {
            return new Promise((resolve, reject) => {
                gm(hatData.hatBufferEdited)
                    .size((err, hatModifiedSize) => {
                        if (err) {
                            reject(err);
                        } else {
                            let shiftX = (hatData.hatSize.width - hatModifiedSize.width) / 2;
                            let shiftY = (hatData.hatSize.height - hatModifiedSize.height) / 2;
                            hatData.endX = hatData.startX + shiftX + hatData.x;
                            hatData.endY = hatData.startY + shiftY + hatData.y;
                            resolve(hatData);
                        }
                    });
            });
        }

        function saveModifiedHat(hatData) {
            return new Promise((resolve, reject)=> {
                let tempHatPath = path.join(__dirname, "../temp/hat_" + message.author.id + "_" + query[0] + ".png");
                fs.writeFile(tempHatPath, hatData.hatBufferEdited, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        hatData.tempHatPath = tempHatPath;
                        resolve(hatData);
                    }
                });
            });
        }

        function applyHatComposite(hatData) {
            return new Promise((resolve, reject) => {
                gm(hatData.avatarBuffer)
                    .composite(hatData.tempHatPath)
                    .geometry(((hatData.endX >= 0) ? "+" + hatData.endX.toString() : hatData.endX.toString()) + ((hatData.endY >= 0) ? "+" + hatData.endY.toString() : hatData.endY.toString()))
                    .toBuffer('PNG', (err, avatarBufferEdited) => {
                        if (err) {
                            reject(err);
                        } else {
                            hatData.avatarBufferEdited = avatarBufferEdited;
                            resolve(hatData);
                        }
                    });
            });
        }
    }

    //Searches chat logs for up to 5000 messages to try and find mentions
    function mentions(message, query) {
        if (message.channel.isPrivate) return;
        let max = parseInt(query[0]) || 500;
        if (max > 10000) max = 10000;
        let responses = [];
        let count = 0;
        let delay = 1000;

        discord.client.sendMessage(message, ":mailbox_with_mail:");
        discord.client.sendMessage(message.author, "Searching for @ mentions. Estimated time: " + Math.floor(((delay / 1000) * (max / 100)) + 5) + " seconds.");

        function next(err, lastMessage) {
            if (err) return;
            count += 100;
            if (count >= max || !lastMessage) {
                processLogs();
            } else {
                getLogs(lastMessage);
            }
        }

        getLogs(message);

        function getLogs(msg) {
            setTimeout(() => {
                discord.client.getChannelLogs(message, 100, {before: msg}, (err, messages) => {
                    if (err) {
                        discord.typeMessage(message.author, "There was an error searching for @ mentions in #" + message.channel.name + ".``");
                        next(true);
                    } else {
                        if (messages.length != 100) {
                            extractMentions(messages);
                            next(null, null);
                            return;
                        }
                        extractMentions(messages);
                        next(null, messages[messages.length - 1]);
                    }
                });
            }, delay);
        }

        function extractMentions(messages) {
            for (let msg in messages) {
                if (messages.hasOwnProperty(msg)) {
                    if (messages[msg].mentions.length > 0) {
                        for (let mention in messages[msg].mentions) {
                            if (messages[msg].mentions.hasOwnProperty(mention)) {
                                if (messages[msg].mentions[mention].id == message.author.id) {
                                    responses.push(messages[msg]);
                                }
                            }
                        }
                    } else if (messages[msg].everyoneMentioned == true) {
                        responses.push(messages[msg]);
                    }
                }
            }
        }

        function processLogs() {
            if (responses.length == 0) {
                discord.typeMessage(message.author, "``No mentions were found in #" + message.channel.name + ".``");
                return;
            }
            let chunks = [];
            let header = "```Mentions from #" + message.channel.name + ".```\n";

            function nextChunk(start) {
                if (start) {
                    chunk(start);
                } else {
                    for (let i = chunks.length - 1; i >= 0; i--) {
                        discord.typeMessage(message.author, header + chunks[i]);
                    }
                }
            }

            chunk(responses.length - 1);

            function chunk(start) {
                let str = "";
                for (let i = start; i >= 0; i--) {
                    let d = moment(responses[i].timestamp).fromNow();
                    let strToAdd = "``" + responses[i].author.username + " - " + d + "``\n" + responses[i].content + "\n\n";
                    let combined_length = str.length + strToAdd.length + header.length;
                    if (combined_length > 2000) {
                        chunks.push(str);
                        nextChunk(i);
                        return;
                    } else {
                        str += strToAdd;
                    }
                }
                chunks.push(str);
                nextChunk(null);
            }
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
            if (prestige_image == "background-image:url(https://d1u1mce87gyfbn.cloudfront.net/game/playerlevelrewards/0x0250000000000922_Rank.png)") {
                level += 100;
            } else if (prestige_image == "background-image:url(https://d1u1mce87gyfbn.cloudfront.net/game/playerlevelrewards/0x025000000000092C_Rank.png)") {
                level += 200;
            } else if (prestige_image == "background-image:url(https://d1u1mce87gyfbn.cloudfront.net/game/playerlevelrewards/0x0250000000000945_Rank.png)") {
                level += 300;
            }
            let game_hours = $($($($('div[data-group-id=stats]').children()[6]).find('tbody').children()[5]).children()[1]).text().trim();
            let heroes = $('.progress-category')[0];
            let hero_data = [];
            for (let i = 0; i < 5; i++) {
                let hero = $(heroes).children()[i];
                let name = $(hero).find('.title').text().trim();
                let time = $(hero).find('.description').text().trim();
                hero_data.push({name: name, time: time});
            }
            next({
                level: level,
                game_hours: game_hours,
                heroes: hero_data

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
            if (stats.game_hours == "") return discord.typeReply(message, "``" + name + "`` has an Overwatch profile, but has no time played.");
            let str = "```" + name + (name.endsWith("s") ? "'" : "'s") + " Overwatch level: " + stats.level + ". Time Played: " + stats.game_hours + ". Top heroes: ```";
            if (tag != options.battle_net_tag) str += "<" + url + ">\n";
            for (let i = 0; i < stats.heroes.length; i++) {
                str += "\n``" + (i + 1) + ".`` **" + stats.heroes[i].name + "** - " + stats.heroes[i].time;
            }
            discord.typeReply(message, str);
        }
    }

    function queue(message, query) {
        if (message.channel.id != "188197329356980224") return;
        let n = getPosition(queueList, message.author.id);
        if ((query.length != 0 && query[0].indexOf("#") == -1) || (n == -1 && query.length == 0)) return discord.client.reply(message, "Please provide your battle.net tag. ``" + options.commands.prefix + "queue name#id``");
        if (n > -1) return discord.client.reply(message, "You are already in the queue, position (" + (n + 1) + ") - ***" + queueList[n].tag + "***.");
        queueList.push({id: message.author.id, tag: query[0]});
        saveQueue((err) => {
            if (err) {
                queueList.pop();
            } else {
                discord.client.reply(message, "You were added to the queue, position (" + queueList.length + ") - ***" + queueList[queueList.length - 1].tag + "***.");
            }
        });
    }

    function getPosition(list, id) {
        for (let i = 0; i < list.length; i++) {
            if (id == list[i].id) {
                return i;
            }
        }
        return -1;
    }

    function saveQueue(callback) {
        jsonfile.writeFile(path.join(__dirname, "../assets/queue.json"), queueList, (err) => {
            if (err) {
                utils.log(JSON.stringify(err));
                discord.client.sendMessage(message, "There was an error saving the queue list.");
                callback(true);
            } else {
                callback(false);
            }
        });
    }

    function bump(message, query) {
        if (message.channel.id != "188197329356980224") return;
        if (getPosition(message.channel.server.rolesOfUser(message.author), "188173775995535360") == -1 && getPosition(message.channel.server.rolesOfUser(message.author), "84778943529365504") == -1 && message.author.id != "84761911010267136") return;
        if (queueList.length == 0) return discord.client.sendMessage(message, "The queue is empty.");
        let pos = 0;
        if (query.length != 0) {
            let n = getPosition(queueList, query[0].substring(2, query[0].length - 1).replace("!", ""));
            if (n != -1) pos = n;
        }
        let m = queueList.splice(pos, 1);
        saveQueue((err) => {
            if (err) {
                queueList.splice(pos, 0, m);
            } else {
                let member = message.channel.server.members.get("id", m[0].id);
                let str = (message.channel.server.detailsOf(member).nick || member.username) + ", ***" + m[0].tag + "*** - was removed from the queue.\n\n";
                str += getNextList(message, 6, true);
                discord.client.sendMessage(message, str);
            }
        });
    }

    function next(message, query) {
        if (message.channel.id != "188197329356980224") return;
        if (queueList.length == 0) return discord.client.sendMessage(message, "The queue is empty.");
        let count;
        if (query.length != 0 && (getPosition(message.channel.server.rolesOfUser(message.author), "188173775995535360") != -1 || getPosition(message.channel.server.rolesOfUser(message.author), "84778943529365504") != -1)) {
            if (query[0] == "*") {
                count = queueList.length;
            } else {
                count = parseInt(query[0]);
            }
        }
        if (!count) count = 6;
        let str = getNextList(message, count, false);
        discord.client.sendMessage(message, str);
    }

    function flush(message) {
        if (getPosition(message.channel.server.rolesOfUser(message.author), "84778943529365504") == -1 && message.author.id != "84761911010267136") return;
        queueList = [];
        saveQueue((err) => {
            if (err) utils.log(JSON.stringify(err));
            discord.client.sendMessage(message, "The queue was flushed.");
        });
    }

    function getNextList(message, count, mention) {
        if (queueList.length == 0) return "The queue is empty.";
        if (count > queueList.length) count = queueList.length;
        let str = "```Up next to be pulled into the 'On Deck' Overwatch team is:```\n";
        for (let i = 0; i < count; i++) {
            str += "``" + (i + 1) + ".`` ";
            let member = message.channel.server.members.get("id", queueList[i].id);
            if (i <= 1 && mention) {
                str += member;
            } else {
                str += message.channel.server.detailsOf(member).nick || member.username;
            }
            str += " - ***" + queueList[i].tag + "***\n";
        }
        if (queueList.length - count > 0) str += "\nPlus (" + (queueList.length - count) + ") more...";
        return str;
    }
};
