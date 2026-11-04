import test from 'node:test';import assert from 'node:assert/strict';import {makePart,validateProject} from '../src/core/model.js';import {roomFromRoute,routeFromRoom,roomPorts,ensureRoomDoorIds,reconcileRoomRouteLinks,roomHullNeighbors} from '../src/interiors/room-route.js';import {resolveRouteLinks} from '../src/routes/route-links.js';import {routeSnapTargets} from '../src/routes/route-snap.js';import {buildPart,disposePart} from '../src/core/geometry.js';import {Group,Raycaster,Vector3} from '../vendor/three.module.js';
test('routes create independent rooms with flush floors and matching door connections',()=>{for(const kind of ['landing','stairs','ramp']){const route=makePart('stair-route');route.route.segments=[{kind,run:3,rise:kind==='landing'?0:1.5,steps:8,turn:'straight'}];const result=roomFromRoute(route),parts=resolveRouteLinks([result.route,result.room]);assert.equal(parts[0].route.links.end.roomDoorId,result.room.interior.doors[0].id);assert.ok(routeSnapTargets([result.room],result.route,'end').length);assert.doesNotThrow(()=>validateProject({format:'open-building-studio',version:1,name:'Rooms',parts}));const root=new Group();parts.forEach(p=>root.add(buildPart(p)));root.updateMatrixWorld(true);const port=roomPorts(result.room)[0];for(const z of [-.03,.03])assert.ok(new Raycaster(port.point.clone().add(new Vector3(0,.3,z)),new Vector3(0,-1,0),0,.6).intersectObject(root,true).length);disposePart(root);}});
test('room doors start paths, ramps, and stairs and track room movement',()=>{const {room}=roomFromRoute(makePart('stair-route')),ref=roomPorts(room)[0].ref;for(const kind of ['landing','stairs','ramp']){const route=routeFromRoom(room,ref,kind);room.position[0]+=2;const resolved=resolveRouteLinks([room,route]).find(p=>p.id===route.id);assert.deepEqual(resolved.position,roomPorts(room)[0].point.toArray());assert.doesNotThrow(()=>validateProject({format:'open-building-studio',version:1,name:'Rooms',parts:[room,resolved]}));}const id=room.interior.doors[0].id;ensureRoomDoorIds(room.interior);assert.equal(room.interior.doors[0].id,id);});

test('removing a room door detaches its route without losing the route geometry',()=>{const {room}=roomFromRoute(makePart('stair-route')),route=routeFromRoom(room,roomPorts(room)[0].ref,'path'),before=structuredClone(route.route.segments);room.interior.doors=[];reconcileRoomRouteLinks([room,route],room);assert.equal(route.route.links.start,undefined);assert.deepEqual(route.route.segments,before);assert.doesNotThrow(()=>resolveRouteLinks([room,route]));});
test('standalone room editing discovers only nearby building hulls',()=>{const room=makePart('interior'),near=makePart('block',{scale:[10,10,10]}),far=makePart('block',{position:[100,0,100]});assert.deepEqual(roomHullNeighbors(room,[room,near,far]).map(p=>p.id),[near.id]);});

test('routes leaving a room match wide and narrow doorway widths',()=>{
 for(const width of [1.2,3.5,7.5]){
  const source=makePart('stair-route');source.route.width=width;
  const {room}=roomFromRoute(source);room.interior.doors[0].width=width;
  for(const kind of ['landing','stairs','ramp']){
   const route=routeFromRoom(room,roomPorts(room)[0].ref,kind);
   assert.equal(route.route.width,width);
   assert.doesNotThrow(()=>resolveRouteLinks([room,route]));
  }
 }
});

test('linked enclosed hallways cannot widen through the solid sides of a doorway',()=>{
 const source=makePart('stair-route');source.route.width=2;
 const {room,route}=roomFromRoute(source);
 const outgoing=routeFromRoom(room,roomPorts(room)[0].ref,'landing');
 outgoing.route.width=3;
 assert.throws(()=>resolveRouteLinks([room,outgoing]),/doorway is too narrow/);
 route.route.width=3;route.route.segments[0].hallway={height:3,thickness:.2,ceiling:true,color:'#ffffff',surface:{preset:'plain',scale:1}};
 assert.throws(()=>resolveRouteLinks([room,route]),/doorway is too narrow/);
 outgoing.route.width=2;outgoing.scale[0]=1.5;
 assert.throws(()=>resolveRouteLinks([room,outgoing]),/doorway is too narrow/);
 assert.equal(room.interior.doors[0].width,2);
});
