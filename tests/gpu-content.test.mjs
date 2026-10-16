import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

test('GPU content checker rejects malformed drafts and keeps semantic flags separate from approval',()=>{
 const result=spawnSync('python3',['tests/test_gpu_content.py'],{
  cwd:fileURLToPath(new URL('../',import.meta.url)),encoding:'utf8',timeout:30000,
 });
 assert.equal(result.status,0,result.stderr||result.error?.message||result.stdout);
});
