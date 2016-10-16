'use strict';
exports.info = {
  name: 'chess',
  desc: 'Play a game of chess with Discord!',
  usage: 'chess <commands>',
};

const config = require('../../config');
const logger = require('winston');
const utils = require('../utilities');
const fs = require('fs');
const path = require('path');
const Chess = require('chess.js').Chess;
const chessAI = require('child_process').fork('./lib/chessAI');
const moment = require('moment');
const gm = require('gm');

// Set paths
const chessDir = path.join(process.cwd(), 'assets/chess');
const gamesDir = path.join(chessDir, 'games');
const prefix = config.commands.prefix;

// Main game object. channel_id: <Object>
const chessGames = {};

// Aliases for player names
const me = [
  'me',
  'self',
];
const bot = [
  'bot',
  'ai',
  'pc',
];
const any = [
  'everyone',
  'any',
  'anybody',
  'all',
];
const alphaNum = [
  'a',
  'b',
  'c',
  'd',
  'e',
  'f',
  'g',
  'h',
];
// Flag to lock out deleting a game
let allowDeletion = false;
let timerDeletion;

// Array of messages to try and delete when a new turn is made
const messagesToDelete = [];

// Load any existing chat games into our game object
createGamesDir()
  .then(loadGames)
  .then(() => {
    logger.info(`Loaded ${Object.keys(chessGames).length} chess games`);
  })
  .catch(err => {
    logger.error('There was an error loading chess games', err);
  });

