'use strict';

var _ = require('underscore');
var Table = require('cli-table');

var pos = ['START', 'N', 'V', 'Aux', 'Det', 'Adv', 'Pro', 'Prep', 'Punc', 'END'];
var posLUT = _.object(_.map(pos, function (v, i) {
    return [v, i];
}));

/******************************************************************************
 * Main functions
 ***/


function analyze() {
    throw new Error('not implemented');
}

function parse(sents) {
    var outputs = _.mapObject(posLUT, function () {
        return {_total: 0};
    });
    var transitions = _.mapObject(_.extend({}, posLUT, {_TOT_: null}), function () {
        return _.mapObject(_.extend({}, posLUT, {_TOT_: null}), _.constant(0));
    });

    _.each(sents, function parseSentence(s) {
        // Ensure we split on punctuation
        s = s.replace(',', ' ,').replace('.', ' .');

        _.reduce(s.split(' ').concat('/END'), function parseWordAndTransition(memo, w) {
            if (_.isEmpty(w)) {
                return memo;
            }

            var parts = w.split('/');
            var word = parts[0];
            var tag = parts[1];

            if (_.isUndefined(tag)) {
                tag = 'START';
            }

            outputs[tag][word] = (outputs[tag][word] || 0) + 1;
            outputs[tag]._total++;

            var fromState = memo.from || 'START';
            var toState = tag;
            transitions[fromState][toState]++;
            transitions[fromState]._TOT_++;
            transitions._TOT_[toState]++;

            return _.extend(memo, {from: tag});
        }, {});
    });

    return {outputs: outputs, transitions: transitions};
}

/******************************************************************************
 * Internal functions
 ***/
function printOutputs(outputs) {
    _.each(outputs, function (vals, state) {
        if (state === 'START' || state === 'END') {
            return;
        }
        console.log(state + "\t=> " + JSON.stringify(vals));
    });
}

function printTransitions(transitions) {
    var header = ['    \\ To\nFrom \\'].concat(_.keys(transitions));
    header.splice(_.size(header) - 1, 0, '');   // Insert a spacer before _TOT_
    header.splice(1, 1);                        // Remove START column

    var table = new Table({head: header});

    _.each(transitions, function insertRow(trans, state) {
        var rowVals = _.values(trans);
        rowVals.splice(0, 1); // Remove the to-start column

        var row = {};
        row[state] = rowVals;
        rowVals.splice(_.size(rowVals) - 1, 0, ''); // Insert a spacer before _TOT_

        if (state === "_TOT_") {
            table.push({'': []});
        }
        table.push(row);
    });

    console.log(table.toString());
}

function sum(arr) {
    return (!_.isArray(arr) || _.isEmpty(arr)) ? 0 : arr.reduce(function (a, b) {
        return (a || 0) + (b || 0);
    });
}

/******************************************************************************
 * Expose functions
 ***/


/**
 * Initializer
 * @param unlabeled
 * @param labeled
 * @return {{parse: Function}}
 * @constructor
 */
module.exports = function HMM(unlabeled, labeled) {
    var outputs, transitions;

    return {
        parse: function () {
            var res = parse(labeled);
            outputs = res.outputs;
            transitions = res.transitions;

            return res;
        },
        print: function () {
            console.log("\nOutputs:");
            printOutputs(outputs);
            console.log("\nTransitions:");
            printTransitions(transitions);
        }
    };
};
