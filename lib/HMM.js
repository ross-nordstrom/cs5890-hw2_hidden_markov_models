'use strict';

var _ = require('underscore');
var curry = require('curry');
var clc = require('cli-color');
var Table = require('cli-table');

var pos = ['START', 'N', 'V', 'Aux', 'Det', 'Adv', 'Pro', 'Prep', 'Punc', 'END'];
var posLUT = _.object(_.map(pos, function (v, i) {
    return [v, i];
}));

var TAG_START = 'START';
var TAG_END = 'END';
var TAG_TOTAL = '_TOT_';


/******************************************************************************
 * Main functions
 ***/

var tag = curry(function rawTagSentence(outputs, transitions, sent) {
    return sent;
});

function parse(sents) {
    var totalKeyVal = {_TOT_: 0};

    var outputs = _.mapObject(posLUT, function () {
        return totalKeyVal;
    });

    var transitions = _.mapObject(_.extend({}, posLUT, totalKeyVal), function () {
        return _.mapObject(_.extend({}, posLUT, totalKeyVal), _.constant(0));
    });

    _.each(sents, function parseSentence(s) {
        // Ensure we split on punctuation
        s = s.replace(',', ' ,').replace('.', ' .');

        _.reduce(s.split(' ').concat('/' + TAG_END), function parseWordAndTransition(memo, w) {
            if (_.isEmpty(w)) {
                return memo;
            }

            var parts = w.split('/');
            var word = parts[0];
            var tag = parts[1];

            if (_.isUndefined(tag)) {
                tag = TAG_START;
            }

            outputs[tag][word] = (outputs[tag][word] || 0) + 1;
            outputs[tag][TAG_TOTAL]++;

            var fromState = memo.from || TAG_START;
            var toState = tag;
            transitions[fromState][toState]++;
            transitions[fromState][TAG_TOTAL]++;
            transitions[TAG_TOTAL][toState]++;
            transitions[TAG_TOTAL][TAG_TOTAL]++;

            return _.extend(memo, {from: tag});
        }, {});
    });


    return normalize(outputs, transitions);
}


/******************************************************************************
 * Internal functions
 ***/

function stripLabels(sents) {
    return _.map(sents, function stripSentence(s) {
        var newSent = _.map(s.split(' '), function stripWord(w) {
            return w.split('/')[0];
        });
        return newSent.join(' ').replace(' ,', ',').replace(' .', '.').trim();
    });
}

function normalize(outputs, transitions) {

    // Normalize the transitions
    _.each(transitions, function normalizeTransRow(row, fromState) {
        if (fromState === TAG_TOTAL) {
            return;
        }
        _.each(row, function normalizeCell(cell, toState) {
            if (toState === TAG_TOTAL) {
                return;
            }
            row[toState] = cell / row[TAG_TOTAL];
        });
    });

    return {outputs: outputs, transitions: transitions};
}

function printOutputs(outputs) {
    _.each(outputs, function (vals, state) {
        if (state === TAG_START || state === TAG_END) {
            return;
        }
        console.log(state + "\t=> " + JSON.stringify(vals));
    });
}

function printFixedWidth(columns, matrix) {
    var table = new Table({
        head: columns,
        chars: {
            'top': '', 'top-mid': '', 'top-left': '', 'top-right': '',
            'bottom': '', 'bottom-mid': '', 'bottom-left': '', 'bottom-right': '',
            'left': '', 'left-mid': '', 'mid': '', 'mid-mid': '',
            'right': '', 'right-mid': '', 'middle': ' '
        }
    });

    _.each(matrix, function (row) {
        table.push(row);
    });
    console.log(table.toString());
}

function printTransitions(transitions) {
    var header = ['    \\ To\nFrom \\'].concat(_.keys(transitions));
    header.splice(_.size(header) - 1, 0, '');   // Insert a spacer before _TOT_
    header.splice(1, 1);                        // Remove START column

    var table = new Table({head: header});

    _.each(transitions, function insertRow(trans, state) {
        var rowVals = _.values(trans).map(function (x, idx) {
            if (state === TAG_TOTAL || (idx === _.size(trans) - 1)) {
                return x;
            }
            return !x ? '' : x.toFixed(2);
        });
        rowVals.splice(0, 1); // Remove the to-start column

        var row = {};
        row[state] = rowVals;
        rowVals.splice(_.size(rowVals) - 1, 0, ''); // Insert a spacer before _TOT_

        if (state === TAG_TOTAL) {
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
module.exports = function HMM(trainData, testData) {
    var outputs, transitions;
    var expectedData = testData;
    testData = stripLabels(testData);

    var api = {
        parse: function () {
            var res = parse(trainData);
            outputs = res.outputs;
            transitions = res.transitions;

            // Chainable
            return api;
        },
        test: function () {
            console.log(clc.bold.cyan("Analyze Test Dataset"));

            var actualData = testData.map(tag(outputs, transitions)/*(sent)*/);

            console.log('Test dataset:');
            printFixedWidth(
                ['Sentence', 'Expected', 'Actual'],
                _.zip(testData, expectedData, actualData)
            );
            console.log("");

            // Chainable
            return api;
        },
        print: function () {
            console.log(clc.bold.cyan("Trained Dataset"));

            console.log("\nPartitioning:");
            console.log("Train\t=> " + _.size(trainData));
            console.log("Test \t=> " + _.size(testData));

            console.log("\nOutputs:");
            printOutputs(outputs);
            console.log("\nTransitions:");
            printTransitions(transitions);
            console.log("");

            // Chainable
            return api;
        }
    };

    return api;
};
