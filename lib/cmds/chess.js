'use strict';
exports.info = {
  name: 'chess',
  desc: 'Play a game of chess with Discord!',
  usage: 'chess <commands>',
};

const fs = require('fs');
const exec = require('child_process');
const config = require('../../config');
const Chess = require('chess.js').Chess;
const logger = require('winston');
const path = require('path');

const chessDir = path.join(process.cwd(), 'assets/chess');
const fenFile = path.join(chessDir, 'fen');

// Chess game object
let chess = null;
// Players color - [w | b]
let playerColor;

fs.exists(fenFile, exists => {
  if (exists) {
    fs.readFile(fenFile, 'utf8', (err, fen) => {
      if (err) {
        logger.error(err);
      } else {
        chess = new Chess(fen);
        const num = fen.trim().split(/\s+/).reverse()[0];
        playerColor = num / 2 % 1 ? 'b' : 'w';
      }
    });
  }
});

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
            m.edit(`My move was: \`\`${result}\`\``);
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
    const chessAI = exec.fork('./lib/chessAI');
    chessAI.send(chess.history());
    chessAI.on('message', callback);
  }

  function updateImage() {
    logger.debug('loading new chess board image');
    fs.writeFile(fenFile, chess.fen());
    msg.channel.sendCode('ascii', chess.ascii())
      .then(() => {
        checkConditions();
        if (chess.turn() === playerColor) {
          msg.channel.sendMessage(`Your turn. \`\`${config.commands.prefix}chess <move>\`\` ` +
            `<http://www.chesscorner.com/tutorial/basic/notation/notate.htm>`);
        } else {
          aiGo();
        }
      })
      .catch(logger.error);
  }

  function checkConditions() {
    const color = chess.turn();
    const playerTurn = color === playerColor;
    if (chess.game_over()) {
      msg.channel.sendMessage('The game is over.');
    }
    if (chess.in_checkmate()) {
      if (playerTurn) {
        msg.channel.sendMessage(`You have been mated in ${chess.history().length} moves. :sad:`);
      } else {
        msg.channel.sendMessage(`You mated the Discord Bot in ${chess.history().length} moves! :happy:`);
      }
      return;
    }
    if (chess.in_check()) {
      if (playerTurn) {
        msg.channel.sendMessage(`You are in check.`);
      } else {
        msg.channel.sendMessage(`You have placed the bot in check.`);
      }
      return;
    }
    if (chess.in_stalemate()) {
      if (playerTurn) {
        msg.channel.sendMessage(`You have been stalemates in ${chess.history().length} moves.`);
      } else {
        msg.channel.sendMessage(`You stalemated the bot in ${chess.history().length} moves.`);
      }
      return;
    }
    if (chess.in_draw()) {
      const reason = chess.insufficient_material() ? 'Insufficient Materials' : '50-move rule';
      msg.channel.sendMessage(`This game has ended in a draw. Reason: ${reason}`);
      return;
    }
    if (chess.in_threefold_repetition()) {
      msg.channel.sendMessage(`The board has been in this position three or more times.`);
    }
  }
};
