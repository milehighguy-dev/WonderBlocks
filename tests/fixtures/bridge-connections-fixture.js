// Test-only inputs for geometry and connection regressions.
import {makePart} from '../../src/core/model.js';
import {bridgeStyleDefaults} from '../../src/routes/kashyyyk-bridges.js';
import {kashyyykPlatformDefaults} from '../../src/platforms/kashyyyk-platforms.js';
import {platformPort} from '../../src/platforms/platform.js';
import {resolveRouteLinks} from '../../src/routes/route-links.js';
export function bridgeFixture(){return {format:'open-building-studio',version:1,name:'Test fixture',parts:[
 makePart('stair-route',{name:'Kashyyyk timber bridge',position:[-7,5,-13.5],color:'#ffffff',route:{width:5.6,thickness:.18,gap:.15,segments:[{kind:'landing',run:27,rise:0,steps:1,turn:'straight',railing:bridgeStyleDefaults('kashyyyk-timber')}]} }),
 makePart('stair-route',{name:'Kashyyyk suspension bridge',position:[7,5,-13.5],color:'#ffffff',route:{width:6.1,thickness:.18,gap:.15,segments:[{kind:'landing',run:27,rise:0,steps:1,turn:'straight',railing:bridgeStyleDefaults('kashyyyk-suspension')}]} })
]};}

export function bridgeConnectionsFixture(){
 const project=bridgeFixture();
 for(const [i,style] of ['kashyyyk-timber','kashyyyk-thatched'].entries()){
  const x=i?15:-15,p=makePart('platform',{name:i?'Kashyyyk thatched platform':'Kashyyyk timber platform',position:[x,18,23],color:'#ffffff'});
  Object.assign(p.platform,kashyyykPlatformDefaults(style,24));
  Object.assign(p.platform.sections[0],{kind:'circle',width:24,depth:24});
  const section=p.platform.sections[0],port=platformPort(p,{partId:p.id,platformSection:section.id,side:'front'}),route=project.parts[i];
  route.position=[x,18,port.point.z-27];route.route.links={end:port.ref};project.parts.push(p);
 }
 project.parts=resolveRouteLinks(project.parts);return project;
}
