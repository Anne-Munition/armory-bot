'use strict';
const fs = require('fs'),
    path = require('path'),
    utils = require('../utilities.js')(),
    gm = require('gm'),
    request = require('request');

module.exports = function (message, query, options) {
    //Downloads users avatar and  composites a selectable hat over it then send it back as a PM

    let url = message.author.avatarURL;
    if (!url) {
        message.reply("Cannot perform this operation without a custom avatar.");
        return;
    }
    if (!query[0] || query[0] == 'help') {
        if (message.channel.type == 'text') message.channel.sendMessage(":mailbox_with_mail:");
        sendHatFormatMessage();
        return;
    }

    if (message.channel.type == 'text') {
        message.channel.sendMessage(":mailbox_with_mail:");
        sendHatFormatMessage();
    }

    function sendHatFormatMessage() {
        message.author.sendMessage("```Examples:\n" + options.commands.prefix + "hat <name> <Xoffset> <Yoffset> <scale> <rotation>\n" +
            options.commands.prefix + "hat xmas 0 20 0.9 45\nHats: xmas```");
    }

    let x = 0; //Entered shift amount X
    let y = 0; //Entered shift amount Y
    let s = 0; //Entered Scale amount
    let r = 0; //Entered Rotation Amount

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
    if (isNaN(x) || isNaN(y) || isNaN(s) || isNaN(r)) {
        message.author.sendMessage("Format error. Type ``" + options.commands.prefix + "hat`` to see usage options.");
        return;
    }

    let hatFile = path.join(__dirname, "../../assets/hats/" + query[0] + ".png");

    fs.exists(hatFile, (exists) => {
        if (!exists) {
            message.author.sendMessage("'" + query[0] + "' is not a registered hat.");
            return;
        }
        let hatData = {
            hatFile: hatFile,
            x: x,
            y: y,
            s: s,
            r: r
        };
        message.author.sendMessage("Processing...")
            .then(() => {
                loadHat(hatData)
                    .then(getHatSize)
                    .then(downloadAvatar)
                    .then(modifyHat)
                    .then(getModifiedHatSize)
                    .then(saveModifiedHat)
                    .then(applyHatComposite)
                    .then((hatData) => {
                        message.author.sendFile(hatData.avatarBufferEdited, message.author.id + "_" + query[0] + ".png")
                            .then(() => {
                                fs.unlink(hatData.tempHatPath);
                            });
                    })
                    .catch((err) => {
                        utils.log("hat error: " + JSON.stringify(err));
                        message.author.sendMessage("Error processing your '" + query[0] + "' hat. Please try again...");
                    });
            });

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
            let tempHatPath = path.join(__dirname, "../../temp/hat_" + message.author.id + "_" + query[0] + ".png");
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
};
