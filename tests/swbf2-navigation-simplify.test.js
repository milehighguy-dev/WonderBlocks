import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {simplifyNavigationGraph} from '../src/swbf2/swbf2-navigation-simplify.js';
const hub=(x,patch={})=>({point:new T.Vector3(x,0,0),radius:.5,kind:'route',partIds:['route'],...patch});
const edge=(start,end,flags=3)=>({start,end,flags});
const run=(hubs,connections,clear=()=>true)=>simplifyNavigationGraph(hubs,connections,{removable:h=>['route','surface'].includes(h.kind),clear});

test('straight sample chains and overlapping collinear links reduce to one equivalent corridor',()=>{
 const hubs=Array.from({length:9},(_,i)=>hub(i*6)),original=[...hubs],connections=hubs.slice(1).map((h,i)=>edge(hubs[i],h)).concat(hubs.slice(2).map((h,i)=>edge(hubs[i],h)));
 const result=run(hubs,connections);assert.equal(result.removedHubs,7);assert.equal(result.removedConnections,7);assert.deepEqual(hubs,[original[0],original.at(-1)]);assert.equal(connections.length,1);assert.deepEqual(new Set([connections[0].start,connections[0].end]),new Set(hubs));
});

test('turns, radius changes, width transitions, junctions and source seams are retained',()=>{
 for(const patch of [{point:new T.Vector3(4,0,1)},{point:new T.Vector3(4,1,0)},{radius:.2},{kind:'transition'},{kind:'junction'},{kind:'door'},{partIds:['route','other']},{layered:true,radius:0,walkableRadius:.5}]){
  const hubs=[hub(0),hub(4,patch),hub(8)],connections=[edge(hubs[0],hubs[1]),edge(hubs[1],hubs[2])];run(hubs,connections);assert.equal(hubs.length,3,JSON.stringify(patch));assert.equal(connections.length,2);
 }
 const hubs=[hub(0),hub(4),hub(8),hub(4,{point:new T.Vector3(4,0,4)})],connections=[edge(hubs[0],hubs[1]),edge(hubs[1],hubs[2]),edge(hubs[1],hubs[3])];run(hubs,connections);assert.equal(hubs.length,4);assert.equal(connections.length,3);
});

test('replacement corridors require physical verification and cannot change unit flags',()=>{
 for(const flags of [3,1]){const hubs=[hub(0),hub(4),hub(8)],connections=[edge(hubs[0],hubs[1]),edge(hubs[1],hubs[2],flags)];run(hubs,connections,()=>false);assert.equal(hubs.length,3);assert.equal(connections.length,2);}
 const hubs=[hub(0),hub(4),hub(8)],connections=[edge(hubs[0],hubs[1]),edge(hubs[1],hubs[2],1)];run(hubs,connections);assert.equal(hubs.length,3);
});

test('stacked-floor point hubs retain their physical width profile',()=>{
 const hubs=[hub(0,{radius:0,layered:true,walkableRadius:.5}),hub(4,{radius:0,layered:true,walkableRadius:.2}),hub(8,{radius:0,layered:true,walkableRadius:.5})],connections=[edge(hubs[0],hubs[1]),edge(hubs[1],hubs[2])];run(hubs,connections);assert.equal(hubs.length,3);
 const mixed=[hub(0),hub(4,{radius:0,layered:true,walkableRadius:.5}),hub(8)],links=[edge(mixed[0],mixed[1]),edge(mixed[1],mixed[2]),edge(mixed[0],mixed[2])];run(mixed,links);assert.equal(links.length,3,'a point-hub path does not subsume the wider direct corridor');
});
