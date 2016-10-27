'use strict';
exports.info = {
  name: 'chess',
  desc: 'Play a game of chess with Discord!',
  usage: 'chess <commands>',
};

const config = require('../../config');
const logger = require('winston');
const fs = require('fs');
const path = require('path');
const Chess = require('chess.js').Chess;
const chessAI = require('child_process').fork('./lib/chessAI');
const moment = require('moment');
const gm = require('gm');
const myEvents = require('../events');
const now = require('performance-now');

// Set paths
const chessDir = path.join(process.cwd(), 'assets/chess');
const gamesDir = path.join(chessDir, 'games');
const prefix = config.commands.prefix;

// Main game object. channel_id: <Object>
const chessGames = {};
let botID = '';

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

// Timer Settings
const deleteSeconds = 10;
const undoSeconds = 10;

// Load any existing chat games into our game object
createGamesDir()
  .then(loadGames)
  .then(() => {
    logger.info(`Loaded ${Object.keys(chessGames).length} chess games`);
    myEvents.emit('chess_ready');
  })
  .catch(err => {
    logger.error('There was an error loading chess games', err);
  });

// Start any games left off on the bots turn after chess and discord are ready
let startedGames = false;
myEvents.on('discord_ready', discord => {
  logger.debug('chess script discord ready event');
  // Only start bot turns once
  if (!startedGames) {
    startedGames = true;
    // Save bot client id for future checks
    botID = discord.user.id;
    logger.debug(`saved bot id as '${botID}'`);
    // Used to stagger chess game starts to spare cpu
    let count = 0;
    for (const game in chessGames) {
      if (chessGames.hasOwnProperty(game)) {
        const turn = chessGames[game][chessGames[game].game.turn()];
        if (turn !== botID) {
          return;
        }
        const channel = discord.channels.find('id', game);
        if (channel) {
          setTimeout(() => {
            logger.debug(`auto starting chess game:`, game);
            aiGo(channel, chessGames[game]);
          }, 5000 * count++);
        }
      }
    }
  }
});

exports.run = (discord, msg, params = []) => {
  // Post usage if no parameters were passed
  if (params.length === 0) {
    msg.channel.sendMessage(`\`\`${prefix}chess <new | delete | undo | info | moves | board | ascii | fen | pgn>\`\``);
    return;
  }
  // Get any game data for this channel if it exists
  const chessData = chessGames[msg.channel.id];
  // Save first parameter for routing
  const cmd = params[0].toLowerCase();

  // There is no chess Data and you are not creating a new game
  if (!chessData && cmd !== 'new') {
    createGameMessage(msg.channel);
    return;
  }

  // These commands anybody can run
  switch (cmd) {
    // Create a new Chess game
    case 'new':
      createGame(msg, chessData, params);
      return;
    // Display info about the channel's chess instance if exists
    case 'info':
      showInfo(msg.channel, chessData);
      return;
    // Upload the chess board again
    case 'board':
      showBoard(msg.channel, chessData);
      return;
    // Show moves history
    case 'moves':
      msg.channel.sendCode('js', JSON.stringify(chessData.history));
      return;
    // Send ASCII representation of the chess board to chat in a code block
    case 'ascii':
      msg.channel.sendCode('ascii', chessData.game.ascii());
      return;
    // Send ASCII representation of the chess board to chat in a code block
    case 'fen':
      msg.channel.sendCode('text', chessData.game.fen());
      return;
    // Send ASCII representation of the chess board to chat in a code block
    case 'pgn':
      msg.channel.sendCode('text', chessData.game.pgn());
      return;
    default:
      break;
  }

  // The following commands must be ran by players of the current game
  // Exempt DBKynd
  if (!isAPlayer(msg, chessData) && msg.author.id !== '84770528526602240') {
    msg.reply(`you are not a part of this game. \`\`${prefix}chess info\`\``)
      .then(m => {
        m.delete(3000);
        msg.delete(3000);
      })
      .catch(logger.error);
    return;
  }

  switch (cmd) {
    // Delete the Chess game
    case 'delete':
      deleteGame(msg.channel, chessData);
      return;
    // Player confirming deletion of a Chess game
    case 'confirm':
      confirmDelete(msg.channel, chessData);
      return;
    // Undo a chess move if timer allows
    case 'undo':
      undo(msg, chessData);
      return;
    // Ping the next player or kickstart the bot
    case 'go':
      nextPlayer(msg.channel, chessData);
      return;
    default:
      break;
  }

  // If we made it this far a player is wanting to make a move
  // Are we still waiting for the undo timer to expire?
  if (chessData.allowUndo) {
    msg.reply('you cannot make any moves while the other player has a chance to undo. Please wait...')
      .then(m => {
        msg.delete(3000);
        m.delete(3000);
      })
      .catch(logger.error);
    return;
  }

  // Finally, it has to be your turn to send move commands
  if (msg.author.id !== chessData[chessData.game.turn()]) {
    msg.reply('it\'s not your turn. Please wait...')
      .then(m => {
        m.delete(3000);
        msg.delete(3000);
      })
      .catch(logger.error);
    return;
  }

  // The game is over, no more move commands
  if (chessData.game.game_over()) {
    msg.channel.sendMessage(`The chess game is over.`);
    return;
  }

  // Send a player move command and see if it is valid
  playerGo(msg.channel, chessData, params);
};

