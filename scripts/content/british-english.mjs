// Keep proper names and archived content untouched; normalise unambiguous prose.
export function britishEnglish(text){
 const spellings={color:'colour',colors:'colours',colored:'coloured',colorful:'colourful',colorless:'colourless',coloring:'colouring',favorite:'favourite',favorites:'favourites',neighbor:'neighbour',neighbors:'neighbours',neighborhood:'neighbourhood',center:'centre',centers:'centres',centered:'centred',organize:'organise',organized:'organised',organizing:'organising',organization:'organisation',organizations:'organisations',recognize:'recognise',recognized:'recognised',recognizing:'recognising',analyze:'analyse',analyzed:'analysed',analyzing:'analysing',realize:'realise',realized:'realised',criticize:'criticise',criticized:'criticised',liter:'litre',liters:'litres'};
 return text.replace(/\b[a-z]+\b/g,word=>spellings[word]||word).replace(/\bto practice\b/g,'to practise');
}
