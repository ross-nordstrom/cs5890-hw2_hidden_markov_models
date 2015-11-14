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
        in: ['i']
    },
    default: {
        in: './data/sample',
        verbose: false
    }
};

var argv = require('minimist')(process.argv.slice(2), options);

if (argv.help) {

    cliHelper.printHelp(argv);
    process.exit(0);

} else {

    // Step 1.
    var dir = argv.in;

    var unlabeledData = cliHelper.fileContent([dir, 'unlabeled.txt'].join('/')).split('\n');
    var labeledData = cliHelper.fileContent([dir, 'labeled.txt'].join('/')).split('\n');

    var hmm = HMM(unlabeledData, labeledData);
    hmm.parse();
    hmm.print();

    process.exit(1);
}
