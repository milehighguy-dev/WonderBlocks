import test from 'node:test';
import assert from 'node:assert/strict';
import {runProcess} from '../tools/test-process.mjs';

test('test gates fail on nonzero subprocess exit',async()=>{
 await assert.rejects(runProcess(process.execPath,['-e','process.exit(7)'],{stdio:'ignore'}),/exit 7/);
});
test('a blocked subprocess is stopped and cannot leave the test gate hanging',{timeout:15000},async()=>{
 const before=Date.now();
 await assert.rejects(runProcess(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore',timeout:300}),/timed out/);
 assert.ok(Date.now()-before<10000);
});