// Create chess games directory
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

// Load games into memory
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

// Load game into memory
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
          finished: json.finished,
          history: json.history,
          ai_type: json.ai_type,
          messages: [],
        };
        resolve();
      }
    });
  });
}

// Post information about the chess game if exists
function showInfo(channel, chessData) {
  logger.debug('chess info');
  // Get player names
  const white = resolvePlayer(channel, chessData.w);
  const black = resolvePlayer(channel, chessData.b);
  // Who's turn is it?
  const turn = chessData.game.turn() === 'w' ? 'White' : 'Black';
  let str = 'Chess Info\n';
  str += `Started: ${moment(chessData.started).fromNow()}\n`;
  str += `Finished: ${chessData.finished ? moment(chessData.finished).fromNow() : null}\n`;
  str += `White: ${white}\n`;
  str += `Black: ${black}\n`;
  str += `Moves: ${chessData.history.length}\n`;
  str += `Turn: ${turn} (${eval(turn.toLowerCase())})\n`;
  // Send data as code block
  const block = `\`\`\`qml\n${str}\`\`\`\`\`${prefix}chess moves\`\` to see move history.`;
  channel.sendMessage(block);
}

function createGameMessage(channel) {
  channel.sendMessage('There are no chess games running in this channel. To make a new game run:\n' +
    `\`\`${prefix}chess new <whitePlayer> <blackPlayer>\`\` using an @ mention, 'me', 'bot' or 'any' ` +
    `for the player.`);
}

function createGame(msg, chessData, params) {
  // Exit if game data exists
  if (chessData) {
    msg.channel.sendMessage(`There is already a game running in this channel.\n` +
      `\`\`${prefix}chess info\`\` or \`\`${prefix}chess delete\`\``);
    return;
  }
  // Must have both players
  if (params.length < 3) {
    msg.channel.sendMessage('Please provide the names of both players. ' +
      `Use an @ mention, 'me', 'bot', or 'any'\n` +
      `\`\`${prefix}chess new <whitePlayer> <blackPlayer>\`\``);
    return;
  }
  // Game already exists, must delete first unless the game is over
  // This is so we don't have to wait for people to delete it
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
        white = botID;
      } else if (any.indexOf(wName) !== -1) {
        white = 'anyone';
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
        black = botID;
      } else if (any.indexOf(bName) !== -1) {
        black = 'anyone';
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
      if (white === botID && black === botID) {
        m.edit('You cannot make a chess game with the bot as both players, sorry.');
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
        finished: null,
        history: [],
        messages: [],
        ai_type: params[3] ? parseInt(params[3]) : 2,
      };
      // Save the game to file (restarts)
      saveGame(msg.channel.id, chessGames[msg.channel.id]);
      m.edit('Game created successfully. :thumbsup:');
      firstMove(msg.channel, chessGames[msg.channel.id]);
    })
    .catch(err => {
      logger.error(err);
    });
}

function deleteGame(channel, chessData) {
  logger.debug('need confirmation to make new game');
  // Tell player how to confirm deletion
  channel.sendMessage(`Run: \`\`${prefix}chess confirm\`\` within 10 seconds to confirm deletion.\n` +
    `Run: \`\`${prefix}chess info\`\` for current game info.`);
  // Set flag to allow confirm message to go through
  chessData.allowDeletion = true;
  // After 10 seconds set the flag back
  chessData.timerDeletion = setTimeout(() => {
    chessData.allowDeletion = false;
  }, 1000 * deleteSeconds);
}

