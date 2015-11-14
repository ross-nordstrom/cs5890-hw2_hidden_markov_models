#! /usr/bin/env node

var request = require('superagent');
var async = require('async');
var _ = require('underscore');
var fs = require('fs');
var natural = require('natural');

var cliHelper = require('./lib/cliHelper');
var HMM = require('./lib/HMM');

var options = {
    boolean: [
        'help',
        'verbose'
    ],
    alias: {
        help: ['h'],
        verbose: ['v'],
        in: ['i'],
        ratio: ['r']
    },
    default: {
        verbose: false,
        in: './data/full',
        ratio: 1.0
    }
};

var argv = require('minimist')(process.argv.slice(2), options);

if (argv.help) {

    cliHelper.printHelp(argv);
    process.exit(0);

} else {

    // Step 1.
    var dir = argv.in;
    var ratio = argv.ratio || 1.0;

    var labeledData = cliHelper.fileContent([dir, 'labeled.txt'].join('/')).split('\n');
    //var unlabeledData = cliHelper.fileContent([dir, 'unlabeled.txt'].join('/')).split('\n');

    var partitioned = _.partition(_.shuffle(labeledData), cliHelper.inRange(0, ratio * _.size(labeledData)));
    labeledData = partitioned[0];
    var unlabeledData = partitioned[1];

    HMM(unlabeledData, labeledData)
        .parse()
        .analyze()
        .print();

    process.exit(1);
}
