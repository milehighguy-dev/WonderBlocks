import test from 'node:test';
import assert from 'node:assert/strict';
import {foliageCostReport} from '../src/swbf2/swbf2-foliage-cost.js';

const odf=(kind,children=[],extra='')=>`[GameObjectClass]\nClassLabel = "${kind}"\n[Properties]\n${extra}\n${children.map(c=>`AttachOdf = "${c}"`).join('\n')}`;
const fixture=()=>new Map([
 ['odf/tree.odf',odf('prop',['crown','crown','contact'])],
 ['odf/crown.odf',odf('leafpatch',[],'NumParticles = "24"\nMaxDistance = "180"')],
 ['odf/contact.odf',odf('prop')],['msh/tree.msh',new Uint8Array()],
]);

test('render costs count repeated attachments and placements without duplicating resource definitions',()=>{
 const r=foliageCostReport(fixture(),[{name:'tree',label:'Oak',lowDetailTriangles:4},{name:'contact',role:'collision'}],Array.from({length:10},()=>({odf:'tree'})));
 assert.equal(r.definitions.leafClasses,1);
 assert.deepEqual(r.total,{rootPlacements:10,entities:40,leafObjects:20,leafCards:480,collisionHelpers:10,foliageCarriers:0});
 assert.equal(r.perRoot[0].leafObjects,2);assert.equal(r.perRoot[0].modelHasLOD,true);
 assert.equal(r.perRoot[0].foliageFollowsModelLOD,false);
 assert.deepEqual(r.perRoot[0].requestedLeafDistances,[180]);
 assert.equal(r.runtimeVerified,false);assert.equal(r.visibilityEstimated,false);assert.equal(r.foliageDistanceCullingVerified,false);
});

test('source totals exceeding a reference queue trigger review without claiming every placement is visible',()=>{
 const files=fixture(),r=foliageCostReport(files,[{name:'tree'}],Array.from({length:600},()=>({odf:'tree'})),{assetsOnly:true});
 assert.equal(r.basis,'source-layout-only');assert.equal(r.total.leafObjects,1200);
 assert.ok(r.warnings.some(w=>w.includes('not simultaneous visibility')));
 const dense=fixture();dense.set('odf/tree.odf',odf('prop',Array(12).fill('crown')));
 assert.ok(foliageCostReport(dense,[{name:'tree',label:'Dense crown'}],[{odf:'tree'}]).warnings.some(w=>w.includes('12 separate leaf objects')));
});

test('malformed attachment graphs fail instead of undercounting their costs',()=>{
 const files=fixture();files.set('odf/contact.odf',odf('prop',['tree']));
 assert.throws(()=>foliageCostReport(files,[],[{odf:'tree'}]),/cycle/);
 files.delete('odf/contact.odf');assert.throws(()=>foliageCostReport(files,[],[{odf:'tree'}]),/Missing/);
 assert.equal(foliageCostReport(new Map(),[],[{odf:'tree'}],{meshOnly:true}).total.leafObjects,0);
});
