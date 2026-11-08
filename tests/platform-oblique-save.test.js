import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {makePart,validateProject} from '../src/core/model.js';
import {platformFromRoute,extendPlatformFlow} from '../src/platforms/platform-flow.js';
import {platformPort} from '../src/platforms/platform.js';
import {resolveRouteLinks} from '../src/routes/route-links.js';
import {routeLayout} from '../src/routes/stair-route.js';
import {partMatrix} from '../src/interiors/entrances.js';
import {editorDraftSnapshot} from '../src/editor/editor-project.js';

function fixture(){
 const route=makePart('stair-route',{name:'Curved approach',position:[8,40,-3],route:{width:4,thickness:.2,gap:0,segments:[{kind:'stairs',run:16,rise:-10,steps:32,turn:'straight',curveAngle:-1.4,railing:{style:'kotor-kashyyyk'}}]}});
 const linked=platformFromRoute(route),project={format:'open-building-studio',version:1,name:'Platform save regression',parts:[linked.route,linked.platform]},draft=structuredClone(linked.platform);
 draft.platform.sections[0].width=9;draft.platform=extendPlatformFlow(draft.platform,0,'straight','half-circle');draft.rotation[1]+=.12;
 return {project,draft};
}

test('Done and Save accept a curved route arriving obliquely at a named platform edge',()=>{
 const {project,draft}=fixture(),source=JSON.stringify(project),raw=JSON.stringify(draft);
 const snapshot=editorDraftSnapshot(project,{draft});assert.doesNotThrow(()=>validateProject(snapshot));assert.equal(snapshot.parts[1].platform.sections.length,2);assert.equal(JSON.stringify(project),source);assert.equal(JSON.stringify(draft),raw);
 const resolved=resolveRouteLinks(snapshot.parts),[route,platform]=resolved,port=platformPort(platform,route.route.links.end),tip=new T.Vector3(...routeLayout(route.route).at(-1).end).applyMatrix4(partMatrix(route));
 assert.ok(tip.distanceTo(port.point)<1e-7);assert.equal(route.route.links.end.partId,platform.id,'the valid connection is retained');assert.doesNotThrow(()=>resolveRouteLinks([project.parts[0],draft]));
});

test('unreachable platform errors identify the platform rather than a building entrance',()=>{
 const {project,draft}=fixture();draft.position[0]+=100;
 assert.throws(()=>editorDraftSnapshot(project,{draft}),error=>/platform edge/.test(error.message)&&!/entrance/.test(error.message));
});
