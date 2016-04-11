'use strict';
const Twitter = require('twitter'),
    Entities = require('html-entities').AllHtmlEntities,
    exec = require('child_process').exec;

module.exports = function (utils, options, discord, request, fs, path, mongo) {
    var twitter = new Twitter({ //Instantiate Twitter library
        consumer_key: options.twitter.consumer_key,
        consumer_secret: options.twitter.consumer_secret,
        access_token_key: options.twitter.access_token_key,
        access_token_secret: options.twitter.access_token_secret
    });

    var twitterReconnectCount = 0; //Set reconnect count to 0
    var entities = new Entities(); //Instantiate Entities library
    var resetCount; //Timer placeholder
    var screen_name = "";

    twitterConnect(); //Connect to twitter on startup

    function twitterConnect() { //Connect to twitter
        utils.log("Connecting to Twitter...");
        twitter.get('users/lookup', {user_id: options.twitter.access_token_key.split("-")[0]}, (err, body, res) => {
            if (!err && res.statusCode == 200) {//This GET request requires auth. This is our credentials and availability check
                screen_name = body[0].screen_name;
                twitter.stream('user', {with: 'user'}, (stream) => { //If connect is ok, startup stream listener
                    utils.log("Successful connection to Twitter as '" + body[0].screen_name + "'");
                    resetCount = setTimeout(() => { //TODO: This would be better implemented if a stream.on('connected') event existed
                        twitterReconnectCount = 0; //Reset count after 9 seconds. This gets canceled if a reconnect is required
                    }, 9000);
                    stream.on('data', (tweet) => { //New tweet data received
                        if (tweet.friends) return; //Exit if not a tweet but friends list
                        if (tweet.delete) return; //Exit if activity is a deletion
                        if (tweet.user.id_str != options.twitter.access_token_key.split("-")[0]) return; //Exit if tweet not from user
                        if (tweet.in_reply_to_status_id != null) return; //Exit if used reply button to reply
                        handleTweet(tweet);
                    });

                    stream.on('error', (err) => { //Log when any errors occur on the twitter stream
                        utils.log("Twitter stream error: " + JSON.stringify(err));
                    });

                    stream.on('end', () => { //Fired on a unsuccessful login attempt or a disconnect
                        utils.log("Twitter stream disconnected");
                        twitterReconnect();
                    });
                });
            } else { //GET request failed
                utils.log("Connection to Twitter failed");
                twitterReconnect();
            }
        });
    }

    function twitterReconnect() { //Reconnect to twitter
        if (resetCount) clearTimeout(resetCount); //Stop reset count timer
        if (twitterReconnectCount >= 100) { //Exit if reconnection attempts is over 100
            utils.log("Twitter reconnect failed an excessive amount - terminating script");
            process.exit();
        }
        twitterReconnectCount++;
        utils.log("Attempting to reconnect to Twitter in " + twitterReconnectCount * 10 + " seconds");
        setTimeout(function () { //Wait and reconnect after x seconds
            twitterConnect();
        }, 1000 * twitterReconnectCount * 10);
    }

    function handleTweet(tweet) {
        utils.log("Twitter activity...");
        utils.log(JSON.stringify(tweet.text)); //Log tweet text as reference
        let str = entities.decode(tweet.text); //Decode html entities in the twitter text string so they appear correctly (&amp)
        let entityUrls = utils.get(tweet, 'entities.urls');
        if (entityUrls) {
            for (let i = 0; i < entityUrls.length; i++) { //Loop through the entities object
                if (entityUrls[i].expanded_url) {
                    str = str.replace(entityUrls[i].url, entityUrls[i].expanded_url);
                }
            }
        }
        let mediaUrls = []; //Create an empty list to hold urls found in the tweet string
        let media = utils.get(tweet, 'extended_entities.media');
        if (media) {
            for (let i = 0; i < media.length; i++) { //Loop through the extended entities object
                switch (media[i].type) {
                    case 'photo':
                        if (media[i].media_url_https || media[i].media_url) {
                            let url = (media[i].media_url_https) ? media[i].media_url_https : media[i].media_url;
                            str = str.replace(media[i].url, ""); //Remove the url string from the tweet string
                            mediaUrls.push([media[i].type, url]); //Add url to list
                        }
                        break;
                    case 'animated_gif':
                        let variants = utils.get(media[i], 'video_info.variants');
                        if (variants.length != 0) {
                            if (variants[0].url) {
                                str = str.replace(media[i].url, ""); //Remove the url string from the tweet string
                                let backup_img_url = (media[i].media_url_https) ? media[i].media_url_https : media[i].media_url;
                                mediaUrls.push([media[i].type, variants[0].url, backup_img_url]); //Add url to list
                            }
                        }
                        break;
                }
            }
        }
        let body = str.trim(); //Trim any white space left from removing urls
        str = "```New Tweet from " + tweet.user.screen_name + "```<https://twitter.com/" + tweet.user.screen_name +
            "/status/" + tweet.id_str + ">\n"; //Start new string to post to discord
        if (body.length != 0) str += "\n" + body + "\n"; //If all that was in the tweet was links don't append body

        mongo.twitterChannelsModel.find({}, (err, channels) => { //Get channels list to post to
            if (err) return utils.log("mongoDB error: " + err.message);
            getMedia(() => {
                let count = 0;

                function next() {
                    if (count++ >= channels.length - 1) {
                        removeDir(path.join(process.cwd(), "temp/" + tweet.id_str));
                    }
                }

                for (let i = 0; i < channels.length; i++) {
                    let id = channels[i].channel_id;
                    discord.quickMessage(id, str, (err) => {
                        postMedia(id, () => {
                            next();
                        });
                    });
                }
            });
        });

        function postMedia(channel, callback) {
            if (mediaUrls.length == 0 && callback) callback();
            let count = 0;

            function next() {
                if (count++ >= mediaUrls.length - 1) {
                    if (callback) callback();
                }
            }

            for (let i = 0; i < mediaUrls.length; i++) {
                let file = (mediaUrls[i][1].gif) ? mediaUrls[i][1].gif : mediaUrls[i][1];
                discord.quickFile(channel, file, () => {
                    next();
                });
            }
        }

        function getMedia(callback) {
            if (mediaUrls.length == 0 && callback) callback();
            let count = 0;

            function next() {
                if (count++ >= mediaUrls.length - 1) {
                    if (callback) callback();
                }
            }

            for (let i = 0; i < mediaUrls.length; i++) {
                switch (mediaUrls[i][0]) {
                    case 'photo':
                        next();
                        break;
                    case 'animated_gif':
                        createTweetDir({url: mediaUrls[i][1], id: tweet.id_str + "-" + i})
                            .then(downloadMP4)
                            .then(saveMP4)
                            .then(createFramesDir)
                            .then(createFrames)
                            .then(createGIF)
                            .then(compressGIF)
                            .then((data) => {
                                mediaUrls[i][1] = data;
                                next();
                            }, (err) => {
                                utils.log(JSON.stringify(err));
                                if (mediaUrls[i][2]) {
                                    mediaUrls[i][1] = mediaUrls[i][2]
                                } else {
                                    mediaUrls[i][1] = null;
                                }
                                next();
                            });
                        break;
                }
            }
        }

        function createTweetDir(data) {
            return new Promise((resolve, reject) => {
                let tweetDir = path.join(process.cwd(), "/temp/" + data.id.split("-")[0]);
                data.tweetDir = tweetDir;
                fs.exists(tweetDir, (exists) => {
                    if (exists) {
                        resolve(data);
                    } else {
                        fs.mkdir(tweetDir, (err) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(data);
                            }
                        });
                    }
                });

            });
        }

        function downloadMP4(data) {
            return new Promise((resolve, reject) => {
                request.get({url: encodeURI(data.url), encoding: null}, (err, res, buffer) => {
                    if (err) reject(err);
                    if (res.statusCode != 200) reject(res.statusCode);
                    data.buffer = buffer;
                    resolve(data);
                });
            });
        }


        function saveMP4(data) {
            return new Promise((resolve, reject) => {
                let mp4 = path.join(data.tweetDir, data.id + ".mp4");
                fs.writeFile(mp4, data.buffer, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        data.mp4 = mp4;
                        resolve(data);
                    }
                })
            });
        }

        function createFramesDir(data) {
            return new Promise((resolve, reject) => {
                let framesDir = path.join(data.tweetDir, data.id);
                fs.mkdir(framesDir, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        data.framesDir = framesDir;
                        resolve(data);
                    }
                });
            });
        }

        function createFrames(data) {
            return new Promise((resolve, reject) => {
                let frames = path.join(data.framesDir, "/ffout%03d.png");
                let child = exec("ffmpeg -i \"" + data.mp4 + "\" -vf scale=250:-1:flags=lanczos,fps=10 \"" + frames + "\"",
                    (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            data.frames = frames;
                            resolve(data);
                        }
                    });
            });
        }

        function createGIF(data) {
            return new Promise((resolve, reject) => {
                let frames = data.frames.replace("ffout%03d.png", "ffout*.png");
                let gif = path.join(data.tweetDir, data.id + ".gif");
                let child = exec("gm convert -loop 0 \"" + frames + "\" \"" + gif + "\"",
                    (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            data.gif = gif;
                            resolve(data);
                        }
                    });
            });
        }

        function compressGIF(data) {
            return new Promise((resolve, reject) => {
                resolve(data);
            });
        }

        function removeDir(dirPath) {
            fs.exists(dirPath, (exists) => {
                if (exists) {
                    let child = exec("rm -rf \"" + dirPath + "\"", (err) => {
                        if (err) {
                            let child = exec("rmdir \"" + dirPath + "\" /s /q", (err) => {
                                if (err) {
                                    utils.log("Unable to remove the folder at: " + dirPath);
                                }
                            });
                        }
                    });
                }
            });
        }
    }

    function getName() {
        return screen_name;
    }

    return {
        getName: getName
    }
};
