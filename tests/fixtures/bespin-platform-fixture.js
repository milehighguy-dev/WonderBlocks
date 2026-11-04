// Test-only inputs for geometry and connection regressions.
import {makePart} from '../../src/core/model.js';
import {platformPorts,appendPlatformSection} from '../../src/platforms/platform.js';
import {resolveRouteLinks} from '../../src/routes/route-links.js';
export function bespinPlatformFixture(){
 const a=makePart('platform',{name:'Bespin circular landing',position:[0,5,0],color:'#c9c6b9'});Object.assign(a.platform,{style:'bespin',railing:'bespin',thickness:2.3,railHeight:.12});Object.assign(a.platform.sections[0],{kind:'circle',width:12,depth:12});
 const b=makePart('platform',{name:'Bespin capsule deck',position:[20,5,0],color:'#c9c6b9'});Object.assign(b.platform,{style:'bespin',railing:'bespin',thickness:1.5,railHeight:.1});Object.assign(b.platform.sections[0],{width:8,depth:8});b.platform=appendPlatformSection(b.platform,0,'half-circle','front');b.platform=appendPlatformSection(b.platform,0,'half-circle','back');
 const ref=(p,side)=>platformPorts(p).find(p=>p.ref.side===side).ref;
 const route=makePart('stair-route',{name:'Bespin connecting walkway',color:'#c9c6b9',route:{width:2.4,thickness:.18,gap:.15,segments:[{kind:'landing',run:10,rise:0,steps:1,turn:'straight',railing:{style:'bespin',height:.7,panelThickness:.24,color:'#c9c6b9'}}],links:{start:ref(a,'right'),end:ref(b,'left')}}});
 return {format:'open-building-studio',version:1,name:'Test fixture',parts:resolveRouteLinks([a,b,route])};
}
