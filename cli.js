#! /usr/bin/env node

var request = require('superagent');
var async = require('async');
var _ = require('underscore');
var fs = require('fs');
var cliHelper = require('./lib/cliHelper');
var natural = require('natural');

var options = {
    boolean: [
        'help',
        'verbose'
    ],
    alias: {
        help: ['h'],
        verbose: ['v'],
        in: ['i'],
        cache: ['c'],
        extension: ['e'],
        kGrams: ['k']
    },
    default: {
        in: './data',
        cache: './cache',
        extension: 'txt',
        kGrams: 10,
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
    var cache = argv.cache;
    var extensions = !argv.extension ? null : argv.extension.split(',').map(function prefixDot(s) {
        return '.' + s;
    });
    var kGrams = argv.kGrams;

    // TODO: Code here...

    process.exit(1);

}
