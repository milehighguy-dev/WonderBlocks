// Test-only inputs for geometry and connection regressions.
import {makePart} from '../../src/core/model.js';
import {kotorPlatformDefaults,kotorRailingDefaults} from '../../src/routes/kotor-kashyyyk.js';
import {platformPort} from '../../src/platforms/platform.js';
import {resolveRouteLinks} from '../../src/routes/route-links.js';
export function wovenPlatformsFixture(){
 const platform=(name,position,kind,width,depth)=>{const p=makePart('platform',{name,position,color:'#ffffff'});Object.assign(p.platform,kotorPlatformDefaults());Object.assign(p.platform.sections[0],{kind,width,depth});return p;};
 const a=platform('KOTOR · rectangular landing',[-4,6,-12],'rectangle',12,8),b=platform('KOTOR · circular lookout',[-4,6,16],'circle',14,14),c=platform('KOTOR · half-circle terrace',[17,6,6],'half-circle',12,6);
 const start=platformPort(a,{partId:a.id,platformSection:a.platform.sections[0].id,side:'back'}),end=platformPort(b,{partId:b.id,platformSection:b.platform.sections[0].id,side:'front'});
 const route=makePart('stair-route',{name:'KOTOR · woven walkway',color:'#ffffff',position:start.point.toArray(),route:{width:4,thickness:.5,gap:.15,links:{start:start.ref,end:end.ref},segments:[{kind:'landing',run:end.point.z-start.point.z,rise:0,steps:1,turn:'straight',railing:kotorRailingDefaults()}]}});
 const curved=makePart('stair-route',{name:'KOTOR · curved rising walkway',color:'#ffffff',position:[17,6,0],route:{width:3.5,thickness:.5,gap:.15,segments:[{kind:'ramp',run:12,rise:2,steps:1,turn:'straight',curveAngle:Math.PI/2,railing:kotorRailingDefaults()}]}});
 // The terrace's flat rear edge meets the ramp's entry without a rail across
 // the walking opening. The separate lookout demonstrates a curved ascent.
 curved.route.links={start:{partId:c.id,platformSection:c.platform.sections[0].id,side:'front'}};
 return {format:'open-building-studio',version:1,name:'Test fixture',parts:resolveRouteLinks([a,b,c,route,curved])};
}
