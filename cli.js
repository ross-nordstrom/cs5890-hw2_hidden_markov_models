#! /usr/bin/env node

'use strict';

var request = require('superagent');
var async = require('async');
var _ = require('underscore');
var clc = require('cli-color');
var fs = require('fs');
var natural = require('natural');

var cliHelper = require('./lib/cliHelper');
var HMM = require('./lib/HMM');

var options = {
    boolean: [
        'help',
        'verbose',
        'quiet'
    ],
    alias: {
        help: ['h'],
        verbose: ['v'],
        in: ['i'],
        ratio: ['r'],
        num: ['n'],
        quiet: ['q']
    },
    default: {
        verbose: false,
        in: './data/full',
        ratio: 0.9,
        num: 10,
        quiet: false
    }
};

var argv = require('minimist')(process.argv.slice(2), options);

if (argv.help) {

    cliHelper.printHelp(argv);
    process.exit(0);

} else {

    // Step 1.
    var dir = argv.in;
    var ratio = argv.ratio;
    var num = argv.num;
    var quiet = argv.quiet;

    var numTags = [];

    var labeledData = cliHelper.fileContent([dir, 'labeled.txt'].join('/')).trim().split('\n');
    //var unlabeledData = cliHelper.fileContent([dir, 'unlabeled.txt'].join('/')).split('\n');

    var sentencePrecisions = [], tagPrecisions = [];
    _.each(_.range(0, num), function () {
        var partitioned = _.partition(_.shuffle(labeledData), cliHelper.inRange(0, ratio * _.size(labeledData)));
        var trainData = partitioned[0];
        var testData = partitioned[1];

        var hmm = HMM(trainData, testData)
            .parse()
            .test();
        if (!quiet) {
            hmm.print();
        }

        sentencePrecisions.push(hmm.getSentencePrecision());
        tagPrecisions.push(hmm.getTagPrecision());
        numTags.push(hmm.getTagCount());
    });

    if (!quiet) {
        console.log("\n-------------------------------------------------------------------\n");
    }
    console.log(clc.bold.cyan("Results from " + num + " iterations of the HMM:"));

    var sentPrecisionHistogram = _.countBy(sentencePrecisions.sort().reverse());
    console.log("\nSentence Precisions (freq by val): " + JSON.stringify(sentPrecisionHistogram, null, 2));
    var sentMean = sentencePrecisions.reduce(add) / num;
    console.log("\nMean: " + clc.cyan(sentMean.toFixed(2)) + "," +
        "  Min: " + clc.red(_.min(sentencePrecisions).toFixed(2)) + "," +
        "  Max: " + clc.green(_.max(sentencePrecisions).toFixed(2)));

    var tagPrecisionHistogram = _.countBy(tagPrecisions.map(round).sort().reverse());
    console.log("\nTag Precisions (freq by val): " + JSON.stringify(tagPrecisionHistogram, null, 2));
    var tagMean = weightedMean(tagPrecisions, numTags);
    console.log("\nMean: " + clc.cyan(tagMean.toFixed(2)) + "," +
        "  Min: " + clc.red(_.min(tagPrecisions).toFixed(2)) + "," +
        "  Max: " + clc.green(_.max(tagPrecisions).toFixed(2)));


    process.exit(1);
}

function add(a, b) {
    return a + b;
}
function mult(arr) {
    return arr.reduce(_mult);
}
function _mult(a, b) {
    return a * b;
}

function round(x) {
    return _round(20, x);

    return x < 0.6 ? _round(10, x) :
        x < 0.9 ? _round(20, x) :
            _round(100, x);
}
function _round(r, x) {
    return Math.round(x * r) / r;
}

function weightedMean(vals, cnts) {
    var weightedNum = _.zip(vals, cnts).map(mult).reduce(add);
    var totalCnt = cnts.reduce(add);

    return weightedNum / totalCnt;
}
