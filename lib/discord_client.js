'use strict';
const Discord = require('discord.js'), //Discord module
    utils = require('./utilities.js')();

module.exports = function (options, mongo) {

    var discord = new Discord.Client(); //New discord client

    discord.on('ready', () => { //The discord client has connected
        utils.log("Successful connection to Discord as '" + discord.user.username + "'");
    });

    discord.on('guildCreate', (guild) => { //The client has joined a guild
        utils.log(discord.user.username + " joined Discord guild: '" + guild.name + "' -  Owner: '" + guild.owner.user.username + " #" + guild.owner.user.discriminator + "'");
    });

    discord.on('guildDelete', (guild) => { //The client has left a guild
        utils.log(discord.user.username + " parted Discord guild: '" + guild.name + "' -  Owner: '" + guild.owner.user.username + " #" + guild.owner.user.discriminator + "'");
    });

    discord.on('guildMemberAdd', (guild, member) => { //A new member has joined a connected server
        mongo.welcomeChannels.find({server_id: guild.id}, (err, channels) => { //Get list of welcome channels with same server_id
            if (err) return utils.log(JSON.stringify(err));
            for (let i = 0; i < channels.length; i++) {
                if (!guild.available) continue;
                let channel = guild.channels.find('id', channels[i].channel_id); //Attempt to resolve the channel
                if (!channel) continue; //This will occur if the channel has been deleted. We do not delete the entry on channel deletion
                channel.sendMessage("**" + member.user.username + "** #" + member.user.discriminator + " has just joined the Discord Server!"); //Post welcome message to each channel found
            }
        });
    });

    discord.on('guildMemberRemove', (guild, member) => { //A member has left/kick/ban from a connected server
        mongo.welcomeChannels.find({server_id: guild.id}, (err, channels) => { //Get list of welcome channels with same server_id
            if (err) return utils.log(JSON.stringify(err));
            for (let i = 0; i < channels.length; i++) {
                if (!guild.available) continue;
                let channel = guild.channels.find('id', channels[i].channel_id); //Attempt to resolve the channel
                if (!channel) continue; //This will occur if the channel has been deleted. We do not delete the entry on channel deletion
                channel.sendMessage("**" + member.user.username + "** #" + member.user.discriminator + " was removed from the Discord Server."); //Post welcome message to each channel found
            }
        });
    });

    discord.on('reconnecting', () => { //Discord was disconnected
        utils.log("Discord disconnected, attempting to reconnect");
    });

    discord.on('error', (err) => { //Log any Discord Errors
        utils.log("Discord error: " + JSON.stringify(err));
    });

    utils.log("Connecting to Discord...");
    discord.login(options.bot_token);

    return {
        client: discord
    };
};
