import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

test('full-corpus GPU queue preserves evidence and resumes safely',()=>{
 const result=spawnSync('python3',[fileURLToPath(new URL('./test_gpu_job_queue.py',import.meta.url))],{encoding:'utf8'});
 assert.equal(result.status,0,result.stdout+'\n'+result.stderr);
});
