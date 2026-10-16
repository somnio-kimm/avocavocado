import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {finaliseIos} from '../scripts/finalise-ios.mjs';
async function fixture(t,source) {
  const root=await mkdtemp(join(tmpdir(),'learning-swift-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const folder=join(root,'mobile/ios/App/CapApp-SPM');await mkdir(folder,{recursive:true});
  const file=join(folder,'Package.swift');await writeFile(file,source);return {root,file};
}
test('generated iOS 27 manifests use the required PackageDescription version and remain stable on resync',async t=>{
  const {root,file}=await fixture(t,'// swift-tools-version: 5.9\nplatforms: [.iOS(.v27)]\n');
  await finaliseIos(root);await finaliseIos(root);
  assert.equal(await readFile(file,'utf8'),'// swift-tools-version: 6.4\nplatforms: [.iOS(.v27)]\n');
});
test('unrecognised generated manifests fail without being overwritten',async t=>{
  const {root,file}=await fixture(t,'unexpected content');
  await assert.rejects(finaliseIos(root),/Unexpected/);assert.equal(await readFile(file,'utf8'),'unexpected content');
});
