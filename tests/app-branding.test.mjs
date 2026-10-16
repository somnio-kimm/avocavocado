import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {APP_NAME} from '../web/js/shared/app-config.js';
import {prepareBugReport} from '../web/js/shared/bug-report.js';
import {collectBugDiagnostics} from '../web/js/shared/bug-diagnostics.js';

test('web and native installation use avocavocado without changing the app identity',async()=>{
 const config=JSON.parse(await readFile(new URL('../mobile/capacitor.config.json',import.meta.url),'utf8'));
 const plist=await readFile(new URL('../mobile/ios/App/App/Info.plist',import.meta.url),'utf8');
 const html=await readFile(new URL('../web/index.html',import.meta.url),'utf8');
 assert.equal(APP_NAME,'avocavocado');assert.equal(config.appName,APP_NAME);
 assert.equal(config.appId,'com.somnio.learnlanguage');
 assert.match(plist,/<key>CFBundleDisplayName<\/key>\s*<string>avocavocado<\/string>/);
 assert.match(html,/<title>avocavocado<\/title>/);
});

test('renamed app reports retain study-language context',async()=>{
 const diagnostics=await collectBugDiagnostics({app:APP_NAME,studyLanguage:'ja',webVersion:'0.1.0'},{});
 assert.match(diagnostics,/App: avocavocado/);assert.match(diagnostics,/Study language: ja/);
 const url=new URL(prepareBugReport({app:APP_NAME,diagnostics}).url);
 assert.equal(url.searchParams.get('entry.1656822590'),diagnostics);
});
