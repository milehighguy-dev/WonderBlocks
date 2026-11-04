import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import * as T from '../vendor/three.module.js';
import {BARK_BRANCH_PARTS} from '../src/flora/bark-branches.js';
import {BF2_FLORA_FORMS} from '../src/flora/data/bf2-flora-forms.js';
import {PROCEDURAL_FLORA,FLORA_ASSETS,FLORA_PALETTE_ASSETS,floraAsset,floraPaletteCategory,floraPlacementCategory,createFloraPalette} from '../src/flora/flora-palette.js';
import {defaultFlora,addFloraAsset,floraDeformPositions,floraOrganMatrix,floraAttachmentFrame,floraOrganPosition,replaceFloraAsset,validateFlora} from '../src/flora/flora.js';
import {makePart,validateProject} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {exportOBJ} from '../src/export/export.js';
import {testStem} from './flora-fixtures.js';

function bounds(m){const box=new T.Box3();for(let i=0;i<m.positions.length;i+=3)box.expandByPoint(new T.Vector3().fromArray(m.positions,i));return box;}
function checkSurface(m,name){
 assert.equal(m.positions.length%3,0);assert.equal(m.indices.length%3,0);assert.equal(m.uv.length,m.positions.length/3*2);
 assert.ok(m.positions.every(Number.isFinite)&&m.uv.every(Number.isFinite),name+' finite surface');
 const count=m.positions.length/3,edges=new Map(),keys=Array.from({length:count},(_,i)=>m.positions.slice(i*3,i*3+3).map(x=>Math.round(x*1e6)).join(','));let volume=0;
 for(let i=0;i<m.indices.length;i+=3){
  const ids=m.indices.slice(i,i+3);assert.ok(ids.every(i=>Number.isInteger(i)&&i>=0&&i<count));
  const [a,b,c]=ids.map(i=>new T.Vector3().fromArray(m.positions,i*3));
  assert.ok(b.clone().sub(a).cross(c.clone().sub(a)).lengthSq()>1e-18,name+' nonzero triangle');volume+=a.dot(b.clone().cross(c))/6;
  for(let k=0;k<3;k++){const a=keys[ids[k]],b=keys[ids[(k+1)%3]],key=[a,b].sort().join('|'),edge=edges.get(key)||[0,0];edge[0]++;edge[1]+=a<b?1:-1;edges.set(key,edge);}
 }
 assert.ok([...edges.values()].every(([count,direction])=>count===2&&direction===0),name+' closed consistently wound surface');assert.ok(volume>0,name+' outward normals');
 assert.ok(keys.includes('0,0,0'),name+' fixed attachment origin');
}
test('approved authored branches replace the five canonical catalogue entries without temp duplicates',()=>{
 const ids=['flora-tapered-twig','flora-bent-twig','flora-thorn-branch','flora-segmented-branch','flora-slender-twig'];
 assert.equal(BARK_BRANCH_PARTS.length,5);
 assert.deepEqual(BARK_BRANCH_PARTS.map(a=>a.id).sort(),[...ids].sort());
 assert.equal(new Set(FLORA_ASSETS.map(a=>a.id)).size,FLORA_ASSETS.length,'each flora ID is registered once');
 for(const file of ['bark-branches','twig-shapes','branch-accents'])assert.doesNotMatch(readFileSync(new URL('../src/flora/'+file+'.js',import.meta.url),'utf8'),/from\s*['"][^'"]*(?:data\/|procedural-flora)/);
 for(const a of BARK_BRANCH_PARTS){
  assert.equal(floraAsset(a.id),a);assert.equal(PROCEDURAL_FLORA.find(p=>p.id===a.id),a,'catalogue uses approved geometry directly');
  assert.equal(FLORA_ASSETS.filter(p=>p.id===a.id).length,1);assert.equal(FLORA_PALETTE_ASSETS.filter(p=>p.id===a.id).length,1);
  assert.equal(floraPaletteCategory(a),'Branches');assert.equal(floraPlacementCategory(a),'Surface parts');
  assert.ok(existsSync(new URL(a.iconUrl)));assert.ok(a.iconUrl.endsWith('/assets/procedural-flora/'+a.id+'.png'),'canonical preview replaces the source thumbnail');
  assert.match(a.source,/authored|independent/i);assert.doesNotMatch(a.source,/reference-derived/i);
  assert.ok(!Object.hasOwn(BF2_FLORA_FORMS,a.id),'retired reference vertex data is removed');
 }
 assert.ok(!FLORA_ASSETS.some(a=>a.id.startsWith('temp-branch-')),'temporary branch aliases are not registered');
 assert.ok(FLORA_PALETTE_ASSETS.filter(a=>floraPaletteCategory(a)==='temp').every(a=>!ids.includes(a.id)),'approved branches leave the review section');
});

test('branch defaults and all combined morph extremes keep closed solid geometry and stable triangle pins',()=>{
 for(const a of BARK_BRANCH_PARTS){
  const neutral=a.meshes[0],size=bounds(neutral).getSize(new T.Vector3());assert.ok(neutral.indices.length/3<=1400,a.name+' limited mesh cost');assert.ok(size.y>1.3&&size.y>size.x*3&&size.z>.08,a.name+' woody three-dimensional proportions');
  checkSurface(neutral,a.name);
  for(let mask=0;mask<8;mask++){const morphs={width:mask&1?1:0,length:mask&2?1:0,bend:mask&4?1:0},m=a.shapeMesh(morphs);checkSurface(m,a.name+' '+mask);assert.deepEqual(m.indices,neutral.indices);assert.equal(m.positions.length,neutral.positions.length);}
  assert.deepEqual(a.shapeMesh({width:.5,length:.5,bend:.5}).positions,neutral.positions);
  assert.ok(bounds(a.shapeMesh({length:1})).getSize(new T.Vector3()).y>bounds(a.shapeMesh({length:0})).getSize(new T.Vector3()).y*1.2,a.name+' length control changes growth');
 }
});
test('original bark atlas has readable grain, independent endgrain, shared cache and no transparency',()=>{
 for(const a of BARK_BRANCH_PARTS){const map=a.textureMap(),im=map.image;assert.equal(map,a.textureMap());assert.equal(im.width,256);assert.equal(im.height,256);let min=255,max=0;
  for(let y=0;y<256;y++)for(let x=0;x<192;x++){const i=(y*256+x)*4;min=Math.min(min,im.data[i]);max=Math.max(max,im.data[i]);assert.equal(im.data[i+3],255);}
  assert.ok(max-min>70,'grain remains visible under bark tint');assert.notEqual(im.data[(128*256+224)*4],im.data[(128*256+100)*4],'endgrain is authored separately');assert.equal(a.alphaMap(),null);
 }
});
test('mounted branch anchors and leaves on them follow host and shape edits through save and export',()=>{
 for(const a of BARK_BRANCH_PARTS){
  const f=testStem(),b=f.branches[0],twig=addFloraAsset(f,b.id,a.id,.6,.2,{branch:b.id,at:.6,branchSurface:{angle:.7}});twig.depth=.025;twig.rotation=[.2,.4,-.15];twig.scale=[1.2,.8,1.3];
  const verifyOrigin=()=>{const expected=new T.Vector3().setFromMatrixPosition(floraAttachmentFrame(f,twig)),actual=new T.Vector3().applyMatrix4(floraOrganMatrix(f,twig));assert.ok(actual.distanceTo(expected)<1e-7);};verifyOrigin();
  const m=a.meshes[0],triangle=Math.floor(m.indices.length/6/3),pin={mesh:0,triangle,bary:[.2,.3,.5]},leaf=addFloraAsset(f,b.id,'flora-willow-leaf',0,0,{organ:twig.id,surface:pin}),prior=floraOrganPosition(f,leaf);
  twig.morphs={width:.75,length:.85,bend:.9};b.points.at(-1)[0]+=.7;verifyOrigin();assert.ok(floraOrganPosition(f,leaf).distanceTo(prior)>.01);
  const positions=floraDeformPositions(twig,m.positions),point=new T.Vector3();for(let j=0;j<3;j++)point.addScaledVector(new T.Vector3().fromArray(positions,m.indices[triangle*3+j]*3),pin.bary[j]);point.applyMatrix4(floraOrganMatrix(f,twig));assert.ok(point.distanceTo(floraOrganPosition(f,leaf))<1e-6,'leaf starts at the deformed twig surface');
  validateFlora(f);const p=makePart('flora',{flora:f}),project={format:'open-building-studio',version:1,name:'Mounted twig fixture',parts:[p]},saved=validateProject(JSON.parse(JSON.stringify(project)));assert.deepEqual(saved,project);
  const g=buildPart(saved.parts[0],{collision:false,floraEditing:true});try{const twigGroup=g.children.find(x=>x.userData.floraOrgan===twig.id);assert.ok(twigGroup);let n=0;twigGroup.traverse(x=>{if(x.isMesh){n+=x.geometry.index.count/3;const actual=[...x.geometry.attributes.uv.array],expected=a.shapeMesh(twig.morphs).uv;assert.equal(actual.length,expected.length);assert.ok(actual.every((v,i)=>Math.abs(v-expected[i])<1e-5),'editor uses the deformed bark coordinates');}});assert.equal(n,m.indices.length/3,'SWBF2 detail preserves the complete surface twig');}finally{disposePart(g);}
  const baked=buildPart(saved.parts[0],{collision:false,batch:true});try{assert.ok(!/NaN|Infinity/.test(exportOBJ(baked)));}finally{disposePart(baked);}
 }
});
test('approved branches appear once in Branches and projects use their familiar canonical IDs',()=>{
 class El{constructor(tag){this.tag=tag;this.children=[];this.attrs={};}append(...e){this.children.push(...e);}replaceChildren(...e){this.children=e;}setAttribute(k,v){this.attrs[k]=v;}}
 const old=globalThis.document;globalThis.document={createElement:tag=>new El(tag)};
 try{const panel=createFloraPalette(()=>{},{initialCategory:'Branches'}),all=e=>[e,...e.children.flatMap(all)],cards=all(panel).filter(e=>BARK_BRANCH_PARTS.some(a=>e.attrs['data-flora-part']===a.id));assert.equal(cards.length,5);assert.equal(new Set(cards.map(c=>c.attrs['data-flora-part'])).size,5);for(const c of cards){assert.equal(c.attrs['data-flora-placement'],'Surface parts');assert.equal(c.attrs['data-flora-category'],'Branches');}}finally{globalThis.document=old;}
 const f=defaultFlora(),o=addFloraAsset(f,f.branches[0].id,'flora-bent-twig');assert.equal(o.asset,'flora-bent-twig');replaceFloraAsset(f,o.id,'flora-tapered-twig');assert.equal(o.asset,'flora-tapered-twig');validateFlora(f);
});