exports.run = (discord, msg, params = []) => {
  // Post usage if no parameters were passed
  if (params.length === 0) {
    msg.channel.sendMessage(`\`\`${prefix}chess <new | delete | info>\`\``);
    return;
  }

  // Get any game data for this channel if it exists
  const chessData = chessGames[msg.channel.id];
  // Save first parameter for routing
  const cmd = params[0].toLowerCase();

  // Display info about the channel's chess instance if exists
  if (cmd === 'info') {
    showInfo();
    return;
  }

  // Create a new Chess game
  if (cmd === 'new') {
    createGame();
    return;
  }

  // Delete the Chess game
  if (cmd === 'delete') {
    deleteGame();
    return;
  }

  // Player confirming deletion of a Chess game
  if (cmd === 'confirm') {
    confirmDelete();
    return;
  }

  // Send ASCII representation of the chess board to chat in a code block
  if (cmd === 'ascii') {
    msg.channel.sendCode('ascii', chessData.game.ascii());
    return;
  }

  // You have to be a part of the game to make move commands
  if (msg.author.id !== chessData.w && msg.author.id !== chessData.b) {
    msg.reply(`you are not a part of this game. \`\`${prefix}chess info\`\``)
      .then(m => {
        m.delete(3000);
        msg.delete(3000);
      })
      .catch(logger.error);
    return;
  }

  // It has to be your turn to send move commands
  if (msg.author.id !== chessData[chessData.game.turn()]) {
    msg.reply('it\'s not your turn. Please wait...')
      .then(m => {
        m.delete(3000);
        msg.delete(3000);
      })
      .catch(logger.error);
    return;
  }

  playerGo();

  //
  //
  //

  // Post information about the chess game if exists
  function showInfo() {
    logger.debug('chess info');
    if (chessData) {
      let white;
      let black;
      // Get players nickname or username if in text channel, or just username if in dm channel
      if (msg.channel.type === 'dm') {
        white = discord.client.users.find('id', chessData.w).username;
        black = discord.client.users.find('id', chessData.b).username;
      } else {
        white = msg.guild.members.find('id', chessData.w);
        black = msg.guild.members.find('id', chessData.b);
        white = white.nickname || white.user.username;
        black = black.nickname || black.user.username;
      }
      // Who's turn is it?
      const turn = chessData.game.turn() === 'w' ? 'White' : 'Black';
      let str = 'Chess Info\n';
      str += `Started: ${moment(chessData.started).fromNow()}\n`;
      str += `White: ${white}\n`;
      str += `Black: ${black}\n`;
      str += `Moves: ${chessData.history.length}\n`;
      str += `Turn: ${turn}\n`;
      str += `History: ${JSON.stringify(chessData.history)}`;
      // Send data as code block
      msg.channel.sendCode('qml', utils.clean(str));
    } else {
      createGameMessage();
    }
  }

  function createGameMessage() {
    msg.channel.sendMessage('There are no chess games running in this channel. To make a new game run:\n' +
      `\`\`${prefix}chess new <whitePlayer> <blackPlayer>\`\` using an @ mention 'me' or 'bot' ` +
      `for the player.`);
  }

  function createGame() {
    // Exit if game data exists
    if (chessData) {
      msg.channel.sendMessage(`There is already a game running in this channel.\n` +
        `\`\`${prefix}chess info\`\` or \`\`${prefix}chess delete\`\``);
      return;
    }
    // Must have both players
    if (params.length < 3) {
      msg.channel.sendMessage('Please provide the names of both players. Use an @ mention or \'me\' or \'bot\'\n' +
        `\`\`${prefix}chess new <whitePlayer> <blackPlayer>\`\``);
      return;
    }
    // Game already exists, must delete first unless the game is over
    // This is so we don't have to wait for people to delete it
    // TODO: Timer after game is done before others can clear the game
    logger.debug('resolving names to make a new chess game');
    msg.channel.sendMessage('Creating new Chess game...')
      .then(m => {
        let white;
        let black;
        const wName = params[1].toLowerCase();
        const bName = params[2].toLowerCase();
        // Get msg authors id, the bot's id, or a mentioned user's id for the white player
        if (me.indexOf(wName) !== -1) {
          white = msg.author.id;
        } else if (bot.indexOf(wName) !== -1) {
          white = discord.client.user.id;
        } else {
          const user = msg.mentions.users.first();
          if (user) {
            white = user.id;
          }
        }
        // Get msg authors id, the bot's id, or a mentioned user's id for the black player
        if (me.indexOf(bName) !== -1) {
          black = msg.author.id;
        } else if (bot.indexOf(bName) !== -1) {
          black = discord.client.user.id;
        } else {
          const user = msg.mentions.users.last();
          if (user) {
            black = user.id;
          }
        }
        // Unable to get white players id
        if (!white) {
          m.edit('Error resolving the white player\'s name. Use an @ mention or use \'me\', \'bot\', or \'any\'');
          return;
        }
        // Unable to get black players id
        if (!black) {
          m.edit('Error resolving the white player\'s name. Use an @ mention or use \'me\', \'bot\', or \'any\'');
          return;
        }
        logger.debug(`creating a new chess game for ` +
          `${msg.channel.type === 'text' ? 'text' : 'dm'} channel ${msg.channel.id}`);
        // We got all the data we need to make a new chess game
        chessGames[msg.channel.id] = {
          game: new Chess(),
          w: white,
          b: black,
          started: moment().utc().valueOf(),
          history: [],
        };
        // Save the game to file (restarts)
        saveGame(msg.channel.id, chessGames[msg.channel.id]);
        m.edit('Game created successfully. :thumbsup:');
        firstMove();
      })
      .catch(err => {
        logger.error(err);
      });
  }

  function deleteGame() {
    if (!chessData) {
      createGameMessage(msg);
      return;
    }
    // If you are not one of the players, you do not get to delete the game
    // Exit if you are not a players or DBKynd
    if (msg.author.id !== chessData.w && msg.author.id !== chessData.b && msg.author.id !== '84770528526602240') {
      msg.reply(`you have to be one of the players to delete the game. \`\`${prefix}chess info\`\``)
        .then(m => {
          m.delete(3000);
          msg.delete(3000);
        })
        .catch(logger.error);
      return;
    }
    logger.debug('need confirmation to make new game');
    // Tell player how to confirm deletion
    msg.channel.sendMessage(`Run: \`\`${prefix}chess confirm\`\` within 10 seconds to confirm deletion.\n` +
      `Run: \`\`${prefix}chess info\`\` for current game info.`);
    // Set flag to allow confirm message to go through
    allowDeletion = true;
    // After 10 seconds set the flag back
    timerDeletion = setTimeout(() => {
      allowDeletion = false;
    }, 10000);
  }

  function confirmDelete() {
    // Exit if you are not a part of the game (exempt DBKynd)
    if (msg.author.id !== chessData.w && msg.author.id !== chessData.b && msg.author.id !== '84770528526602240') {
      msg.reply(`you have to be one of the players to confirm deletion of the game. \`\`${prefix}chess info\`\``)
        .then(m => {
          m.delete(3000);
          msg.delete(3000);
        })
        .catch(logger.error);
      return;
    }
    if (allowDeletion) {
      // Stop the timer from disallowing reset
      if (timerDeletion) {
        clearInterval(timerDeletion);
      }
      // Reset the flag
      allowDeletion = false;
      delete chessGames[msg.channel.id];
      fs.unlink(path.join(gamesDir, `${msg.channel.id}.json`));
      msg.channel.sendMessage(`Game Deleted. :thumbsup:\nRun: ` +
        `\`\`${prefix}chess new <whitePlayer> <blackPlayer>\`\` to make a new game.`);
    } else {
      msg.channel.sendMessage('Unable to delete game. Did you take to long to confirm?');
    }
  }

  function firstMove() {
    if (chessGames[msg.channel.id].w === discord.client.user.id) {
      // The bot goes first
      logger.debug('The bot is white player, going first');
      msg.channel.sendMessage('I\'m playing on the white side. I get to go first. :smirk:')
        .then(m => {
          messagesToDelete.push(m);
        })
        .catch(logger.error);
      nextMove();
    } else {
      // Player goes first
      msg.channel.sendFile(path.join(chessDir, 'board.jpg'), 'chess.jpg')
        .then(m => {
          messagesToDelete.push(m);
          msg.channel.sendMessage(`\`\`${prefix}chess <move>\`\` ` +
            `<http://www.chesscorner.com/tutorial/basic/notation/notate.htm>\n` +
            'You are playing on the white side. You get to go first.\nGood luck :wink:')
            .then(n => {
              messagesToDelete.push(n);
            })
            .catch(logger.error);
        })
        .catch(logger.error);
    }
  }

  function nextMove() {
    logger.debug('Next chess move');
    // Is this move a player move or a bot move?
    if (chessData[chessData.game.turn()] === discord.client.user.id) {
      // It is the bots turn to make it's move
      aiGo();
    } else {
      // A player made a move
      playerGo();
    }
  }

  function playerGo() {
    logger.debug(`Chess - Player move to: ${params[0]}`);
    // Attempt to move a chess piece
    // See if the move was valid or not
    const color = chessData.game.turn() === 'w' ? 'white' : 'black';
    const successfulMove = chessData.game.move(params[0]);
    if (successfulMove) {
      logger.debug(`The '${color}' player made a valid move: ${params[0]}`);
      processMove(params[0]);
    } else {
      logger.debug(`The '${color}' player made an invalid move: ${params[0]}`);
      msg.channel.sendMessage('Invalid move, please try again.');
    }
  }

  function aiGo() {
    logger.debug('Chess - Bot GO');
    const moves = chessData.game.moves();
    const move = moves[Math.floor(Math.random() * moves.length)];
    const color = chessData.game.turn() === 'w' ? 'white' : 'black';
    const successfulMove = chessData.game.move(move);
    if (successfulMove) {
      logger.debug(`The '${color}' bot made a valid move: ${move}`);
      processMove(move);
    } else {
      logger.debug(`The '${color}' bot made an invalid move: ${move}`);
      msg.channel.sendMessage('The bot made an invalid move. This shouldn\'t happen. <@84770528526602240>');
    }
  }

  // Graphically make a chess board with the chess piece sprites composed over it
  function processMove(move) {
    logger.debug(`saving chess move: ${move}`);
    // Save move to move history
    chessData.history.push(move);
    // Save game status to file for restarts
    saveGame(msg.channel.id, chessData);

    // Image stuff
    // Upload new image

    // Next move if next player is bot
    if (chessData[chessData.game.turn()] === discord.client.user.id) {
      nextMove();
    }
  }
};

