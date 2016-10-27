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

process.on('message', data => {
  try {
    const move = chessAI.play(data.history);
    process.send({ move, id: data.id });
  } catch (error) {
    process.send({ move: null, id: data.id, error });
  }
});