function confirmDelete(channel, chessData) {
  // Are we allowed to delete
  if (chessData.allowDeletion) {
    // Yes - Delete
    // Stop the timer from disallowing reset
    if (chessData.timerDeletion) {
      clearTimeout(chessData.timerDeletion);
    }
    // Reset the flag
    chessData.allowDeletion = false;
    // Delete the game object
    delete chessGames[channel.id];
    // Remove the game file
    fs.unlink(path.join(gamesDir, `${channel.id}.json`));
    // Tell the user process complete
    channel.sendMessage(`Game Deleted. :thumbsup:\nRun: ` +
      `\`\`${prefix}chess new <whitePlayer> <blackPlayer>\`\` to make a new game.`);
  } else {
    // Not allowed to delete
    channel.sendMessage('Unable to delete game. Did you take to long to confirm?');
  }
}

// Post the chessboard in chat again
function showBoard(channel, chessData) {
  // Create the board
  createChessBoardImage(chessData.game)
    .then(board => {
      // Upload it to Discord
      channel.sendFile(board, 'chess.png')
        .then(m => {
          // Delete this image later
          chessData.messages.push(m);
        })
        .catch(logger.error);
    })
    .catch(err => {
      logger.error(err);
      // Post there was an error
      channel.sendMessage('There was an error processing the chessboard image. Please try again.')
        .then(m => {
          // Delete this error message later
          chessData.messages.push(m);
        })
        .catch(logger.error);
    });
}

// Attempt to undo a chess move
function undo(msg, chessData) {
  // See if we are allowed to undo
  if (!chessData.allowUndo) {
    // Not allowed to undo - no data or missed timer
    msg.reply('cannot undo.');
    return;
  }
  // Clear the undo timer if exists
  if (chessData.timerUndo) {
    clearTimeout(chessData.timerUndo);
  }
  // Reset undo flag
  chessData.allowUndo = false;
  logger.debug('Undo Chess move');
  // Undo the last chess move. Should only be player moves
  chessData.game.undo();
  // Delete all the queued for deletion messages
  deleteMessages(chessData);
  // Post a new board with a next player message
  processMove(msg.channel, chessData);
}

// Is the message author allowed to run chess game commands
function isAPlayer(msg, chessData) {
  if (chessData.w === 'anyone' || chessData.b === 'anyone') {
    // Yes if the player is 'anyone'
    return true;
  } else if (chessData.w === msg.author.id || chessData.b === msg.author.id) {
    // Yes if player id matched message author id
    return true;
  }
  return false;
}

// Save json file with game data
function saveGame(id, data) {
  logger.debug(`Saving chess game for channel ${id}`);
  const json = {
    game: data.game.fen(),
    w: data.w,
    b: data.b,
    started: data.started,
    finished: data.finished,
    history: data.history,
    ai_type: data.ai_type,
  };
  fs.writeFile(path.join(gamesDir, `${id}.json`), JSON.stringify(json, null, 2));
}

// Create a new chessboard composted with chess pieces
function createChessBoardImage(game) {
  const start = now();
  return new Promise((resolve, reject) => {
    // Get all the chess board squares
    const squares = game.SQUARES
    // Get the position and piece data
      .map(s => {
        const d = s.split('');
        const square = game.get(s);
        return {
          r: alphaNum.indexOf(d[0]) + 1,
          f: d[1],
          type: square ? square.type : null,
          color: square ? square.color : null,
        };
      })
      // Filter only squares with pieces on them
      .filter(s => s.type !== null);

    // Load the blank chess board into memory
    readBlankBoard()
      .then(board => {
        // Loop through each chess piece and composite layer after layer
        function next(nextImage) {
          // If we are out of things to composite
          if (squares.length === 0) {
            // Resize the chess board for upload
            gm(nextImage)
              .resize(220, 220)
              .toBuffer('PNG', (err, buffer) => {
                if (err) {
                  reject(err);
                } else {
                  // Return the finished chess board as a buffer
                  resolve(buffer);
                  logger.debug('time to process chessboard', now() - start);
                }
              });
            return;
          }
          // Get next square
          const square = squares.shift();
          // Composite next chess piece onto board
          composite(nextImage, square)
            .then(imageResult => {
              // Loop
              next(imageResult);
            })
            .catch(reject);
        }

        // Kick start the composite loop
        next(board);
      })
      .catch(reject);
  });
}

// Read initial blank chess board into memory to start composite loop
function readBlankBoard() {
  return new Promise((resolve, reject) => {
    fs.readFile(path.join(chessDir, 'board.png'), { encoding: null }, (err, buffer) => {
      if (err) {
        reject(err);
      } else {
        resolve(buffer);
      }
    });
  });
}

