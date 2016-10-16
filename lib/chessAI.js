'use strict';
const chessAI = require('chess-ai-kong');

chessAI.setOptions({
  depth: 4,
  monitor: false,
  strategy: 'basic',
  timeout: 10000,
});

process.on('message', pgn => {
  try {
    const move = chessAI.play(pgn);
    process.send({ err: null, move });
  } catch (err) {
    process.send({ err });
  }
});
