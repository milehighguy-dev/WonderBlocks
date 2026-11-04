import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultPlatform,validatePlatform} from '../src/platforms/platform.js';
import {platformFromRoute} from '../src/platforms/platform-flow.js';
import {makePart,validateProject} from '../src/core/model.js';
import {resolveRouteLinks} from '../src/routes/route-links.js';

test('platform validation checks derived attachment positions rather than only saved positions',()=>{
 const p=defaultPlatform(),parent=p.sections[0];parent.x=499;parent.width=100;
 p.sections.push({...parent,id:'child',x:0,z:0,width:8,attachment:{sectionId:parent.id,side:'right',followWidth:false}});
 assert.throws(()=>validatePlatform(p),/bounds/);
 const entry=defaultPlatform();entry.entry={sectionId:entry.sections[0].id,x:1000,z:0};
 assert.throws(()=>validatePlatform(entry),/bounds/);
});

test('platform import rejects malformed flow settings and oversized inherited widths',()=>{
 for(const patch of [{flow:'yes'},{branchSide:'yes'},{turn:'unknown'}]){
  const p=defaultPlatform();p.sections.push({...p.sections[0],id:'child',attachment:{sectionId:p.sections[0].id,side:'back',followWidth:true,...patch}});
  assert.throws(()=>validatePlatform(p),/flow/);
 }
 const p=defaultPlatform();Object.assign(p.sections[0],{width:100,depth:100,rotation:Math.PI/4});
 p.sections.push({...p.sections[0],id:'child',width:8,depth:8,rotation:0,attachment:{sectionId:p.sections[0].id,side:'back',followWidth:true}});
 assert.throws(()=>validatePlatform(p),/bounds/);
});

test('platforms from routes fit the selected section width including object scale',()=>{
 const route=makePart('stair-route');route.route.width=1.5;route.route.segments[0].width=8;route.scale[0]=1.5;
 const result=platformFromRoute(route);
 assert.equal(result.platform.platform.sections[0].width,14);
 assert.doesNotThrow(()=>resolveRouteLinks([result.platform,result.route]));
 assert.doesNotThrow(()=>validateProject({format:'open-building-studio',version:1,name:'Wide section',parts:[result.platform,result.route]}));
});
import {platformPorts} from '../src/platforms/platform.js';

test('long platform end ports use the edge width rather than the shorter deck dimension',()=>{
 const p=makePart('platform');p.platform.sections[0].width=14;p.platform.sections[0].depth=8;
 const widths=()=>Object.fromEntries(platformPorts(p).map(port=>[port.ref.side,port.width]));
 assert.deepEqual(widths(),{front:14,back:14,left:8,right:8});
 p.platform.sections[0].rotation=Math.PI/2;
 for(const [side,width] of Object.entries({front:8,back:8,left:14,right:14}))assert.ok(Math.abs(widths()[side]-width)<1e-6);
});
