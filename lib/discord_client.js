'use strict';
const Discord = require('discord.js');

module.exports = function (utils, options, path, mongo) {

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
        utils.log(discord.user.username + " joined Discord server: '" + server.name + "'. Owner: '" + server.owner.name + "'");
    });

    discord.on('serverDeleted', (server) => { //The client has left a server
        utils.log(discord.user.username + " parted Discord server: '" + server.name + "'. Owner: '" + server.owner.name + "'");
    });

    discord.on('serverNewMember', (server, user) => {
        mongo.welcomeChannelsModel.find({server_id: server.id}, (err, channels) => {
            if (err) return utils.log(JSON.stringify(err));
            for (let i = 0; i < channels.length; i++) {
                let channel = discord.channels.get('id', channels[i].channel_id);
                if (!channel) continue;
                typeMessage(channel, "**" + user.name + "** has just joined the Discord Server!");
            }
        });
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
        discord.startTyping(message);
        setTimeout(() => {
            discord.sendMessage(message, str, (err, result) => {
                if (callback) callback(err, result);
            });
            discord.stopTyping(message);
        }, (str.length * 2) + 1000 || 1000);
    }

    function quickMessage(message, str, callback) {
        discord.sendMessage(message, str, (err, result) => {
            if (callback) callback(err, result);
        });
    }

    function typeReply(message, str, callback) {
        discord.startTyping(message);
        setTimeout(() => {
            discord.reply(message, str, (err, result) => {
                if (callback) callback(err, result);
            });
            discord.stopTyping(message);
        }, (str.length * 2) + 1000 || 1000);
    }

    function quickReply(message, str, callback) {
        discord.reply(message, str, (err, result) => {
            if (callback) callback(err, result);
        });
    }

    function typeFile(message, path, name, callback) {
        discord.startTyping(message);
        setTimeout(() => {
            discord.sendFile(message, path, name, (err, result) => {
                if (callback) callback(err, result);
            });
            discord.stopTyping(message);
        }, 2000);
    }

    function quickFile(message, path, name, callback) {
        discord.sendFile(message, path, name, (err, result) => {
            if (callback) callback(err, result);
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
