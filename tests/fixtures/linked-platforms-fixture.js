// Test-only inputs for geometry and connection regressions.
import {makePart} from '../../src/core/model.js';
import {appendPlatformSection,platformPorts} from '../../src/platforms/platform.js';
import {resolveRouteLinks} from '../../src/routes/route-links.js';
export function linkedPlatformsFixture(){
 const hull=makePart('block',{name:'Hull · railing omitted alongside',scale:[12,12,8],color:'#66878b'});
 const a=makePart('platform',{name:'Capsule landing · half / rectangle / half',position:[0,5,8],rotation:[0,Math.PI/2,0],color:'#c6c5af',surface:{preset:'cor-angular-plating',scale:.3}});a.platform.sections[0].depth=10;a.platform=appendPlatformSection(a.platform,0,'half-circle','front');a.platform=appendPlatformSection(a.platform,0,'half-circle','back');
 const b=makePart('platform',{name:'Circular arrival deck',position:[24,5,8],color:'#b6c1bb'});Object.assign(b.platform.sections[0],{kind:'circle',width:10,depth:10});
 const c=makePart('platform',{name:'Rounded ground plaza',position:[24,0,27],color:'#b6c1bb'});Object.assign(c.platform.sections[0],{width:12,depth:8,radius:2});c.platform.railing='solid';
 const port=(p,side)=>platformPorts(p).find(q=>q.ref.platformSection===p.platform.sections[0].id&&q.ref.side===side).ref;
 const bridge=makePart('stair-route',{name:'Linked walkway',position:[9,5,8],rotation:[0,Math.PI/2,0],route:{width:2.4,thickness:.2,gap:.15,segments:[{kind:'landing',run:10,rise:0,steps:1,turn:'straight',railing:{style:'posts'}}],links:{start:port(a,'back'),end:port(b,'left')}}});
 const stairs=makePart('stair-route',{name:'Linked descending stair',position:[24,5,13],route:{width:2.4,thickness:.2,gap:.15,segments:[{kind:'stairs',run:10,rise:-5,steps:28,turn:'straight',railing:{style:'posts'}}],links:{start:port(b,'back'),end:port(c,'front')}}});
 return {format:'open-building-studio',version:1,name:'Test fixture',parts:resolveRouteLinks([hull,a,b,c,bridge,stairs])};
}
