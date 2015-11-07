var _ = require('underscore');

var pos = ['N', 'V', 'Aux', 'Det', 'Adv', 'Pro', 'Prep', 'Punc'];
var posLUT = _.object(_.map(pos, function(v,i) { return [v,i]; }));

var outputs = _.mapObject(posLUT, _.constant({}));
var transitions = _.map(pos, _.constant([]));
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

