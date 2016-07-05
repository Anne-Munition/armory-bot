'use strict';
const moment = require('moment');

module.exports = function () {

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
    
    //Find key > value pair in array
    function findInArray(array, key, value) {
        for (let i = 0; i < array.length; i++) {
            if (value === array[i][key]) {
                return i;
            }
        }
        return -1;
    }

    return {
        log: log,
        getRandomInt: getRandomInt,
        get: get,
        findInArray: findInArray
    }
};
