'use strict';
exports.info = {
  desc: 'Book Club Commands.',
  usage: '[join | leave | set | done | notify | history]',
  aliases: [],
};

const config = require('../../config');
const request = require('superagent');
const xml2jsParser = require('superagent-xml2jsparser');
const moment = require('moment');
const striptags = require('striptags');

exports.run = (client, msg, params = []) => new Promise((resolve, reject) => {
  // Not used in DMs
  if (msg.channel.type === 'dm') {
    client.utils.dmDenied(msg).then(resolve).catch(reject);
    return;
  }

  // Only used in the Armory Server
  if (msg.guild.id !== '84764735832068096' && msg.guild.id !== '140025699867164673') {
    msg.reply('That command is not available in this Guild.').then(resolve).catch(reject);
    return;
  }

  // Lowercase all parameters
  params = params.map(x => x.toLowerCase());

  // Does the bot have permission to change roles?
  if (!msg.guild.members.get(client.user.id).hasPermission('MANAGE_ROLES_OR_PERMISSIONS')) {
    reject('Bot lacking MANAGE_ROLES permission.');
    return;
  }
  const bcRole = msg.guild.roles.find('name', 'Book Club');
  const bcPresRole = msg.guild.roles.find('name', 'Book Club President');

  if (!bcRole || !bcPresRole) {
    reject('Unable to resolve Role for Book Club.');
    return;
  }

  const usersRoles = msg.member.roles.map(r => r.id);
  const inBookClub = usersRoles.indexOf(bcRole.id) !== -1;
  const isPres = usersRoles.indexOf(bcPresRole.id) !== -1;

  // Show the current book info if we have it
  if (params.length === 0) {
    postBook();
    return;
  }

  // User wants to join the book club
  if (params[0] === 'join') {
    if (inBookClub) {
      msg.reply('You are already in the Book Club and will receive notifications.').then(resolve).catch(reject);
      return;
    }
    msg.member.addRole(bcRole)
      .then(() => msg.reply('Welcome to the Armory Book Club! You will now receive notifications.'), () => {
        msg.reply('There was an error setting your Role.');
      })
      .then(resolve)
      .catch(reject);
    return;
  }

  // User wants to leave the book club
  if (params[0] === 'leave') {
    if (!inBookClub) {
      msg.reply('You were not in the Book Club.').then(resolve).catch(reject);
      return;
    }
    msg.member.removeRole(bcRole)
      .then(() => {
        msg.reply('Thanks for being a part of the Armory Book Club. You will no longer receive notifications.');
      }, () => {
        msg.reply('There was an error setting your Role.');
      })
      .then(resolve)
      .catch(reject);
    return;
  }

  // User wants to see the book club book history
  if (params[0] === 'history') {
    client.mongo.bookClub.find()
      .then(results => {
        if (results.length === 0) {
          msg.reply('There is no Book history yet. Please set a book.').then(resolve).catch(reject);
          return;
        }
        let n = 1;
        const sorted = results
          .sort((a, b) => b.date_added - a.date_added)
          .map(x => {
            const date = moment(x.date_added).format('M/D/YY');
            return `\`\`${n++}.\`\` **${x.book_data.title}** - *${x.book_data.author}* - ${date}` +
              `${x.active ? ' - (CURRENT)' : ''}`;
          });
        msg.channel.send(sorted.join('\n')).then(resolve).catch(reject);
      }).catch(reject);
    return;
  }

  function pres() {
    if (!isPres) {
      msg.reply('You have to be a Book Club President to run this command.').then(resolve).catch(reject);
      return false;
    } else {
      return true;
    }
  }

  // Book Club President want to notify all the members
  if (params[0] === 'notify') {
    if (pres()) {
      // Join the rest of the message in to a string
      const str = params.splice(1, params.length - 1).join(' ');
      bcRole.setMentionable(true)
        .then(() => msg.delete())
        .then(() => msg.channel.send(`<@&${bcRole.id}> ${str}`))
        .then(() => bcRole.setMentionable(false))
        .then(resolve)
        .catch(reject);
    }
    return;
  }

// Book Club President want to notify all the members
  if (params[0] === 'set') {
    if (pres()) {
      const book = params.splice(1, params.length - 1).join(' ');
      searchBook(book)
        .then(books => {
          books = books.GoodreadsResponse.search[0];
          if (books['total-results'] === 0) {
            msg.reply(`The search returned no results.`).then(resolve).catch(reject);
            return;
          }
          const set = books.results[0].work
            .filter(x => x.best_book[0].$.type === 'Book')
            .splice(0, 5)
            .map(x => {
              return {
                id: x.best_book[0].id[0]._,
                title: x.best_book[0].title[0],
                author: x.best_book[0].author[0].name[0],
                image: x.best_book[0].image_url[0],
                rating: x.average_rating[0],
                year: x.original_publication_year[0]._,
              };
            });
          let num = 1;
          const list = set.map(x => `\`\`${num++}.\`\` **${x.title}** - *${x.author}* - ` +
          `(${x.year}) - Rating: ${x.rating}`);
          msg.channel.send(`Please select a number from the following list within 15 seconds\n\n${list.join('\n')}`)
            .then(listMessage => {
              const collector = msg.channel.createMessageCollector(
                x => x.author.id === msg.author.id, { time: 15000 });
              collector.on('collect', m => {
                const numSel = parseInt(m.content);
                if (!isNaN(numSel) && numSel > 0 && numSel < 6) {
                  collector.stop();
                  // Deactivate all active books
                  client.mongo.bookClub.findOne({ active: true })
                    .then(oldBook => {
                      if (oldBook) {
                        oldBook.active = false;
                        return oldBook.save();
                      }
                      return null;
                    })
                    .then(() => {
                      // Get full book info including synapses
                      const ourSelectedBook = set[numSel - 1];
                      return showBook(ourSelectedBook.id);
                    })
                    .then(bookInfo => {
                      const ourSelectedBook = set[numSel - 1];
                      ourSelectedBook.description = bookInfo.GoodreadsResponse.book[0].description[0];
                      const entry = client.mongo.bookClub({
                        book_data: ourSelectedBook,
                        date_added: new Date(),
                        active: true,
                      });
                      return entry.save();
                    })
                    .then(() => listMessage.delete())
                    .then(() => m.delete())
                    .then(() => postBook())
                    .then(resolve)
                    .catch(reject);
                }
              });
              collector.on('end', (col, reason) => {
                if (reason === 'time') {
                  listMessage.delete().catch(reject);
                }
              });
            })
            .catch(reject);
        });
    }
    return;
  }

  // We are done reading the current book
  if (params[0] === 'done') {
    if (pres()) {
      client.mongo.bookClub.findOne({ active: true })
        .then(result => {
          if (result) {
            result.active = false;
            result.save()
              .then(() => msg.reply('The current book has been saved. Please set a new book.'))
              .then(resolve)
              .catch(reject);
          }
        });
    }
    return;
  }

  function postBook() {
    client.mongo.bookClub.findOne({ active: true })
      .then(result => {
        if (!result) {
          return msg.reply('There is no current book to read. Sorry');
        }
        const book = result.book_data;
        const title = `${book.title} - ${book.author} - ${book.year}`;
        const googleLink = `https://www.google.com/search?q=${encodeURIComponent(title)}`;
        const embed = new client.Discord.RichEmbed()
          .setAuthor(title, 'https://s3.amazonaws.com/DBKynd/armoryBot/bookIcon.png', googleLink)
          .setImage(book.image)
          .setDescription(parseDesc(book.description));
        return msg.channel.send('The current book is:\n', { embed });
      })
      .catch(reject);
  }
});

function searchBook(query) {
  return new Promise((resolve, reject) => {
    const uri = `https://www.goodreads.com/search?key=${config.goodreads.key}&q=${encodeURIComponent(query)}`;
    request
      .get(uri)
      .accept('xml')
      .buffer()
      .parse(xml2jsParser)
      .end((err, res) => {
        if (err) return reject(err);
        return resolve(res.body);
      });
  });
}

function showBook(id) {
  return new Promise((resolve, reject) => {
    const uri = `https://www.goodreads.com/book/show?format=xml&key=${config.goodreads.key}&id=${id}`;
    request
      .get(uri)
      .accept('xml')
      .buffer()
      .parse(xml2jsParser)
      .end((err, res) => {
        if (err) return reject(err);
        return resolve(res.body);
      });
  });
}

function parseDesc(str) {
  str = str.replace(/<br \/><br \/>/gmi, '\n');
  return striptags(str);
}