import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
test('local worker preserves context, rejects malformed output and creates a safe Drive snapshot',()=>{
 const result=spawnSync('python3',['-m','unittest','discover','-s','tests','-p','test_local_corpus_worker.py'],{cwd:fileURLToPath(new URL('../',import.meta.url)),encoding:'utf8'});
 assert.equal(result.status,0,result.stdout+'\n'+result.stderr);
});
