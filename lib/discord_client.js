'use strict';
const Discord = require('discord.js'); //Discord module

module.exports = function (utils, options, path, mongo) {

    var discord = new Discord.Client(); //New discord client
    var discordReconnectCount = 0; //Count of how many reconnect attempts
    var reconnecting = false;

    //Attempt to connect to Discord
    function discordConnect() {
        utils.log("Connecting to Discord...");
        discord.loginWithToken(options.bot_token, (err) => { //Using a Discord 'BOT' account token
            if (err) utils.log("Discord login error: " + JSON.stringify(err));
        });
    }

    discord.on('ready', () => { //The discord client has connected
        utils.log("Successful connection to Discord as '" + discord.user.username + "'");
        discordReconnectCount = 0; //Reset reconnect count
    });

    discord.on('serverCreated', (server) => { //The client has joined a server
        utils.log(discord.user.username + " joined Discord server: '" + server.name + "'. Owner: '" + server.owner.name + " #" + server.owner.discriminator + "'");
    });

    discord.on('serverDeleted', (server) => { //The client has left a server
        utils.log(discord.user.username + " parted Discord server: '" + server.name + "'. Owner: '" + server.owner.name + " #" + server.owner.discriminator + "'");
    });

    discord.on('serverNewMember', (server, user) => { //A new member has joined a connected server
        mongo.welcomeChannelsModel.find({server_id: server.id}, (err, channels) => { //Get list of welcome channels with same server_id
            if (err) return utils.log(JSON.stringify(err));
            for (let i = 0; i < channels.length; i++) {
                let channel = discord.channels.get('id', channels[i].channel_id); //Attempt to resolve the channel
                if (!channel) continue; //This will occur if the channel has been deleted. We do not delete the entry on channel deletion
                typeMessage(channel, "**" + user.name + "** #" + user.discriminator + " has just joined the Discord Server!"); //Post welcome message to each channel found
            }
        });
    });

    discord.on('serverMemberRemoved', (server, user) => { //A new member has left/kick/ban a connected server
        mongo.welcomeChannelsModel.find({server_id: server.id}, (err, channels) => { //Get list of welcome channels with same server_id
            if (err) return utils.log(JSON.stringify(err));
            for (let i = 0; i < channels.length; i++) {
                let channel = discord.channels.get('id', channels[i].channel_id); //Attempt to resolve the channel
                if (!channel) continue; //This will occur if the channel has been deleted. We do not delete the entry on channel deletion
                typeMessage(channel, "**" + user.username + "** #" + user.discriminator + " was removed from the Discord Server."); //Post welcome message to each channel found
            }
        });
    });

    discord.on('disconnected', () => { //Discord was disconnected
        utils.log("Discord disconnected");
        if (!reconnecting) {
            reconnecting = true;
            discordReconnect();
        } //Reconnect to Discord
    });

    discord.on('error', (err) => { //Log any Discord Errors
        utils.log("Discord error: " + JSON.stringify(err));
    });

    //Reconnect to Discord
    function discordReconnect() {
        discordReconnectCount++; //Add to reconnect count
        if (discordReconnectCount >= 100) {
            utils.log("Discord reconnect failed an excessive amount - terminating script");
            process.exit(); //Exit if reconnection attempts is over 100
        } else { //Wait and reconnect after x seconds
            utils.log("Connection to Discord failed, reconnecting in " + ((discordReconnectCount) * 10) + " seconds");
            setTimeout(() => {
                reconnecting = false;
                discordConnect();
            }, 1000 * (discordReconnectCount) * 10);
        }
    }

    //'Types' a message in a discord channel
    function typeMessage(message, str, callback) {
        discord.startTyping(message);
        setTimeout(() => {
            discord.sendMessage(message, str, (err, result) => {
                if (callback) callback(err, result);
            });
            discord.stopTyping(message);
        }, (str.length * 10) + 1000 || 1000);
    }

    //'Types' an @ mention reply message in a discord channel
    function typeReply(message, str, callback) {
        discord.startTyping(message);
        setTimeout(() => {
            discord.reply(message, str, (err, result) => {
                if (callback) callback(err, result);
            });
            discord.stopTyping(message);
        }, (str.length * 10) + 1000 || 1000);
    }

    discordConnect(); //Connect on startup

    return {
        client: discord,
        typeMessage: typeMessage,
        typeReply: typeReply
    };
};
