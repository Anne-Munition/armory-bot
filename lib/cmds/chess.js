'use strict';
exports.info = {
  name: 'chess',
  desc: 'Play a game of chess with Discord!',
  usage: 'chess <commands>',
};

const fs = require('fs');
const chessAI = require('child_process').fork('./lib/chessAI');
const config = require('../../config');
const Chess = require('chess.js').Chess;
const logger = require('winston');
const path = require('path');

const chessDir = path.join(process.cwd(), 'assets/chess');
const fenDir = path.join(chessDir, 'fen');
const fenDefault = path.join(fenDir, 'default');

if (!fs.existsSync(fenDir)) {
  fs.mkdirSync(fenDir);
}

// Chess game object
let chess = null;
// Players color - [w | b]
let playerColor;
// Store last chess board image to remove before next upload
let deleteMsgs = [];
let aiTimer;

// Load game and players color from fen file if exists
fs.exists(fenDefault, exists => {
  if (exists) {
    fs.readFile(fenDefault, 'utf8', (err, fen) => {
      if (err) {
        logger.error(err);
      } else {
        chess = new Chess(fen);
        // Since the bot should always stop waiting on the player, the move count can be used to determine player color
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
    msg.channel.sendMessage('Creating a new Chess game...')
      .then(m => {
        // Must choose what color to play as
        if (params[1].toLowerCase() !== 'black' && params[1] !== 'white') {
          m.edit(`Choose what color to play as: \`\`${config.commands.prefix}chess new <color>\`\``);
          return;
        }
        // Create an empty chess game
        chess = new Chess();
        // Store w or b for player color
        playerColor = params[1].toLowerCase()[0];
        m.edit(`Game created.`);
        // Figure out who goes first.
        if (playerColor === 'w') {
          msg.channel.sendFile(path.join(chessDir, 'board.jpg'), 'chess.jpg')
            .then(n => {
              deleteMsgs.push(n);
              msg.channel.sendMessage('You are playing on the white side. You get to go first.\nGood luck :wink:');
            })
            .catch(logger.error);
        } else {
          msg.channel.sendMessage('I\'m playing on the white side. I get to go first. :smirk:')
            .then(() => {
              aiGo();
            })
            .catch(logger.error);
        }
      })
      .catch(logger.error);
    return;
  }

  // Undo if time has not passed and or is the  bot turn
  if (params[0].toLowerCase() === 'undo') {
    // Stop ai from responding by stopping timer
    if (aiTimer) {
      clearTimeout(aiTimer);
    }
    const undo = chess.undo();
    if (undo) {
      msg.channel.sendMessage('Undo was successful.');
      updateImage();
    } else {
      msg.channel.sendMessage('Unable to undo.');
      aiGo();
    }
    return;
  }

  if (params[0].toLowerCase() === 'moves') {
    msg.channel.sendCode('javascript', JSON.stringify(chess.history()));
    return;
  }

  // Stop if the last game is over or has never been started
  if (!chess || chess.game_over()) {
    msg.channel.sendMessage(`There is no current game. Please create one using ` +
      `\`\`${config.commands.prefix}chess new <color>\`\``);
    return;
  }

  // Stop if is not your turn
  if (chess.turn() !== playerColor) {
    msg.channel.sendMessage('It is not your turn. Please wait.');
    return;
  }

  // Attempt to move a chess piece
  const successfulMove = chess.move(params.join(' '));
  if (successfulMove) {
    updateImage();
  } else {
    msg.channel.sendMessage('Invalid move, please try again.');
  }

  // It's the AIs turn to make a move
  function aiGo() {
    msg.channel.sendMessage('Thinking... :thinking:')
      .then(m => {
        msg.channel.startTyping();
        aiProcess(result => {
          msg.channel.stopTyping();
          if (result) {
            m.edit(`My move was: \`\`${result}\`\``);
            // Move the AI's piece
            chess.move(result);
            updateImage();
          } else {
            m.edit('The Chess AI was unable to return any moves.');
          }
        });
      })
      .catch(logger.error);
  }

  // Child function as it did not run async
  function aiProcess(callback) {
    chessAI.send(chess.history());
    chessAI.on('message', callback);
  }

  // Update chess board image
  function updateImage() {
    // Save game status to fen file for restarts
    fs.writeFile(fenDefault, chess.fen());
    let count = 0;
    processImage();
    removeOldMessages();

    function processImage() {
      logger.debug('Creating new chess board image');

      finished();
    }

    function removeOldMessages() {
      logger.debug('Removing old messages');
      let num = 0;
      if (deleteMsgs.length === 0) {
        next();
        return;
      }
      deleteMsgs.forEach(m => {
        m.delete()
          .then(() => {
            next();
          })
          .catch(logger.error);
      });

      function next() {
        num++;
        if (num >= deleteMsgs.length) {
          deleteMsgs = [];
          finished();
        }
      }
    }

    function finished() {
      count++;
      if (count < 2) {
        return;
      }
      logger.debug('ready to send chess image');
      msg.channel.sendCode('ascii', chess.ascii())
        .then(n => {
          deleteMsgs.push(n);
          checkConditions();
          if (chess.turn() === playerColor) {
            msg.channel.sendMessage(`Your turn. \`\`${config.commands.prefix}chess <move>\`\` ` +
              `<http://www.chesscorner.com/tutorial/basic/notation/notate.htm>`)
              .then(o => {
                deleteMsgs.push(o);
              })
              .catch(logger.error);
          } else {
            msg.channel.sendMessage(`I'll wait 15 seconds to move, giving you time to ` +
              `\`\`${config.commands.prefix}chess undo\`\` if you need.`)
              .then(m => {
                deleteMsgs.push(m);
              })
              .catch(logger.error);
            aiTimer = setTimeout(aiGo, 15000);
          }
        })
        .catch(logger.error);
    }
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
}
;
