'use strict';
const chessAI = require('chess-ai-kong');

chessAI.setOptions({
  depth: 4,
  monitor: false,
  strategy: 'basic',
  timeout: 3000,
});

process.on('message', pgn => {
  const move = chessAI.play(pgn);
  process.send(move);
});
