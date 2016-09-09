'use strict';
const utils = require('../utilities.js')(),
    evaluate = require('static-eval'),
    parse = require('esprima').parse;

module.exports = function (message, query) {
    //Dice Roll
    if (!query[0]) return;
    let t = new RegExp("^[1-9]\\d*$"); //only a number
    if (t.test(query[0])) {
        message.reply("**" + utils.getRandomInt(1, parseInt(query[0]) + 1) + "**");
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
    if (dice.length < 2 && dice[0].text.split('d')[0] == 1) {
        message.reply("**" + r + "**");
    } else {
        message.reply(_exploded.join('') + " = **" + r + "**");
    }

};
