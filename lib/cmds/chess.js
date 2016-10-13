'use strict';
exports.info = {
  name: 'chess',
  desc: 'Play a game of chess with Discord!',
  usage: 'chess <commands>',
};

const exec = require('child_process');
const config = require('../../config');
const Chess = require('chess.js').Chess;
const logger = require('winston');
const path = require('path');

const chessDir = path.join(process.cwd(), 'assets/chess');

// Chess game object
let chess = null;
// Players color - [w | b]
let playerColor;

exports.run = (discord, msg, params = []) => {
  // Exit if no commands were passed
  if (params.length === 0) {
    return;
  }

  // Create a new game
  if (params[0].toLowerCase() === 'new') {
    msg.channel.sendMessage('Setting up a new Chess game...')
      .then(m => {
        // Must choose what color to play as
        if (params[1].toLowerCase() !== 'black' && params[1] !== 'white') {
          m.edit(`Choose what color to play as: \`\`${config.commands.prefix}chess new <color>\`\``);
          return;
        }
        chess = new Chess();
        playerColor = params[1].toLowerCase()[0];
        m.edit(`Game created.`);
        startGame();
      })
      .catch(logger.error);
    return;
  }

  if (!chess || chess.game_over()) {
    msg.channel.sendMessage(`There is no current game. Please create one using ` +
      `\`\`${config.commands.prefix}chess new <color>\`\``);
    return;
  }

  if (chess.turn() !== playerColor) {
    msg.channel.sendMessage('It is not your turn. Please wait.');
    return;
  }

  const successfulMove = chess.move(params.join(' '));

  if (successfulMove) {
    updateImage();
  } else {
    msg.channel.sendMessage('Invalid move, please try again.');
  }

  function startGame() {
    if (playerColor === 'w') {
      msg.channel.sendFile(path.join(chessDir, 'board.jpg'), 'chess.jpg')
        .then(() => {
          msg.channel.sendMessage('You are playing the white side. You get to go first. Good luck :wink:');
        })
        .catch(logger.error);
    } else {
      msg.channel.sendMessage('I\'m playing the the white side. I get to go first. :smirk:')
        .then(() => {
          aiGo();
        })
        .catch(logger.error);
    }
  }

  function aiGo() {
    msg.channel.sendMessage('Thinking... :thinking:')
      .then(m => {
        msg.channel.startTyping();
        aiMove(result => {
          msg.channel.stopTyping();
          if (result) {
            m.edit(`My Move: \`\`${result}\`\``);
            chess.move(result);
            updateImage();
          } else {
            m.edit('The ChessAI was unable to return any moves.');
            // TODO: What do we do here?
          }
        });
      })
      .catch(logger.error);
  }

  function aiMove(callback) {
    let moveList = [];
    const pgn = chess.pgn({
      newline_char: '\n',
    });
    if (pgn !== '') {
      moveList = [];
      pgn.replace(/^\d+.\s/gm, '')
        .split('\n')
        .forEach(l => {
          l.split(' ').forEach(x => {
            moveList.push(x);
          });
        });
    }
    const chessAI = exec.fork('./lib/chessAI');
    chessAI.send(moveList);
    chessAI.on('message', callback);
  }

  function updateImage() {
    logger.debug('loading new chess board image');
    msg.channel.sendCode('ascii', chess.ascii());
    if (chess.turn() !== playerColor) {
      aiGo();
    }
  }
};
