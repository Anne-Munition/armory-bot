'use strict';
const request = require('request'),
    utils = require('../utilities.js')();

module.exports = function (message, query) {
    //Gets G rated random giphy result from the supplied query
    if (query.length == 0) return;
    let limit = 10;
    let results = [];
    query = query.join(" ");
    let url = "http://api.giphy.com/v1/gifs/search?q=" + query + "&api_key=dc6zaTOxFJmzC&fmt=json&limit=" + limit;
    request.get({
        url: encodeURI(url),
        json: true
    }, (err, res, body) => {
        if (err || res.statusCode != 200) return message.channel.sendMessage("Error getting Giphy results for: ``" + query + "``");
        results = body.data;
        if (results.length == 0) return message.channel.sendMessage("No Giphy results found for ``" + query + "``");
        if (results.length < limit) limit = results.length;
        let count = 0;
        getRandomGiphy(query);

        function getRandomGiphy(query) {
            function next() {
                count++;
                if (count < limit) {
                    getRandomGiphy(query);
                } else {
                    message.channel.sendMessage("No acceptable Giphy results found for ``" + query + "``. To big to embed or explicit rating.");
                }
            }

            let r = utils.getRandomInt(0, results.length);
            let gif = results[r];
            results = results.splice(r, 1);
            let image = utils.get(gif, "images.original");
            if (gif.rating == "r" || gif.type != "gif" || !image || image.size > 8000000) return next();
            message.channel.sendMessage("``" + query + "``\n" + image.url);
        }
    });
};
