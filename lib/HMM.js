'use strict';

var _ = require('underscore');
var curry = require('curry');
var clc = require('cli-color');
var strDiff = require('diff');
var Table = require('cli-table');

var TAG_START = '_START_';
var TAG_END = '_END_';
var TAG_TOTAL = '_TOT_';
var TAG_SMOOTHED = '_SMOOTH_';

var pos = [TAG_START, 'N', 'V', 'Aux', 'Det', 'Adv', 'Pro', 'Prep', 'Punc', TAG_END];
var posLUT = _.object(_.map(pos, function (v, i) {
    return [v, i];
}));


/******************************************************************************
 * Main functions
 ***/

var tag = curry(function rawTagSentence(outputs, transitions, sent) {

    //
    // Calculate the likelihood of a provided transition, based on a hypothetical output
    //
    var calcProb = _.memoize(calc, function hashFunc(word, fromTag, toTag) {
        var hash = [
            fromTag,
            [toTag, word].join('/')
        ].join(' > ');
        return hash;
    });

    //
    // Tag the sentence using the Viterbi algorithm, defined below:
    // The most likely sequence of tags is simply found by iterating over the words in the sentence,
    // and building up the most likely sequence as the accumulation each most likely tag over the preceding words.
    //
    // In other words, we find the most likely tag sequence by iterating over the sentence
    //      and selecting the most likely tag at each location.
    //      Continue under the assumption we selected the correct tag
    //
    var words = splitSentence(sent);
    var taggingInfo = _.reduce(words, function tagWord(memo, word, position) {
        var trans = transitions[memo.fromTag];
        var nextCandidates = _.chain(trans).omit(TAG_TOTAL).pick(_.identity).keys().value();

        var toTag = _.max(nextCandidates, _.partial(calc, word, memo.fromTag)/*(toTagCandidate)*/);
        if (!_.isString(toTag)) {
            toTag = memo.fromTag;
        }

        //memo.prob += Math.log(calcProb(word, memo.fromTag, toTag));
        memo.prob *= calcProb(word, memo.fromTag, toTag);
        memo.tags.push(toTag);
        memo.fromTag = toTag;

        return memo;
    }, {prob: 1, tags: [], fromTag: TAG_START});
    var tags = taggingInfo.tags;

    var taggedWords = _.chain(words).zip(tags).invoke('join', '/').value();
    return taggedWords.join(' ');

    //
    // Helper funcs
    //
    function calc(word, fromTag, toTag) {
        var transitionProb = transitions[fromTag][toTag];
        var toTagProb = outputs[toTag][word] || outputs[toTag][TAG_SMOOTHED];

        return transitionProb * toTagProb;
    }
});

function parse(sents) {
    var totalKeyVal = {_TOT_: 0};

    var outputs = _.mapObject(posLUT, function () {
        return _.clone(totalKeyVal);
    });

    var transitions = _.mapObject(_.extend({}, posLUT, totalKeyVal), function () {
        return _.mapObject(_.extend({}, posLUT, totalKeyVal), _.constant(0));
    });

    _.each(sents, function parseSentence(s) {
        // Ensure we split on punctuation
        var words = splitSentence(s);

        _.reduce(s.split(' ').concat(TAG_END + '/' + TAG_END), function parseWordAndTransition(memo, w) {
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

function smooth(outputs) {
    var smoothedOutputs = _.mapObject(outputs, function smoothWordOutputs(wordProbs) {
        if (wordProbs[TAG_TOTAL] <= 0) {
            return wordProbs; // Skip
        }

        wordProbs[TAG_SMOOTHED] = 0.001 / (1 + wordProbs[TAG_TOTAL]);
        return wordProbs;
    });

    return smoothedOutputs;
}

function splitSentence(sentence) {
    return sentence.replace(',', ' ,').replace('.', ' .').trim().split(' ');
}

function joinSentence(words) {
    return words.join(' ').replace(' ,', ',').replace(' .', '.').trim();
}

function stripLabels(sents) {
    return _.map(sents, function stripSentence(s) {
        var newSent = _.map(s.split(' '), function stripWord(w) {
            return w.split('/')[0];
        });
        return joinSentence(newSent);
    });
}

function normalize(outputs, transitions) {
    // Convert output counts to probabilities
    _.each(outputs, function normalizeOutputRow(wordCounts) {
        var totalCount = wordCounts[TAG_TOTAL];

        _.each(wordCounts, function normalizeWord(count, word) {
            if (word === TAG_TOTAL) {
                return;
            }
            wordCounts[word] = count / totalCount;
        });
    });

    // Convert transitions counts to probabilities
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
    _.each(outputs, function (wordProbs, state) {
        if (state === TAG_START || state === TAG_END) {
            return;
        }

        var vals = _.mapObject(wordProbs, function (x) {
            return x.toFixed(2);
        });
        console.log(state + "\t=> " + JSON.stringify(vals));
    });
}

function printFixedWidth(columns, matrix) {
    var table = new Table({
        head: columns.map(_.compose(clc.blue, _.identity)),
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
    var columns = ['    \\ To\nFrom \\'].concat(_.keys(transitions));
    columns.splice(_.size(columns) - 1, 0, '');   // Insert a spacer before _TOT_
    columns.splice(1, 1);                        // Remove START column

    var table = new Table({head: columns.map(_.compose(clc.blue, _.identity))});

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

function diff(expected, actual) {
    var wordDiff = strDiff.diffWords(expected, actual);

    return _.map(wordDiff, function prettyDiff(diffInfo) {
        if (diffInfo.added) {
            return clc.red(diffInfo.value);
        }
        if (diffInfo.removed) {
            return clc.green('(' + diffInfo.value + ')');
        }
        return diffInfo.value;
    }).join('');
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
    var actualData, testResults, smoothedOutputs;

    var api = {
        parse: function () {
            var res = parse(trainData);
            outputs = res.outputs;
            transitions = res.transitions;

            // Chainable
            return api;
        },
        test: function () {
            smoothedOutputs = smoothedOutputs || smooth(outputs);
            actualData = testData.map(tag(smoothedOutputs, transitions)/*(sent)*/);

            testResults = _.map(actualData, function checkResult(actual, idx) {
                var expected = expectedData[idx];
                return (expected === actual) ? clc.green('✓') : clc.red.bold('X');
            });

            // Chainable
            return api;
        },
        printTrain: function () {
            console.log(clc.bold.cyan("Trained HMM"));

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
        },
        printTest: function () {
            console.log(clc.bold.cyan("Test HMM"));

            console.log('\nTest dataset:');
            var diffResults = _.map(expectedData, function (e, idx) {
                return diff(e, actualData[idx]);
            });
            printFixedWidth(
                ['', 'Sentence', 'Tagged (' + clc.green('expected') + ", " + clc.red('actual') + ')'],
                _.zip(testResults, testData, diffResults)
            );

            console.log("");

            // Chainable
            return api;
        },
        print: function () {
            return api
                .printTrain()
                .printTest();
        }
    };

    return api;
};
