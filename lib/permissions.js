'use strict';

module.exports = function () {

    function check(channel_id, cmd, callback) {
        return callback(true);
    }

    function modify(message, query) {
        message.channel.sendMessage("WIP");
    }

    return {
        check: check,
        modify: modify
    }
};
