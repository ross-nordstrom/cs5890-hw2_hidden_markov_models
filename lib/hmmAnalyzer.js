'use strict';

var _ = require('underscore');

var pos = [/*start:*/undefined, 'N', 'V', 'Aux', 'Det', 'Adv', 'Pro', 'Prep', 'Punc'];
var posLUT = _.object(_.map(pos, function (v, i) {
    return [v, i];
}));


/******************************************************************************
 * Main functions
 ***/

function analyze()

/******************************************************************************
 * Internal functions
 ***/

function parseSentences(sents) {
    var outputs = _.mapObject(posLUT, _.constant({_total: 0}));
    var transitions = _.map(pos, _.constant([]));

    _.each(sents, function parseSentence(s) {

        _.reduce(s.split(' '), function parseWordAndTransition(memo, w) {
            var parts = w.split('/');
            var word = parts[0];
            var tag = parts[1];

            outputs[tag][word] = (outputs[tag][word] || 0) + 1;
            outputs[tag]._total++;

            var fromIdx = posLUT[memo.from];
            var toIdx = posLUT[tag];
            transitions[fromIdx][toIdx] = (transitions[fromIdx][toIdx] || 0) + 1;

            return _.extend(memo, {from: tag});
        }, {});

    });

    return {outputs: outputs, transitions: transitions};
}

/******************************************************************************
 * Expose functions
 ***/
exports.analyze = analyze;
