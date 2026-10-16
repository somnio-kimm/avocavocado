import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
test('draft generation cannot use arbitrary network endpoints, change IDs or approve itself',()=>{
 const result=spawnSync('python3',['-c',`
import importlib.util
spec=importlib.util.spec_from_file_location('drafts','scripts/content/run-content-drafts.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
before=m.generation_digest();m.INSTRUCTION+=' Preserve all quantities.';assert m.generation_digest()!=before
assert m.validate_endpoint('http://127.0.0.1:8900/v1')=='http://127.0.0.1:8900/v1/chat/completions'
for url in ['https://paid.example/v1','http://private.example/v1','http://name:secret@localhost/v1']:
 try:m.validate_endpoint(url);raise AssertionError(url)
 except ValueError:pass
import json
task={'id':'book','explanationLanguages':['ko']}
draft={'id':'book','meanings':{'ko':'책'},'examples':[{'text':'A book.','focus':{'text':'book'},'translations':{'ko':'책.'}}],'uncertainties':[],'review':{'status':'checked'}}
response={'choices':[{'finish_reason':'stop','message':{'content':json.dumps(draft)}}]}
assert 'review' not in m.parse_result(response,task)
draft['id']='wrong';response['choices'][0]['message']['content']=json.dumps(draft)
try:m.parse_result(response,task);raise AssertionError('ID changed')
except ValueError:pass
request=m.make_request({'kind':'translation','sourceLanguage':'en','targetLanguage':'fr','studyLanguage':'en','text':'a long seat'},'model');assert 'French' in request['messages'][0]['content'];assert 'studyLanguage' not in request['messages'][1]['content']
response['choices'][0]['finish_reason']='length'
try:m.parse_result(response,task);raise AssertionError('Truncated')
except ValueError:pass
`],{cwd:fileURLToPath(new URL('../',import.meta.url)),encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
});
