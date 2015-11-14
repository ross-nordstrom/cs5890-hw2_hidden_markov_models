#! /usr/bin/env node

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

    var labeledData = cliHelper.fileContent([dir, 'labeled.txt'].join('/')).trim().split('\n');
    //var unlabeledData = cliHelper.fileContent([dir, 'unlabeled.txt'].join('/')).split('\n');

    var precisions = [];
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

        precisions.push(hmm.getPrecision());
    });

    if (!quiet) {
        console.log("\n-------------------------------------------------------------------\n");
    }
    console.log(clc.bold.cyan("Results from " + num + " iterations of the HMM:"));
    console.log("\nPrecisions (freq by val): " + JSON.stringify(_.countBy(precisions.sort().reverse()), null, 2));
    console.log("\nMean: " + precisions.reduce(add).toFixed(2) +
        ",  Min: " + _.min(precisions).toFixed(2) +
        ",  Max: " + _.max(precisions).toFixed(2));


    process.exit(1);
}

function add(a, b) {
    return a + b;
}
