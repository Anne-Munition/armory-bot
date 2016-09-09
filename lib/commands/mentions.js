'use strict';
const request = require('request'),
    utils = require('../utilities.js')(),
    moment = require('moment');

module.exports = function (message, query, options) {//Searches chat logs for up to 10000 messages to try and find mentions
    if (message.channel.type != 'text') return;
    let max = parseInt(query[0]) || 500;
    if (max > 10000) max = 10000;
    let responses = [];
    let count = 0;
    let delay = 1000;

    message.channel.sendMessage(":mailbox_with_mail:");
    message.author.sendMessage("Searching for @ mentions in **#" + message.channel.name + "**. Estimated time: " + Math.floor(((delay / 1000) * (max / 100)) + 5) + " seconds.");

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
            message.channel.fetchMessages({limit: 100, before: msg.id})
                .then((messages) => {
                    if (`${messages.size}` != 100) {
                        extractMentions(messages);
                        next(null, null);
                        return;
                    }
                    extractMentions(messages);
                    next(null, messages[messages.length - 1]);
                })
                .catch(() => {
                    message.user.sendMessage("There was an error searching for @ mentions in #" + message.channel.name + ".``");
                    next(true);
                });
        }, delay);
    }

    function extractMentions(messages) {
        messages.forEach((msg) => {
            if (msg.mentions.everyone) {
                responses.push(msg);
                return;
            }
            if (`${msg.mentions.users.size}` > 0) {
                msg.mentions.users.forEach((user) => {
                    if (user.id == message.author.id) {
                        responses.push(msg);
                    }
                });
            } else if (`${msg.mentions.roles.size}` > 0) {
                msg.member.roles.forEach((role) => {
                    //TODO - It responds twice with 'Deleted-Role'
                    //if (message.member.roles.find('id', role.id)) responses.push(msg);
                });
            }
        });
    }

    function processLogs() {
        if (responses.length == 0) {
            message.author.sendMessage("``No mentions were found in #" + message.channel.name + ".``");
            return;
        }
        let chunks = [];
        let header = "```Mentions from #" + message.channel.name + ".```\n";

        function nextChunk(start) {
            if (start) {
                chunk(start);
            } else {
                for (let i = chunks.length - 1; i >= 0; i--) {
                    message.author.sendMessage(header + chunks[i]);
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
};