function createGamesDir() {
  return new Promise((resolve, reject) => {
    fs.exists(gamesDir, exists => {
      if (exists) {
        resolve();
      } else {
        fs.mkdir(gamesDir, err => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      }
    });
  });
}

function loadGames() {
  return new Promise((resolve, reject) => {
    fs.readdir(gamesDir, (err, files) => {
      if (err) {
        reject(err);
      } else {
        logger.debug(`Loading ${files.length} chess game${files.length === 1 ? '' : 's'}.`);
        const promiseArray = files.map(f => loadGameFile(f, path.join(gamesDir, f)));
        Promise.all(promiseArray)
          .then(resolve)
          .catch(reject);
      }
    });
  });
}

function loadGameFile(id, file) {
  return new Promise((resolve, reject) => {
    logger.debug(`Loading chess game: ${id}`);
    fs.readFile(file, 'utf8', (err, text) => {
      if (err) {
        reject(err);
      } else {
        const json = JSON.parse(text);
        chessGames[id.replace('.json', '')] = {
          game: new Chess(json.game),
          w: json.w,
          b: json.b,
          started: json.started,
          history: json.history,
        };
        resolve();
      }
    });
  });
}

// Save text with fen, white id, black id, and created timestamp
function saveGame(id, data) {
  logger.debug(`Saving chess game for channel ${id}`);
  const json = {
    game: data.game.fen(),
    w: data.w,
    b: data.b,
    started: data.started,
    history: data.history,
  };
  fs.writeFile(path.join(gamesDir, `${id}.json`), JSON.stringify(json, null, 2));
}

// Child function as it does not run async
function aiProcess(history, callback) {
  chessAI.send(history);
  chessAI.on('message', callback);
}
