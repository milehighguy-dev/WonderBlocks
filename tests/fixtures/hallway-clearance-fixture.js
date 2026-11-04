// Test-only inputs for geometry and connection regressions.
import {makePart} from '../../src/core/model.js';
import {defaultHallway} from '../../src/routes/hallway.js';
import {preparePatternScaling} from '../../src/materials/pattern-scaling.js';
export function hallwayClearanceFixture(){
 const parts=[],stone='#c8c6ae',trim='#607c72';
 const add=(type,name,position,scale,color=stone)=>{const p=makePart(type,{name,position,scale,color});parts.push(p);return p;};
 const h=(ceiling,color=stone)=>({...defaultHallway(),ceiling,color,surface:{preset:'plain',scale:1}});
 // A single route carries the entire walk: open entry, covered corridor,
 // corner, exposed stair, upper court, covered gallery and viewing terrace.
 const route=add('stair-route','Promenade • edit this route to explore all eight segments',[0,0,-10],[1,1,1],'#d4c9aa');
 route.surface={preset:'tile',scale:.5};
 route.route={width:3,thickness:.2,gap:.3,segments:[
  {kind:'landing',run:3,rise:0,steps:1,turn:'straight',hallway:h(false,trim)},
  {kind:'landing',run:5,rise:0,steps:1,turn:'straight',hallway:h(true)},
  {kind:'landing',run:3,rise:0,steps:1,turn:'left',hallway:h(true)},
  {kind:'stairs',run:6,rise:3,steps:16,treadDepth:.375,turn:'straight',fillToGround:true,railing:{style:'posts',height:1.1,color:trim}},
  {kind:'landing',run:4,rise:0,steps:1,turn:'straight',hallway:h(false,trim)},
  {kind:'landing',run:3,rise:0,steps:1,turn:'left',hallway:h(false,trim)},
  {kind:'landing',run:5,rise:0,steps:1,turn:'straight',hallway:h(true)},
  {kind:'landing',run:3,rise:0,steps:1,turn:'straight',railing:{style:'posts',height:1.1,color:trim}}
 ]};
 return preparePatternScaling({format:'open-building-studio',version:1,name:'Test fixture',parts});
}
