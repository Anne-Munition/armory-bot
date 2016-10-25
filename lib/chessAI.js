'use strict';
const chessAI = require('chess-ai-kong');

chessAI.setOptions({
  depth: 4,
  monitor: false,
  strategy: 'basic',
  timeout: 8000,
});

// This times out in 8 seconds and we call for the data in 10 seconds
// If the data is not set we use a random move instead

process.on('message', pgn => {
  try {
    const move = chessAI.play(pgn);
    process.send(move);
  } catch (e) {
    process.send(null);
  }
});
