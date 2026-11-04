import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {TEMP_BASE_PARTS} from '../src/flora/temp-bases.js';

const root=fileURLToPath(new URL('../',import.meta.url));
function inspect(args){
 const output=mkdtempSync(path.join(tmpdir(),'flora-review-'));
 const run=spawnSync(process.execPath,['tools/render-flora-review.mjs',...args,'--size=128','--ss=1','--out='+output],{cwd:root,encoding:'utf8',timeout:30000});
 assert.equal(run.status,0,run.stderr||run.stdout);
 return {output,reports:JSON.parse(readFileSync(path.join(output,'metrics.json'),'utf8'))};
}

test('current leaf inspection renders distinct views in a single row',()=>{
 const {output,reports}=inspect(['--ids=flora-horned-leaf','--mode=clay','--views=quarter,front,side,top,below']);
 assert.equal(reports.length,1);assert.equal(reports[0].id,'flora-horned-leaf');assert.equal(reports[0].inspection,'current');assert.ok(reports[0].currentDimensions.every(v=>v>0));assert.ok(reports[0].currentTriangles>0);
 const sheet=readFileSync(path.join(output,'flora-horned-leaf-clay.png'));assert.equal(sheet.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(sheet.readUInt32BE(16),640);assert.equal(sheet.readUInt32BE(20),192);
 const folder=path.join(output,'flora-horned-leaf'),files=readdirSync(folder);assert.equal(files.length,5);assert.ok(files.every(name=>name.includes('-current-')));
 assert.notDeepEqual(readFileSync(path.join(folder,'clay-current-front.png')),readFileSync(path.join(folder,'clay-current-side.png')));
});

test('leaf collection selects canonical parts and shows their materials',()=>{
 const {output,reports}=inspect(['--collection=leaves','--ids=flora-coral-leaf,flora-coin-leaf','--mode=both','--views=front,side']);
 assert.deepEqual(reports.map(part=>part.id),['flora-coral-leaf','flora-coin-leaf']);
 const folder=path.join(output,'flora-coral-leaf');assert.equal(readdirSync(folder).length,4);
 assert.notDeepEqual(readFileSync(path.join(folder,'clay-current-front.png')),readFileSync(path.join(folder,'textured-current-front.png')));
 assert.match(readFileSync(path.join(output,'index.html'),'utf8'),/Current leaf geometry/);
});

test('branch collection renders current canonical geometry and bark material',()=>{
 const {output,reports}=inspect(['--collection=branches','--ids=flora-thorn-branch','--mode=both','--views=front,side']);
 assert.equal(reports.length,1);assert.equal(reports[0].id,'flora-thorn-branch');assert.equal(reports[0].inspection,'current');assert.ok(reports[0].currentTriangles>0);assert.ok(reports[0].currentDimensions.every(v=>v>0));
 const folder=path.join(output,'flora-thorn-branch');assert.equal(readdirSync(folder).length,4);assert.notDeepEqual(readFileSync(path.join(folder,'clay-current-front.png')),readFileSync(path.join(folder,'textured-current-front.png')));
 const sheet=readFileSync(path.join(output,'flora-thorn-branch-clay.png'));assert.equal(sheet.readUInt32BE(16),256);assert.equal(sheet.readUInt32BE(20),192);assert.match(readFileSync(path.join(output,'index.html'),'utf8'),/Current branch geometry/);
});

test('temporary base collection renders every neutral body with its complete joint count',()=>{
 const {output,reports}=inspect(['--collection=bases','--mode=clay','--views=front,side,top']);
 assert.equal(reports.length,6);assert.deepEqual(reports.map(part=>part.id),TEMP_BASE_PARTS.map(part=>part.id));
 for(const report of reports){const part=TEMP_BASE_PARTS.find(part=>part.id===report.id);assert.equal(report.joints,part.skeleton.length);assert.equal(report.currentTriangles,part.meshes.reduce((count,mesh)=>count+mesh.indices.length/3,0));assert.ok(report.currentDimensions.every(value=>value>0));const sheet=readFileSync(path.join(output,part.id+'-clay.png'));assert.equal(sheet.readUInt32BE(16),384);assert.equal(sheet.readUInt32BE(20),192);assert.equal(readdirSync(path.join(output,part.id)).length,3);}
 const overview=readFileSync(path.join(output,'overview.png'));assert.equal(overview.readUInt32BE(16),384);assert.equal(overview.readUInt32BE(20),370);
 assert.match(readFileSync(path.join(output,'index.html'),'utf8'),/Temp base geometry/);
});