// Composite a chess piece onto the board
function composite(image, data) {
  return new Promise((resolve, reject) => {
    // data.r = rank # data.f = file #
    const x = ((data.r - 1) * 45) + 45;
    const y = ((8 - data.f) * 45) + 45;
    gm(image)
      .composite(path.join(chessDir, 'pieces', `${data.type}${data.color}.png`))
      // Position chess piece according to rank and file
      .geometry(`+${x}+${y}`)
      .toBuffer('PNG', (err, newBuffer) => {
        if (err) {
          reject(err);
        } else {
          // Return composted image as a buffer
          resolve(newBuffer);
        }
      });
  });
}

function deleteMessages(chessData) {
  if (chessData.messages) {
    chessData.messages
      .forEach(m => {
        m.delete();
      });
  }
  chessData.messages = [];
}

// First move after creating a new chess game
function firstMove(channel, chessData) {
  // Who goes first (white)
  if (chessData.w === botID) {
    // The bot goes first
    logger.debug('The bot is white player, going first');
    // Post message that the bot starts
    channel.sendMessage('I\'m playing on the white side. I get to go first. :smirk:')
      .then(m => {
        // Delete bot starts messaage later
        chessData.messages.push(m);
      })
      .catch(logger.error);
    // The AI makes a move
    aiGo(channel, chessData);
  } else {
    // Player goes first
    // Post a new board with a next player message
    processMove(channel, chessData);
  }
}

// A player had made a move
function playerGo(channel, chessData, params) {
  logger.debug(`Chess - Player move to: ${params[0]}`);
  // Attempt to move a chess piece
  // See if the move was valid or not
  const successfulMove = chessData.game.move(params[0]);
  if (successfulMove) {
    // The move was successful
    logger.debug(`The player made a valid move: ${params[0]}`);
    // Process player move - sending move and true it was a player move
    processMove(channel, chessData, params[0], true);
  } else {
    // The move was invalid
    logger.debug(`The player made an invalid move: ${params[0]}`);
    // Tell the player to try again
    channel.sendMessage('Invalid move, please try again.');
  }
}

// The AI gets to make a move
function aiGo(channel, chessData) {
  logger.debug('Chess AI go');
  if (chessData.ai_type === 1) {
    // AI type 1 = random Math moves
    randomProcess(channel, chessData);
  }
  if (chessData.ai_type === 2) {
    // AI type 2 = AI moves
    // The response should have returned by now, if not we will use a random move
    if (chessData.ai_response === null) {
      // Use a random move
      randomProcess(channel, chessData);
    } else {
      logger.debug('calculated ai chess move type 2', chessData.ai_response);
      // Move the ai move
      setTimeout(() => {
        chessData.game.move(chessData.ai_response);
        processMove(channel, chessData, chessData.ai_response);
      }, 2000);
    }
  }
}

function randomProcess(channel, chessData) {
  // Get available chess moves
  const moves = chessData.game.moves();
  // Randomly get move
  const move = moves[Math.floor(Math.random() * moves.length)];
  // Delay so you can read the bot massage before it auto deletes
  logger.debug(`random ai chess move type ${chessData.ai_type}`, move);
  setTimeout(() => {
    // Move the move we moved
    chessData.game.move(move);
    processMove(channel, chessData, move);
  }, 2000);
}

// Child function as it does not run async
function aiProcess(chessData, id) {
  // Nullify the response before we ask for it
  chessData.ai_response = null;
  // Send history to child to process
  chessAI.send({ history: chessData.history, id });
  // Child responded with a move or null
}

chessAI.on('message', data => {
  if (data.error) {
    logger.error(data.error);
  }
  logger.debug('ai response', data.move);
  // Save the move if it exists otherwise we'll und up using a random one as this will still be null
  if (data.move) {
    chessGames[data.id].ai_response = data.move;
  }
});

