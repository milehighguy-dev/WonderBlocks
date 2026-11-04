import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import * as T from '../vendor/three.module.js';
import {chunk,writeMSH,closedShadow,crc32,zipFiles,writeTGA} from '../src/swbf2/swbf2-binary.js';
import {meshSegments,fitBox,boxSurface,shadowFromPrimitives,collisionCarrier,needsCollisionCarrier} from '../src/swbf2/swbf2-geometry.js';
export function readChunks(bytes,start=0,end=bytes.length){const result=[];for(let offset=start;offset<end;){const view=new DataView(bytes.buffer,bytes.byteOffset+offset),tag=new TextDecoder().decode(bytes.subarray(offset,offset+4)),size=view.getUint32(4,true);assert.equal(size%4,0);assert.ok(offset+8+size<=end);result.push({tag,start:offset+8,end:offset+8+size,bytes:bytes.subarray(offset+8,offset+8+size)});offset+=8+size;}return result;}
test('collision carriers cover rotated collider bounds without changing collision models',()=>{
 const q=new T.Quaternion().setFromEuler(new T.Euler(.3,.7,.2)).toArray(),models=[{name:'root'},{name:'p_-svb-block',hidden:true,position:[4,6,-8],rotation:q,primitive:{shape:4,dimensions:[3,.2,2]}}],before=JSON.stringify(models),carrier=collisionCarrier(models,5),s=carrier.segments[0],bounds=new T.Box3().setFromPoints(s.positions.map(p=>new T.Vector3(...p)));
 assert.equal(JSON.stringify(models),before);assert.equal(carrier.hidden,undefined);assert.ok(!carrier.name.startsWith('collision'));assert.equal(s.material,5);assert.equal(s.triangles.length,2);
 for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])assert.ok(bounds.clone().expandByScalar(1e-8).containsPoint(new T.Vector3(3*x,.2*y,2*z).applyQuaternion(new T.Quaternion(...q)).add(new T.Vector3(4,6,-8))));
 for(const t of s.triangles){const [a,b,c]=t.map(i=>new T.Vector3(...s.positions[i]));assert.ok(b.sub(a).cross(c.sub(a)).length()>1e-8);}
});
test('scene bounds include collision extending outside the rendered surface',()=>{
 const bytes=writeMSH({name:'bounds',materials:[{name:'plain'}],models:[{name:'root'},{name:'visible',segments:[{positions:[[0,0,0],[1,0,0],[0,1,0]],normals:[[0,0,1],[0,0,1],[0,0,1]],uvs:[[0,0],[1,0],[0,1]],triangles:[[0,1,2]],material:0}]},{name:'p_-svbo-1',hidden:true,position:[20,3,0],primitive:{shape:4,dimensions:[2,1,3]}}]});
 const children=c=>readChunks(bytes,c.start,c.end),msh=children(readChunks(bytes)[0]).find(c=>c.tag==='MSH2'),scene=children(msh).find(c=>c.tag==='SINF'),bbox=children(scene).find(c=>c.tag==='BBOX'),view=new DataView(bbox.bytes.buffer,bbox.bytes.byteOffset),center=[0,1,2].map(i=>view.getFloat32(16+4*i,true)),half=[0,1,2].map(i=>view.getFloat32(28+4*i,true));assert.ok(center[0]+half[0]>=22);assert.ok(center[1]+half[1]>=4);assert.ok(center[2]-half[2]<=-3);
});

