var _ = require('underscore');

var pos = [/*start:*/undefined, 'N', 'V', 'Aux', 'Det', 'Adv', 'Pro', 'Prep', 'Punc'];
var posLUT = _.object(_.map(pos, function (v, i) {
    return [v, i];
}));

var sents = [
    'Boy/N meets/V girl/N ./Punc',
    'Boy/N runs/V ./Punc',
    'Girl/N runs/V ./Punc',
    'Time/N flies/V ./Punc',
    'Time/N flies/V like/Adv an/Det arrow/N ./Punc',
    'Boy/N is/Aux running/V ./Punc',
    'Run/V ./Punc',
    'Run/V ,/Punc boy/N ./Punc',
    'Boys/N can/Aux run/V ./Punc',
    'Boys/N will/Aux eat/V ./Punc',
    'Boy/N saw/V girl/N duck/V ./Punc',
    'Boy/N can/Aux eat/V from/Prep can/N ./Punc'
];

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

            fromIdx = posLUT[memo.from];
            toIdx = posLUT[tag];
            transitions[fromIdx][toIdx] = (transitions[fromIdx][toIdx] || 0) + 1;

            return _.extend(memo, {from: tag});
        }, {});

    });

    return {outputs: outputs, transitions: transitions};
}
