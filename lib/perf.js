'use strict';
const logger = require('winston');
const pusage = require('pidusage');

setTimeout(check, 1000 * 15);
setInterval(check, 1000 * 60 * 60);

function check() {
  pusage.stat(process.pid, (err, stat) => {
    if (!err) {
      logger.info('Pcpu:', stat.cpu.toFixed(3), 'Mem:', (stat.memory / 1024 / 1024).toFixed(2));
    }
  });
}
