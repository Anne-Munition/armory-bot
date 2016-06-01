'use strict';
module.exports = function (moment) {

    //Formats a UTC timestamp for logging to console
    function log(str) {
        console.log("[" + moment.utc().format('YYYY-MM-DD HH:mm:ss') + "] " + str);
    }

    //Return a random integer, non inclusive
    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min)) + min;
    }

    //Search and return a nested element in an object or null
    function get(obj, key) {
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