test('bounds carriers are needed when native rendering cannot cover the physical extent',()=>{
 const p={shape:4,dimensions:[1,1,1],position:[0,0,0],rotation:[0,0,0,1]},render={name:'visible',segments:[{...boxSurface(p),normals:[],uvs:[]}]},physical={name:'p_-svbo-1',hidden:true,primitive:p,position:[0,0,0]};assert.equal(needsCollisionCarrier([render,physical]),false);physical.position=[5,0,0];assert.equal(needsCollisionCarrier([render,physical]),true);const carrier=collisionCarrier([render,physical],1);assert.equal(needsCollisionCarrier([render,physical,carrier]),false);assert.equal(needsCollisionCarrier([physical]),true);
});
test('MSH writes bounded static geometry, primitive categories and closed half-edge shadows',()=>{
 const mesh=new T.Mesh(new T.BoxGeometry(4,2,3),new T.MeshStandardMaterial()),frame=new T.Matrix4();mesh.updateMatrixWorld();const segments=meshSegments(mesh,frame,()=>0),primitive=fitBox(segments),shadow=shadowFromPrimitives([primitive]);assert.ok(primitive);assert.equal(shadow.edges.length,36);for(let i=0;i<shadow.edges.length;i++)assert.equal(shadow.edges[shadow.edges[i][2]][2],i);
 const bytes=writeMSH({name:'test',materials:[{name:'wood',texture:'wood.tga'}],models:[{name:'root'},{name:'render',parent:'root',segments},{name:'p_-sv-block',parent:'root',hidden:true,primitive,position:primitive.position,rotation:primitive.rotation},{name:'shadowvolume',parent:'render',shadow}]});const hed=readChunks(bytes);assert.equal(hed[0].tag,'HEDR');const kids=readChunks(bytes,hed[0].start,hed[0].end);assert.deepEqual(kids.map(x=>x.tag),['SHVO','MSH2','CL1L']);const scene=kids[1],blocks=readChunks(bytes,scene.start,scene.end);assert.equal(blocks.filter(b=>b.tag==='MODL').length,4);assert.ok(bytes.length>1500);
});
test('open, duplicate and incorrectly wound shadow edges are rejected',()=>{assert.throws(()=>closedShadow([[0,0,0],[1,0,0],[0,1,0]],[[0,1,2]]),/open edge/);assert.throws(()=>closedShadow([[0,0,0],[1,0,0],[0,1,0]],[[0,1,2],[0,1,2]]),/duplicate/);const s=boxSurface({shape:4,dimensions:[1,1,1],position:[0,0,0],rotation:[0,0,0,1]});assert.doesNotThrow(()=>closedShadow(s.positions,s.triangles));});
test('box fitting preserves rotated slabs and refuses arches',()=>{const mesh=new T.Mesh(new T.BoxGeometry(3,.2,5),new T.MeshStandardMaterial());mesh.rotation.set(.2,.4,.1);mesh.scale.set(2,1,.5);mesh.updateMatrixWorld();assert.ok(fitBox(meshSegments(mesh,new T.Matrix4(),()=>0)));const ring=new T.Mesh(new T.TorusGeometry(2,.2,6,12),new T.MeshStandardMaterial());ring.updateMatrixWorld();assert.equal(fitBox(meshSegments(ring,new T.Matrix4(),()=>0)),null);});
test('ZIP independently extracts every payload with valid checksums, Unicode names and directory offsets',async()=>{
 const files=new Map([
  ['world1/scene.lyr','Version(3);'],
  ['msh/木.tga',new Uint8Array([1,2,3,0,255])],
  ['empty.txt',''],
  ['notes/café.txt','A Unicode payload: 森'],
 ]);
 assert.equal(crc32(new TextEncoder().encode('123456789')),0xcbf43926);
 const bytes=zipFiles(files),archive=await JSZip.loadAsync(bytes,{checkCRC32:true});
 assert.deepEqual(Object.keys(archive.files),[...files.keys()]);
 for(const [name,value] of files){
  const expected=typeof value==='string'?new TextEncoder().encode(value):value;
  assert.deepEqual(await archive.file(name).async('uint8array'),expected,name);
 }
 // JSZip tolerates missing UTF-8 flags; enforce both headers explicitly.
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),end=bytes.length-22;
 assert.equal(view.getUint32(end,true),0x06054b50);
 assert.equal(view.getUint16(end+10,true),files.size);
 let at=view.getUint32(end+16,true);
 const directoryStart=at;
 for(const name of files.keys()){
  assert.equal(view.getUint32(at,true),0x02014b50);
  assert.equal(view.getUint16(at+8,true)&0x800,0x800,name+' central UTF-8 flag');
  const length=view.getUint16(at+28,true),extra=view.getUint16(at+30,true),comment=view.getUint16(at+32,true),local=view.getUint32(at+42,true);
  assert.equal(new TextDecoder().decode(bytes.subarray(at+46,at+46+length)),name);
  assert.equal(view.getUint32(local,true),0x04034b50);
  assert.equal(view.getUint16(local+6,true)&0x800,0x800,name+' local UTF-8 flag');
  assert.equal(view.getUint32(local+14,true),view.getUint32(at+16,true),name+' CRC headers agree');
  const localLength=view.getUint16(local+26,true);
  assert.equal(new TextDecoder().decode(bytes.subarray(local+30,local+30+localLength)),name);
  at+=46+length+extra+comment;
 }
 assert.equal(at,end);
 assert.equal(view.getUint32(end+12,true),end-directoryStart);
 const corrupt=bytes.slice();corrupt[30+view.getUint16(26,true)]^=1;
 await assert.rejects(JSZip.loadAsync(corrupt,{checkCRC32:true}),/CRC32/);
 for(const name of ['../bad','/absolute','a/../bad','a\\bad','a//bad',''])assert.throws(()=>zipFiles(new Map([[name,'x']])),/path/);
});

test('TGA retains opaque RGB or cutout RGBA and top row orientation',()=>{const opaque=writeTGA(2,1,new Uint8Array([255,0,0,255,0,255,0,255]));assert.equal(opaque[16],24);assert.deepEqual([...opaque.slice(18)],[0,0,255,0,255,0]);const alpha=writeTGA(1,1,new Uint8Array([1,2,3,4]));assert.equal(alpha[16],32);assert.equal(alpha[17],40);assert.deepEqual([...alpha.slice(18)],[3,2,1,4]);});

test('large indexed surfaces write without exceeding JavaScript argument limits',()=>{
 const mesh=new T.Mesh(new T.PlaneGeometry(200,200,150,150),new T.MeshStandardMaterial());mesh.updateMatrixWorld();const segments=meshSegments(mesh,new T.Matrix4(),()=>0);assert.equal(segments.length,1);assert.equal(segments[0].triangles.length,45000);
 const bytes=writeMSH({name:'large_floor',materials:[{name:'floor'}],models:[{name:'root'},{name:'visible',parent:'root',segments}]});const hed=readChunks(bytes)[0];assert.equal(hed.end,bytes.length);
 const children=c=>readChunks(bytes,c.start,c.end),scene=children(hed).find(c=>c.tag==='MSH2'),visible=children(scene).filter(c=>c.tag==='MODL')[1],geom=children(visible).find(c=>c.tag==='GEOM'),seg=children(geom).find(c=>c.tag==='SEGM'),fields=children(seg),count=c=>new DataView(c.bytes.buffer,c.bytes.byteOffset).getUint32(0,true);
 assert.equal(count(fields.find(c=>c.tag==='POSL')),22801);assert.equal(count(fields.find(c=>c.tag==='NDXT')),45000);assert.equal(fields.find(c=>c.tag==='NDXT').bytes.length,4+45000*6);
});
