'use strict';

module.exports = function (moment) {

    function log(str) { //Formats a UTC timestamp for logging to console
        console.log("[" + moment.utc().format('YYYY-MM-DD HH:mm:ss') + "] " + str);
    }

    function getRandomInt(min, max) { //Return a random integer, non inclusive
        return Math.floor(Math.random() * (max - min)) + min;
    }

    function get(obj, key) { //Search and return a nested element in an object or null
        return key.split(".").reduce(function (o, x) {
            return (typeof o == "undefined" || o === null) ? o : o[x];
        }, obj);
    }

    return {
        log: log,
        getRandomInt: getRandomInt,
        get: get
    }
};
