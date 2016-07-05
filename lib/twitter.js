'use strict';
const Twitter = require('twitter'), //Twitter module
    Entities = require('html-entities').AllHtmlEntities, //HTML Entities module
    exec = require('child_process').exec, //EXEC cmd module
    request = require('request'),
    fs = require('fs'),
    path = require('path'),
    utils = require('./utilities.js')();
    
module.exports = function (options, discord, mongo) {
    var twitter = new Twitter({ //Get new twitter client
        consumer_key: options.twitter.consumer_key,
        consumer_secret: options.twitter.consumer_secret,
        access_token_key: options.twitter.access_token_key,
        access_token_secret: options.twitter.access_token_secret
    });

    var twitterReconnectCount = 0; //Count of how many reconnect attempts
    var entities = new Entities(); //Instantiate Entities library
    var resetCount; //Timer that immediately starts a reconnect, but is canceled if a good connection occurs
    var screen_name = ""; //Screen name for Discord messages

    //Connect to twitter
    function twitterConnect() {
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
                        if (tweet.delete) { //If tweet is a deletion, delete all the corresponding discord messages and return
                            deleteTweet(tweet);
                            return;
                        }
                        if (tweet.user.id_str != options.twitter.access_token_key.split("-")[0]) return; //Exit if tweet not from the owner. 'RT'
                        if (tweet.in_reply_to_status_id != null) return; //Exit if used reply button to reply. 'PM'
                        handleTweet(tweet); //This is a 'real' tweet
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

    //Reconnect to twitter
    function twitterReconnect() {
        if (resetCount) clearTimeout(resetCount); //Stop reset count timer
        if (twitterReconnectCount >= 100) { //Exit if reconnection attempts is over 100
            utils.log("Twitter reconnect failed an excessive amount - terminating script");
            process.exit();
        }
        twitterReconnectCount++; //Add to reconnect count
        utils.log("Attempting to reconnect to Twitter in " + twitterReconnectCount * 10 + " seconds");
        setTimeout(function () { //Wait and reconnect after x seconds
            twitterConnect();
        }, 1000 * twitterReconnectCount * 10);
    }

    //New tweet to post in Discord
    function handleTweet(tweet) {
        utils.log("Twitter activity...");
        utils.log(JSON.stringify(tweet.text)); //Log tweet text as reference
        let str = entities.decode(tweet.text); //Decode html entities in the twitter text string so they appear correctly (&amp)
        let entityUrls = utils.get(tweet, 'entities.urls'); //Get any urls from the tweet. NOT img or video urls
        if (entityUrls) {
            for (let i = 0; i < entityUrls.length; i++) {
                if (entityUrls[i].expanded_url) {
                    str = str.replace(entityUrls[i].url, entityUrls[i].expanded_url); //If exists, alter the twitter url with the full url
                }
            }
        }
        let mediaUrls = []; //List to hold image and video urls
        let media = utils.get(tweet, 'extended_entities.media'); //Get the tweet's media object
        if (media) {
            for (let i = 0; i < media.length; i++) {
                switch (media[i].type) { //What type of file is it? (image or gif)
                    case 'photo':
                        if (media[i].media_url_https || media[i].media_url) {
                            let url = (media[i].media_url_https) ? media[i].media_url_https : media[i].media_url; //Use the HTTPS or HTTP image url if available
                            str = str.replace(media[i].url, ""); //Remove the url string from the tweet string
                            mediaUrls.push([media[i].type, url]); //Add image url to list
                        }
                        break;
                    case 'animated_gif':
                        let variants = utils.get(media[i], 'video_info.variants'); //Get the mp4 data object
                        if (variants.length != 0) {
                            if (variants[0].url) {
                                str = str.replace(media[i].url, ""); //Remove the url string from the tweet string
                                let backup_img_url = (media[i].media_url_https) ? media[i].media_url_https : media[i].media_url; //use HTTPS or HTTP media image as backup if conversion fails
                                mediaUrls.push([media[i].type, variants[0].url, backup_img_url]); //Add media data to list
                            }
                        }
                        break;
                }
            }
        }
        let body = str.trim(); //Trim any white space from removing urls
        str = "```New Tweet from " + tweet.user.screen_name + "```<https://twitter.com/" + tweet.user.screen_name +
            "/status/" + tweet.id_str + ">\n"; //Start new string to post to discord
        if (body.length != 0) str += "\n" + body + "\n"; //If all that was in the tweet was links, don't append body
        let msg_ids = []; //List to hold all message ids to be stored in case of deletion
        mongo.twitterChannels.find({}, (err, channels) => { //Get the channel ids to post tweets to
            if (err) return utils.log("mongoDB error: " + err.message);
            getMedia(() => { //After all media is ready
                let count = 0;

                function next() {
                    count++;
                    if (count >= channels.length - 1) { //After all channels have been posted to
                        let entry = new mongo.tweetMessages({
                            tweet_id: tweet.id_str,
                            messages: msg_ids
                        });
                        entry.save(); //Save the tweet_id against all corresponding discord message ids
                        removeDir(path.join(__dirname, "../temp/" + tweet.id_str)); //Remove the temp tweet dir if exists
                    }
                }

                for (let i = 0; i < channels.length; i++) { //Post to all channels in tweets list
                    let id = channels[i].channel_id;
                    discord.client.sendMessage(id, str, (err, result) => {
                        msg_ids.push({channel: result.channel.id, message: result.id}); //Save header message id to list
                        postMedia(id, () => { //Post all media in media list to each channel
                            next();
                        });
                    });
                }
            });
        });

        function postMedia(channel, callback) {
            if (mediaUrls.length == 0 && callback) callback(); //Return if there are is no media
            let count = 0;

            function next() { //After each media element is posted
                if (count++ >= mediaUrls.length - 1) {
                    if (callback) callback(); //Done after last media element
                }
            }

            for (let i = 0; i < mediaUrls.length; i++) {
                let file = (mediaUrls[i][1].gif) ? mediaUrls[i][1].gif : mediaUrls[i][1]; //Get the local gif path or a image url
                let ext = path.parse(file).ext; //Get the extension to post a proper name
                discord.client.sendFile(channel, file, tweet.id + ext, (err, result) => { //Post media element
                    msg_ids.push({channel: result.channel.id, message: result.id}); //Save media message id to list
                    next();
                });
            }
        }

        function getMedia(callback) { //Converts mp4 to gif and compile media url list
            if (mediaUrls.length == 0 && callback) callback();
            let count = 0;

            function next() { //After each media element has been converted
                if (count++ >= mediaUrls.length - 1) {
                    if (callback) callback(); //Done after last conversion
                }
            }

            for (let i = 0; i < mediaUrls.length; i++) {
                switch (mediaUrls[i][0]) { //Get media type
                    case 'photo':
                        next(); //Continue if an Image
                        break;
                    case 'animated_gif': //Convert to gif
                        createTweetDir({url: mediaUrls[i][1], id: tweet.id_str + "-" + i})
                            .then(downloadMP4)
                            .then(saveMP4)
                            .then(createFramesDir)
                            .then(createFrames)
                            .then(createGIF)
                            .then(compressGIF)
                            .then((data) => { //Conversion was successful
                                mediaUrls[i][1] = data;
                                next();
                            }, (err) => { //Conversion failed
                                utils.log(JSON.stringify(err));
                                if (mediaUrls[i][2]) {
                                    mediaUrls[i][1] = mediaUrls[i][2]; //Use backup image url if exists
                                } else {
                                    mediaUrls[i][1] = null;
                                }
                                next();
                            });
                        break;
                }
            }
        }

        //Creates a unique folder with the tweet id for easy cleanup
        function createTweetDir(data) {
            return new Promise((resolve, reject) => {
                let tweetDir = path.join(__dirname, "../temp/" + data.id.split("-")[0]);
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

        //Download MP4 from twitter
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

        //Save MP4 to temp tweet folder
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

        //Create a directory for captured frames
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

        //Use ffmpeg to get images of the movie at intervals and save them to the frames dir
        function createFrames(data) {
            return new Promise((resolve, reject) => {
                let frames = path.join(data.framesDir, "/ffout%03d.png");
                let prefix = process.platform == "win32" ? "ffmpeg" : "/usr/local/bin/ffmpeg";
                let child = exec(prefix + " -i \"" + data.mp4 + "\" -vf scale=250:-1:flags=lanczos,fps=10 \"" + frames + "\"",
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

        //Use GraphicsMagik to convert frames into a gif
        function createGIF(data) {
            return new Promise((resolve, reject) => {
                let frames = data.frames.replace("ffout%03d.png", "ffout*.png");
                let gif = path.join(data.tweetDir, data.id + ".gif");
                let prefix = process.platform == "win32" ? "gm" : "/usr/local/bin/gm";
                let child = exec(prefix + " convert -loop 0 \"" + frames + "\" \"" + gif + "\"",
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

        //Compress the gif to save on upload
        function compressGIF(data) {
            return new Promise((resolve, reject) => {
                resolve(data); //TODO
            });
        }

        //Attempts to remove the temp tweet directory after all messages have been sent
        function removeDir(dirPath) {
            fs.exists(dirPath, (exists) => {
                if (exists) {
                    if (process.platform == "win32") {
                        let child = exec("rmdir \"" + dirPath + "\" /s /q", (err) => {
                            if (err) utils.log("Unable to remove the folder at: " + dirPath);
                        });
                    } else {
                        let child = exec("rm -rf \"" + dirPath + "\"", (err) => {
                            if (err) utils.log("Unable to remove the folder at: " + dirPath);
                        });
                    }
                }
            });
        }
    }

    function getName() {
        return screen_name;
    }

    //A tweet was deleted. Delete all corresponding Discord messages
    function deleteTweet(tweet) {
        mongo.tweetMessages.findOne({tweet_id: tweet.delete.status.id_str}, (err, result) => { //Get the list of messages
            if (!result) return;
            for (let i = 0; i < result.messages.length; i++) {
                let url = "https://discordapp.com/api/channels/" + result.messages[i].channel + "/messages/" + result.messages[i].message;
                request({ //Delete message using the Discord API directly
                    method: "delete",
                    url: url,
                    headers: {
                        Authorization: options.bot_token
                    }
                }, (err, res, body) => {
                    if (err) utils.log(JSON.stringify(err));
                });
            }
        });
    }

    twitterConnect(); //Connect to twitter on startup

    return {
        getName: getName
    }
};
