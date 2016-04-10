'use strict';
const Discord = require('discord.js');

module.exports = function (utils, options, path) {

    var discord = new Discord.Client(); //New discord client
    var discordReconnectCount = 0; //Reconnect count

    discordConnect(); //Connect on startup

    function discordConnect() { //Attempt to connect to Discord
        discord.loginWithToken(options.bot_token, (err) => { //Use bot token
            utils.log("Connecting to Discord...");
            if (err) {
                utils.log("error: " + JSON.stringify(err));
                discordReconnect(); //Reconnect
            }
        });
    }

    discord.on('ready', () => { //The discord client has connected
        utils.log("Successful connection to Discord as '" + discord.user.username + "'");
        discordReconnectCount = 0; //Reset reconnect count
    });

    discord.on('serverCreated', (server) => { //The client has joined a server
        utils.log(discord.user.username + " joined Discord server: '" + server.name + "'");
    });

    discord.on('serverDeleted', (server) => { //The client has left a server
        utils.log(discord.user.username + " parted Discord server: '" + server.name + "'");
    });

    discord.on('disconnected', () => { //Discord was disconnected
        utils.log("Discord disconnected");
        discordReconnect(); //Reconnect
    });

    discord.on('error', (err) => { //Log any Discord Errors
        utils.log("Discord error: " + JSON.stringify(err));
    });

    function discordReconnect() { //Reconnect to Discord
        discordReconnectCount++; //Add to count
        if (discordReconnectCount >= 100) { //Exit if reconnection attempts is over 100
            utils.log("Discord reconnect failed an excessive amount - terminating script");
            process.exit();
        } else { //Wait and reconnect after x seconds
            utils.log("Connection to Discord failed");
            utils.log("Reconnecting to Discord in " + (discordReconnectCount - 1 ) * 10 + " seconds");
            setTimeout(discordConnect, 1000 * (discordReconnectCount - 1) * 10);
        }
    }

    function typeMessage(message, str, callback) {
        discord.startTyping(message, () => {
            setTimeout(() => {
                discord.stopTyping(message, () => {
                    discord.sendMessage(message, str, (err) => {
                        if (callback) (err) ? callback(err) : callback();
                    });
                });
            }, 1000);
        });
    }

    function quickMessage(message, str, callback) {
        discord.sendMessage(message, str, () => {
            if (callback) callback();
        });
    }

    function typeReply(message, str, callback) {
        discord.startTyping(message, () => {
            setTimeout(() => {
                discord.stopTyping(message, () => {
                    discord.reply(message, str, () => {
                        if (callback) callback();
                    });
                });
            }, 1000);
        });
    }

    function quickReply(message, str, callback) {
        discord.reply(message, str, () => {
            if (callback) callback();
        });
    }

    function typeFile(message, path, name, callback) {
        discord.startTyping(message, () => {
            setTimeout(() => {
                discord.stopTyping(message, () => {
                    discord.sendFile(message, path, name, () => {
                        if (callback) callback();
                    });
                });
            }, 500);
        });
    }

    function quickFile(message, path, name, callback) {
        discord.sendFile(message, path, name, () => {
            if (callback) callback();
        });
    }

    return {
        discord: discord,
        typeMessage: typeMessage,
        quickMessage: quickMessage,
        typeReply: typeReply,
        quickReply: quickReply,
        typeFile: typeFile,
        quickFile: quickFile
    };
};