function processMove(channel, chessData, move, player) {
  // Save game status to file for restarts even if there was no move (undo/starts)
  saveGame(channel.id, chessData);
  // If there was a move sent (ai/player)
  if (move) {
    logger.debug(`process move, saving move: ${move}`);
    // Save move to move history
    chessData.history.push(move);
    // Delete all the queued messages for this channel
    deleteMessages(chessData);
    // Post the ai's move if ai
    if (!player) {
      channel.sendMessage(`My move was \`\`${move}\`\``);
    }
  }
  // If the next players turn is the boat and we are using ai_type 2 start the calculations now
  // Child process as it was not async
  if (chessData[chessData.game.turn()] === botID && chessData.ai_type === 2) {
    // Start aiProcess, should finish by the time we need it, otherwise random method used
    aiProcess(chessData, channel.id);
  }
  // Create a new chessboard image with current condition
  createChessBoardImage(chessData.game)
    .then(board => {
      // Upload the board when it is ready
      channel.sendFile(board, 'chess.png')
        .then(m => {
          // Save the board image for deletion later
          chessData.messages.push(m);
          // If this was a players move we want to use undo
          if (player) {
            const str = `You have ${undoSeconds} seconds for to run ` +
              `\`\`${prefix}chess undo\`\` if you made a mistake.`;
            // Post undo instructions
            channel.sendMessage(str)
              .then(n => {
                // Delete undo instructions later
                chessData.messages.push(n);
                // Set allow Undo flag to true
                chessData.allowUndo = true;
                // Continue on to post the next players info if undo is not used
                // before this timer expires
                chessData.timerUndo = setTimeout(() => {
                  // Pass along undo message for editing later
                  afterUndoExpired(channel, chessData, n);
                }, 1000 * undoSeconds);
              })
              .catch(logger.error);
          } else {
            // This was a bot that moved; post next player info
            afterUndoExpired(channel, chessData);
          }
        })
        .catch(logger.error);
    })
    .catch(logger.error);
}

function afterUndoExpired(channel, chessData, undoMsg) {
  // Make sure we cannot undo once we hit this  point
  chessData.allowUndo = false;
  // If we passed an undo message, edit it to show the undo timer is expired
  if (undoMsg) {
    undoMsg.edit('Undo timer expired.');
  }
  checkConditions(channel, chessData, (str, exit) => {
    if (str) {
      channel.sendMessage(str);
    }
    if (exit) {
      chessData.finished = moment().utc().valueOf();
      return;
    }
    str = null;
    // Bot or player next
    if (chessData[chessData.game.turn()] === botID) {
      // Post the bot is making a move
      str = 'Making my move...';
      // Loop back to ai movement
      aiGo(channel, chessData);
    } else {
      // Get the user who's turn it is currently
      const user = resolvePlayer(channel, chessData[chessData.game.turn()], true);
      str = `${user}, it is your turn.\n`;
      str += `\`\`${prefix}chess <move>\`\`\n` +
        `<http://www.chesscorner.com/tutorial/basic/notation/notate.htm>\n`;
    }
    // Send the next player mention message to Discord
    channel.sendMessage(str)
      .then(m => {
        // Delete the next player mention later
        chessData.messages.push(m);
      })
      .catch(logger.error);
  });
}

function checkConditions(channel, chessData, callback) {
  // Non exiting conditions
  if (chessData.game.in_check()) {
    const checkee = resolvePlayer(channel, chessData[chessData.game.turn()]);
    return callback(`${checkee}, you are in check.`, false);
  }
  if (chessData.game.in_threefold_repetition()) {
    return callback('The board has been in this position three or more times.', false);
  }
  // Exiting conditions
  if (chessData.game.in_checkmate()) {
    let matee = chessData.game.turn();
    let mater = matee === 'b' ? 'w' : 'b';
    matee = resolvePlayer(channel, chessData[matee], true);
    mater = resolvePlayer(channel, chessData[mater], true);
    return callback(`${matee} was mated in ${chessData.history.length} moves by ${mater}`, true);
  }
  if (chessData.game.in_stalemate()) {
    let matee = chessData.game.turn();
    let mater = matee === 'b' ? 'w' : 'b';
    matee = resolvePlayer(channel, chessData[matee], true);
    mater = resolvePlayer(channel, chessData[mater], true);
    return callback(`${matee} was stalemated in ${chessData.history.length} moves by ${mater}\n` +
      `The game is a draw`, true);
  }
  if (chessData.game.in_draw()) {
    const reason = chessData.game.insufficient_material() ? 'Insufficient Materials' : '50-move rule';
    return callback(`This game has ended in a draw. Reason: ${reason}`, true);
  }
  return callback(null, false);
}

function resolvePlayer(channel, id, obj) {
  if (id === 'anyone') {
    return '@anyone';
  }
  let user;
  if (channel.type === 'dm') {
    user = channel.client.users.find('id', id);
    if (user) {
      return obj ? user : user.username;
    }
  } else {
    user = channel.guild.members.find('id', id);
    if (user) {
      return obj ? user : user.nickname || user.user.username;
    }
  }
  return null;
}

function nextPlayer(channel, chessData) {
  if (chessData[chessData.game.turn()] === botID) {
    aiGo(channel, chessData);
  } else {
    processMove(channel, chessData);
  }
}
