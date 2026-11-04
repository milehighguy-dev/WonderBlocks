import test from 'node:test';
import assert from 'node:assert/strict';
import {makePart,validateProject} from '../src/core/model.js';
import {roomFromRoute} from '../src/interiors/room-route.js';
import {copyParts} from '../src/core/assemblies.js';
import {captureAssembly,instantiateAssembly} from '../src/core/library.js';
import {resolveRouteLinks} from '../src/routes/route-links.js';
import {detachDeletedPartReferences} from '../src/editor/part-references.js';
import {defaultHallwayRoute} from '../src/routes/hallway.js';
const project=parts=>({format:'open-building-studio',version:1,name:'Connections',parts});
const pair=()=>{const r=makePart('stair-route');const {room,route}=roomFromRoute(r);return [route,room];};

test('deleting a host detaches endpoint, landing and fitted-surface references without changing route geometry',()=>{
 const route=makePart('stair-route',{route:defaultHallwayRoute()}),host=makePart('block'),other=makePart('block');
 route.route.links={start:{partId:host.id,entranceId:'door'},end:{partId:other.id,entranceId:'other'}};
 route.route.attachments=[{index:0,end:'end',ref:{partId:host.id,segment:0,side:'back'}}];route.route.segments[0].hallway.entranceFit={partId:host.id,end:'start'};
 const dimensions=structuredClone(route.route.segments[0]);delete dimensions.hallway.entranceFit;
 detachDeletedPartReferences([route],new Set([host.id]));assert.equal(route.route.links.start,undefined);assert.equal(route.route.links.end.partId,other.id);assert.equal(route.route.attachments.length,0);assert.equal(route.route.segments[0].hallway.entranceFit,undefined);assert.deepEqual(route.route.segments[0],dimensions);
});

test('duplicate connected rooms and routes reference their own copies and move together',()=>{
 const parts=pair(),before=structuredClone(parts),copies=copyParts(parts,new Set(parts.map(p=>p.id)));
 assert.equal(copies[0].route.links.end.partId,copies[1].id);
 const resolved=resolveRouteLinks([...parts,...copies]);
 assert.deepEqual(resolved[2].position,[parts[0].position[0]+1,...parts[0].position.slice(1)]);
 assert.equal(resolved[2].route.segments[0].run,parts[0].route.segments[0].run);
 assert.deepEqual(parts,before);
 assert.doesNotThrow(()=>validateProject(project(resolved)));
});

test('duplicating or capturing one route detaches outside links without losing its geometry',()=>{
 const parts=pair(),copy=copyParts(parts,new Set([parts[0].id]))[0],entry=captureAssembly('Route',[parts[0]]);
 assert.equal(copy.route.links.end,undefined);
 assert.equal(entry.parts[0].route.links.end,undefined);
 assert.deepEqual(copy.route.segments,parts[0].route.segments);
 assert.doesNotThrow(()=>instantiateAssembly(entry));
 assert.ok(parts[0].route.links.end);
});

test('saved connected object groups instantiate repeatedly with independent endpoint IDs',()=>{
 const entry=captureAssembly('Room and access',pair()),before=structuredClone(entry);
 const a=instantiateAssembly(entry,[10,2,4],Math.PI/2),b=instantiateAssembly(entry,[-10,0,0]);
 for(const parts of [a,b]){
  assert.equal(parts[0].route.links.end.partId,parts[1].id);
  assert.doesNotThrow(()=>resolveRouteLinks(parts));
 }
 assert.notEqual(a[1].id,b[1].id);
 assert.deepEqual(entry,before);
});

test('import validates section attachments even when a route has no endpoint links',()=>{
 const route=makePart('stair-route');
 route.route.attachments=[{index:0,end:'end',ref:{partId:'missing',segment:0,side:'back'}}];
 assert.throws(()=>validateProject(project([route])),/another route/);
 route.route.attachments={bad:true};
 assert.throws(()=>validateProject(project([route])));
});

test('standalone routes can mirror and tilt without being treated as connected routes',()=>{
 const source=makePart('stair-route'),copies=copyParts([source],new Set([source.id]),true);
 assert.equal(copies[0].scale[0],-1);
 assert.doesNotThrow(()=>resolveRouteLinks(copies));
 copies[0].rotation[0]=.3;
 assert.doesNotThrow(()=>resolveRouteLinks(copies));
 assert.doesNotThrow(()=>validateProject(project(copies)));
});

test('mirrored connected room copies preserve their own links without mutating the source project',()=>{
 const parts=pair(),before=structuredClone(parts);
 const copies=copyParts(parts,new Set(parts.map(p=>p.id)),true);assert.equal(copies[0].route.links.end.partId,copies[1].id);assert.doesNotThrow(()=>resolveRouteLinks(copies));
 assert.deepEqual(parts,before);
});
