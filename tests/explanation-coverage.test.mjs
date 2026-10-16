import test from 'node:test';
import assert from 'node:assert/strict';
import {auditExplanationCoverage} from '../scripts/content/explanation-coverage.mjs';
const provenance={kind:'app-authored',license:'CC-BY-4.0',review:'editorial-draft; native-speaker-review-pending'};
const core={targetLanguage:'fr',entries:[{id:'book',word:'livre',level:'A1',partOfSpeech:'noun',example:{text:'Je lis un livre.'},provenance:{source:{entryId:'1',senseId:'1'}}}]};
const pairs={en:{entries:[{id:'book',meaning:'book',exampleTranslation:'I am reading a book.'}]},ko:{entries:[{id:'book',meaning:'책',exampleTranslation:'나는 책을 읽고 있어요.'}]}};
test('coverage separates complete existing packages from unfinished extra explanation languages',()=>{
 const report=auditExplanationCoverage({core,pairs});assert.equal(Object.keys(report.pairs).length,6);assert.equal(report.pairs.fr,undefined);assert.equal(report.pairs.en.fullExampleCoverage,true);assert.equal(report.pairs.ja.packageComplete,false);assert.equal(report.pairs.ja.missingMeanings,1);assert.equal(report.pairs.ja.missingExampleTranslations,1);
});
test('licensed definition candidates are reported but never counted as finished translations',()=>{
 const report=auditExplanationCoverage({core,pairs,sourceSenses:[{id:'1',sense:'1',equivalents:{ja:{definition:'本'}}}]});assert.equal(report.pairs.ja.sourceMeaningCandidates,1);assert.equal(report.pairs.ja.meanings,0);assert.equal(report.pairs.ja.packageComplete,false);assert.equal(report.tasks.find(row=>row.kind==='meaning'&&row.explanationLanguage==='ja').candidate,'本');
});
test('corrections invalidate old sense definitions and examples unless replacements are supplied',()=>{
 const corrections=[{id:'book',word:'livre',meaningEn:'pound',meaningKo:'파운드',reason:'Correct the selected unit sense.',provenance:{license:'CC-BY-SA-4.0'}}];
 const report=auditExplanationCoverage({core,pairs,corrections,sourceSenses:[{id:'1',sense:'1',equivalents:{ja:{definition:'本'}}}]});assert.equal(report.pairs.en.meanings,1);assert.equal(report.primaryExamples,0);assert.equal(report.pairs.en.fullExampleCoverage,false);assert.equal(report.pairs.ja.sourceMeaningCandidates,0);
});
test('new authored sentences cannot inherit translations of the previous sentence',()=>{
 const authored=[{id:'book',text:'Le livre est rouge.',en:'The book is red.',ko:'책이 빨간색이에요.',translations:{ja:'本は赤いです。'},meaningDe:'Buch',provenance}];
 const report=auditExplanationCoverage({core,pairs,authored});assert.equal(report.pairs.de.meanings,1);assert.equal(report.pairs.de.missingExampleTranslations,1);assert.equal(report.pairs.ja.exampleTranslations,1);assert.equal(report.pairs.en.fullExampleCoverage,true);
});
test('English self-explanation is counted and non-English self-explanation is omitted',()=>{
 const report=auditExplanationCoverage({core:{targetLanguage:'en',entries:[{id:'book',word:'book',level:'1.0'}]},pairs:{en:{entries:[{id:'book',meaning:'a written work'}]}}});assert.equal(Object.keys(report.pairs).length,7);assert.equal(report.pairs.en.packageComplete,true);assert.equal(report.pairs.en.fullExampleCoverage,false);
});
test('unknown and duplicate authored records stop the audit',()=>{
 const row={id:'missing',text:'Bonjour.',en:'Hello.',ko:'안녕하세요.',provenance};assert.throws(()=>auditExplanationCoverage({core,pairs,authored:[row]}),/known stable/);assert.throws(()=>auditExplanationCoverage({core,pairs,authored:[{...row,id:'book'},{...row,id:'book'}]}),/Duplicate/);
});
test('new meaning maps count with attribution while explicit corrections override them',()=>{
 const source={kind:'app-authored',license:'CC-BY-4.0',creator:'Learn Language contributors'};
 const row={id:'book',text:'Le livre est rouge.',en:'The book is red.',ko:'책이 빨간색이에요.',provenance,meanings:{ja:'本',en:'unapproved replacement'},meaningProvenance:{ja:source,en:source}};
 let report=auditExplanationCoverage({core,pairs,authored:[row]});assert.equal(report.pairs.ja.meanings,1);
 const edit={id:'book',meaningEn:'pound',meanings:{ja:'ポンド'},reason:'Selected weight sense.',provenance:{license:'CC-BY-SA-4.0'}};
 report=auditExplanationCoverage({core,pairs,authored:[row],corrections:[edit]});assert.equal(report.pairs.ja.meanings,1);assert.equal(report.pairs.ko.meanings,0);
 assert.throws(()=>auditExplanationCoverage({core,pairs,authored:[{...row,meaningProvenance:{}}]}),/meaning licence/);
 assert.throws(()=>auditExplanationCoverage({core,pairs,authored:[{...row,meaningProvenance:{ja:{...source,kind:'licensed-source'}}}]}),/Invalid URL/);
});
