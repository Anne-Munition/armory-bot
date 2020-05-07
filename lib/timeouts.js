const moment = require('moment');

let client;

async function init(_client) {
  // store client to a global variable
  client = _client;
  // get all timeout entries from the database
  const entries = await client.mongo.timeouts.find();
  // loop through entries and restart the timer for each one
  entries.forEach(entry => {
    // get the duration until expiry in milliseconds
    const duration = moment.duration(moment().diff(moment(entry.expiresAt)));
    startTimeout(entry.discordId, duration.asMilliseconds());
  });
}

async function removeTimeout(id) {
  if (!id) return;
  // get any existing database info
  const entry = await client.mongo.timeouts.findOne({ discordId: id });
  // target string will hold the name of the target from whatever source we can get it from; Discord or Database
  let targetString;
  // try to get the target from discord itself
  const target = client.members.get(id);
  if (target) {
    // target found; use structured name in case the username has changed since its addition
    targetString = `${target.user.username}#${target.user.discriminator} (${target.user.id})`;
  } else if (entry) {
    // if no target, the user might of left any guilds the client is in
    // so we will use the stored username string from the database
    targetString = entry.username;
  } else {
    // no discord user found and no entry was stored; this is likely due to an error
    // so we will just post the id
    targetString = id;
  }
  // delete the database entry if existing
  if (entry) entry.delete();
  // remove the role if we have a user target
  if (target) target.removeRole('706906565784895509').catch();
  // send a message to #mod-logs with info about the timeout expiration
  client.channels.get('707788445774512128').sendMessage(`The timeout has ended for **${targetString}**`).catch();
}

function startTimeout(id, ms) {
  setTimeout(() => {
    removeTimeout(id).catch();
  }, ms);
}

module.exports = {
  init,
  startTimeout,
};
