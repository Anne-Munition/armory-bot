'use strict';
const eightBallResponses = require('../assets/8ball.json'),
    gm = require('gm');

module.exports = function (utils, options, discord, request, mongo, twitter, fs, path, moment) {

    discord.discord.on('message', (message) => { //A message was sent in a Discord channel
        if (message.author.id == discord.discord.user.id) return; //Exit if message is from self(bot)
        if (message.content.indexOf(options.command_prefix) == 0) handleCommands(message);

        /* if (message.content.toLowerCase().indexOf("db") != -1) {
         if (!message.channel.isPrivate) {
         discord.sendMessage(message.author, "[" +
         message.channel.server.name + "] [#" + message.channel.name + "] <**" + message.author.name + "**> " + message.content);
         }
         }*/

    });

    function handleCommands(message) {
        if (!message.channel.isPrivate) {
            utils.log("[" + message.channel.server.name + "] {#" + message.channel.name + "} <" + message.author.username + "> " + message.content);
        } else {
            utils.log("[PRIVATE] <" + message.author.username + "> " + message.content);
        }
        let query = message.content.substring(options.command_prefix.length, message.length).split(' '); //Remove prefix and split into an array
        let cmd = query.shift().toLowerCase(); //Get command out of the message
        switch (cmd) { //Determine which command was run
            case 'ids':
                ids(message);
                break;
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
            case 'hat':
                hat(message, query);
                break;
            case 'mentions':
                mentions(message, query);
                break;
            case 'perms':
                perms(message, query);
                break;
        }
    }

    function ids(message) {
        discord.typeMessage(message,
            "``Server ID: " + message.channel.server.id + " - " + message.channel.server.name + "``\n" +
            "``Channel ID: " + message.channel.id + " - #" + message.channel.name + "``\n" +
            "``Bot User ID: " + discord.discord.user.id + " - " + discord.discord.user.username + "``\n" +
            "``Your User ID: " + message.author.id + " - " + message.author.username + "``");
    }

    function ask8Ball(message, query) {
        if (query.length == 0) return;
        query = query.join(" ");
        let response = eightBallResponses[utils.getRandomInt(0, eightBallResponses.length)];
        if (message.author.id == '84770528526602240' && query[query.length - 1] == '?') response = "Of course!";
        discord.typeReply(message, response);
    }

    function shame(message) {
        discord.quickFile(message, path.join(__dirname, "../assets/shame.gif"), "shame.gif");
    }

    function avatar(message) {
        let url = message.author.avatarURL;
        if (!url) return discord.typeMessage(message, message.author.name + " does not have a custom avatar.");
        request.get({url: encodeURI(url), encoding: null}, (err, res, buffer) => {
            if (!err && res.statusCode == 200) {
                discord.quickMessage(message, "``" + message.author.name + "``");
                discord.quickFile(message, buffer, message.author.id + ".jpg");
            } else {
                discord.typeMessage(message, "There was an error getting the avatar for " + message.author.name + ".");
            }
        })
    }

    function giphy(message, query) {
        if (query.length == 0) return;
        query = query.join(" ");
        let count = 0;
        getRandomGiphy(query);

        function getRandomGiphy(query) {
            function next() {
                if (count++ < 25) {
                    getRandomGiphy(query);
                } else {
                    discord.typeMessage(message, "No Giphy results found for '" + query + "'.");
                }
            }

            request.get({
                    url: encodeURI("http://api.giphy.com/v1/gifs/random?rating=g&api_key=dc6zaTOxFJmzC&tag=" + query),
                    json: true
                },
                (err, res, body) => {
                    if (!err && res.statusCode == 200) {
                        if (parseInt(body.data.image_frames) > 128) {
                            next();
                        } else {
                            discord.typeMessage(message, body.data.image_url, body.data.id + ".gif");
                        }
                    } else {
                        next();
                    }
                });
        }
    }

    function restart(message) {
        if (message.author.id == options.owner_id || message.author.id == "84770528526602240") {
            process.exit(2);
        }
    }

    function join(message) {
        discord.typeMessage(message, "Follow this link to add " + discord.discord.user.name + " to your Discord server:\n" +
            "<https://discordapp.com/oauth2/authorize?&client_id=" + options.bot_app_id + "&scope=bot>");
    }

    function tweets(message, query) {
        if (query[0] == 'list') {
            mongo.twitterChannelsModel.find({}, (err, channels) => {
                if (err) {
                    discord.typeMessage(message, "Database Error");
                    return utils.log(JSON.stringify(err));
                }
                let str = "Tweets from '" + twitter.getName() + "' are pushed to channel(s):\n\n";
                let names = [];
                for (let i = 0; i < channels.length; i++) {
                    let channel = discord.discord.channels.get('id', channels[i].channel_id);
                    if (!channel || message.channel.server.id != channel.server.id) continue;
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
                if (err) {
                    discord.typeMessage(message, "Database Error");
                    return utils.log(JSON.stringify(err));
                }
                switch (query[0]) {
                    case 'add':
                        if (channels.length != 0) {
                            discord.typeMessage(message, "This channel already receives tweets from '" + twitter.getName() + "'.");
                        } else {
                            let entry = new mongo.twitterChannelsModel({
                                channel_id: message.channel.id
                            });
                            entry.save((err) => {
                                if (err) {
                                    discord.typeMessage(message, "Database Error");
                                    return utils.log(JSON.stringify(err));
                                }
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
                            if (err) {
                                discord.typeMessage(message, "Database Error");
                                return utils.log(JSON.stringify(err));
                            }
                            discord.typeMessage(message, "This channel will no longer receive tweets from '" + twitter.getName() + "'.");
                        });
                        break;
                    default:
                        discord.typeMessage(message, "``" + options.command_prefix + "tweets < list | add | remove >``");
                        break;
                }
            });
        }
    }

    function hat(message, query) {
        let url = message.author.avatarURL;
        if (!url) {
            discord.typeMessage(message, "Cannot perform this operation for users without a custom avatar.");
            return;
        }
        if (!query[0] || query[0] == 'help') {
            sendHatFormatMessage();
            return;
        }
        if (!message.channel.isPrivate) {
            sendHatFormatMessage();
        }

        function sendHatFormatMessage() {
            discord.quickMessage(message.author, "``" + options.command_prefix + "hat <name> <Xoffset> <Yoffset> <scale> <rotation>``\n" +
                "``" + options.command_prefix + "hat xmas 0 20 0.9 45``");
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
            discord.typeMessage(message.author, "Format error. Type ``" + options.command_prefix + "hat`` to see usage options.");
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
                discord.quickMessage(message.author, "Processing...", () => {
                    loadHat(hatData)
                        .then(getHatSize)
                        .then(downloadAvatar)
                        .then(modifyHat)
                        .then(getModifiedHatSize)
                        .then(saveModifiedHat)
                        .then(applyHatComposite)
                        .then((hatData) => {
                            discord.quickFile(message.author, hatData.avatarBufferEdited, message.author.id + "_" + query[0] + ".png", () => {
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

    function mentions(message, query) {
        if (message.channel.isPrivate) return;
        discord.typeReply(message, "Searching for @mentions...");
        let max = parseInt(query[0]) || 500;
        if (max > 5000) max = 5000;
        let responses = [];
        let count = 0;

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
                discord.discord.getChannelLogs(message, 100, {before: msg}, (err, messages) => {
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
            }, 1000);
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
                        discord.typeMessage(message.author, header + chunks[i], (err) => {
                            if (err) utils.log(JSON.stringify(err));
                        });
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

    function perms(message, query) {
        discord.typeMessage(message, "WIP");
    }
};
