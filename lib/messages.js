'use strict';
const eightBallResponses = require('../assets/8ball.json'), //Array of responses an 8ball would make
    gm = require('gm'), //GraphicsMagik module
    moment = require('moment'),
    request = require('request'),
    fs = require('fs'),
    path = require('path'),
    utils = require('./utilities.js')(),
    evaluate = require('static-eval'),
    parse = require('esprima').parse,
    nodecraft = require('nodecraft-api'),
    mentions = require('./commands/mentions.js'),
    hat = require('./commands/hat.js'),
    overwatch = require('./commands/overwatch.js'),
    giphy = require('./commands/giphy.js'),
    perms = require('./permissions.js')(),
    dice = require('./commands/dice.js');

module.exports = function (options, discord, mongo, twitter) {
    const nodecraftAPI = nodecraft(options.nodecraft.username, options.nodecraft.api_key);

    discord.client.on('message', (message) => { //A message was sent in a Discord channel
        if (message.author.id == discord.client.user.id) return; //Exit if message is from self(bot)
        if (message.content.startsWith(options.commands.prefix)) handleCommands(message); //If the first part of the message is the command prefix handle commands
    });

    //A command was ran, send to proper function
    function handleCommands(message) {
        if (message.channel.type == 'text') {
            utils.log("[" + message.channel.type + "] (" + message.guild.name + ") {#" + message.channel.name + "} <" + message.author.username + "> " + message.content);
        } else if (message.channel.type == 'dm') {
            utils.log("[" + message.channel.type + "] <" + message.author.username + "> " + message.content);
        }
        let query = message.content.substring(options.commands.prefix.length, message.length).split(' '); //Remove prefix and split into an array
        let cmd = query.shift().toLowerCase(); //Get command out of the message
        perms.check(message.channel.id, cmd, (allowed) => {
            if (!allowed) return;
            switch (cmd) { //Determine which command was run
                case '8ball':
                    ask8Ball(message, query);
                    break;
                case 'shame':
                    shame(message);
                    break;
                case 'avatar':
                    avatar(message);
                    break;
                case 'join':
                    join(message);
                    break;
                case 'restart':
                case 'reboot':
                    restart(message);
                    break;
                case 'mc':
                    minecraft(message);
                    break;
                case 'mentions':
                    mentions(message, query);
                    break;
                case 'hat':
                    hat(message, query, options);
                    break;
                case 'ow':
                    overwatch(message, query, options);
                    break;
                case 'giphy':
                    giphy(message, query);
                    break;
                case 'welcome':
                    welcome(message, query);
                    break;
                case 'tweets':
                    tweets(message, query);
                    break;
                case 'perms':
                    perms.modify(message, query);
                    break;
                case 'math':
                    message.reply("**" + evaluate(parse(query.join(' ')).body[0].expression) + "**");
                    break;
                case 'roll':
                    dice(message, query);
                    break;
            }
        });
    }

    //8ball answers
    function ask8Ball(message, query) {
        if (query.length == 0) return; //Return if no 'question' was asked
        let response = eightBallResponses[utils.getRandomInt(0, eightBallResponses.length)]; //Get random response
        if (message.author.id == '84770528526602240' && query[query.length - 1].endsWith("?")) response = "Of course!"; //If the last char is a '?' do troll response for DBKynd only :D
        message.reply(response); //Reply with @ mention
    }

    //Upload shame.gif
    function shame(message) {
        message.channel.sendFile(path.join(__dirname, "../assets/shame.gif"), "shame.gif");
    }

    //Uploads users avatar to chat
    function avatar(message) {
        let url = message.author.avatarURL;
        if (!url) return message.reply("You do not have a custom avatar.");
        request.get({url: encodeURI(url), encoding: null}, (err, res, buffer) => {
            if (!err && res.statusCode == 200) {
                message.channel.sendFile(buffer, message.author.id + ".jpg", "``" + (message.guild.member(message.author).nickname || message.author.username) + "``");
            } else {
                message.reply("There was an error getting your avatar.");
            }
        })
    }

    //Posts join message and url for users to follow, to get the bot joined to their server
    function join(message) {
        message.channel.sendMessage("Follow this link to add **" + discord.client.user.username + "** to your Discord server:\n" +
            "<https://discordapp.com/oauth2/authorize?&client_id=" + options.bot_app_id + "&scope=bot>");
    }

    //Force quits the app. Need to have a method in place to auto start the script on crash
    function restart(message) {
        if (message.author.id == message.guild.owner.id || message.author.id == "84770528526602240") {
            message.channel.sendMessage(":ok_hand:")
                .then(() => {
                    process.exit();
                });
        }
    }

    function minecraft(message) {
        nodecraftAPI.services.stats(options.nodecraft.server_id, (err, results) => {
            if (!err) {
                let s = results.stats.status.charAt(0).toUpperCase() + results.stats.status.substring(1);
                let response = "```Minecraft Subscriber Server Statistics```Status: **" + s + "**";
                let u = results.stats.time;
                let p = results.stats.players;
                if (s == 'Online') {
                    response += " - Uptime: **" + u + "** - Players Online: **" + p.length + "**";
                    let names = [];
                    p.forEach((player) => {
                        names.push({name: player.username, modified: player.username.toLowerCase()});
                    });
                    names.sort(function (a, b) {
                        if (a.modified < b.modified) return -1;
                        if (a.modified > b.modified) return 1;
                        return 0;
                    });
                    response += "\n\n";
                    for (let i = 0; i < names.length; i++) {
                        response += names[i].name.replace(/_/gm, "\\_");
                        if (i < names.length - 1) response += " | ";
                    }
                }
                message.channel.sendMessage(response);
            } else {
                message.channel.sendMessage("There was an error getting data for the subscriber server.")
            }
        });
    }

    //[list | add | remove] channels to post join / part messages to
    function welcome(message, query) {
        if (query[0] == 'list') {
            mongo.welcomeChannels.find({server_id: message.guild.id}, (err, channels) => {
                if (err) return utils.log(JSON.stringify(err));
                let str = "Welcome messages are posted in channel(s):\n\n";
                let names = [];
                for (let i = 0; i < channels.length; i++) {
                    let channel = message.guild.channels.find('id', channels[i].channel_id);
                    if (!channel) continue;
                    names.push("*#" + channel.name + "*");
                }
                if (names.length == 0) {
                    message.channel.sendMessage("No channels on this server currently post a welcome message.");
                    return;
                }
                str += names.join("\n");
                message.channel.sendMessage(str); //Send List of twitter feed channels
            });
        } else {
            mongo.welcomeChannels.find({channel_id: message.channel.id}, (err, channels) => { //Search database for existing entry
                if (err) return utils.log(JSON.stringify(err));
                switch (query[0]) {
                    case 'add':
                        if (channels.length != 0) {
                            message.channel.sendMessage("This channel already posts welcome messages.");
                        } else {
                            let entry = new mongo.welcomeChannels({
                                server_id: message.guild.id,
                                channel_id: message.channel.id
                            });
                            entry.save((err) => {
                                if (err) return utils.log(JSON.stringify(err));
                                message.channel.sendMessage("This channel will now post welcome messages.");
                            });
                        }
                        break;
                    case 'remove':
                        if (channels.length == 0) {
                            message.channel.sendMessage("This channel didn't post welcome messages.");
                            return;
                        }
                        mongo.welcomeChannels.remove({_id: channels[0]._id}, (err) => {
                            if (err) return utils.log(JSON.stringify(err));
                            message.channel.sendMessage("This channel will no longer post welcome messages.");
                        });
                        break;
                    default:
                        message.channel.sendMessage("``" + options.commands.prefix + "welcome < list | add | remove >``");
                        break;
                }
            });
        }
    }

    //[list | add | remove] channels to post tweets to
    function tweets(message, query) {
        if (query[0] == 'list') {
            mongo.twitterChannels.find({server_id: message.guild.id}, (err, channels) => {
                if (err) return utils.log(JSON.stringify(err));
                let str = "Tweets from '" + twitter.getName() + "' are pushed to channel(s):\n\n";
                let names = [];
                for (let i = 0; i < channels.length; i++) {
                    let channel = message.guild.channels.find('id', channels[i].channel_id);
                    if (!channel) continue;
                    names.push("*#" + channel.name + "*");
                }
                if (names.length == 0) {
                    message.channel.sendMessage("No channels on this server currently receive tweets from '" + twitter.getName() + "'.");
                    return;
                }
                str += names.join("\n");
                message.channel.sendMessage(str); //Send List of twitter feed channels
            });
        } else {
            mongo.twitterChannels.find({channel_id: message.channel.id}, (err, channels) => { //Search database for existing entry
                if (err) return utils.log(JSON.stringify(err));
                switch (query[0]) {
                    case 'add':
                        if (channels.length != 0) {
                            message.channel.sendMessage("This channel already receives tweets from '" + twitter.getName() + "'.");
                        } else {
                            let entry = new mongo.twitterChannels({
                                server_id: message.guild.id,
                                channel_id: message.channel.id
                            });
                            entry.save((err) => {
                                if (err) return utils.log(JSON.stringify(err));
                                message.channel.sendMessage("This channel will now receives tweets from '" + twitter.getName() + "'.");
                            });
                        }
                        break;
                    case 'remove':
                        if (channels.length == 0) {
                            message.channel.sendMessage("This channel didn't receive tweets from '" + twitter.getName() + "'.");
                            return;
                        }
                        mongo.twitterChannels.remove({_id: channels[0]._id}, (err) => {
                            if (err) return utils.log(JSON.stringify(err));
                            message.channel.sendMessage("This channel will no longer receive tweets from '" + twitter.getName() + "'.");
                        });
                        break;
                    default:
                        message.channel.sendMessage("``" + options.commands.prefix + "tweets < list | add | remove >``");
                        break;
                }
            });
        }
    }
};
