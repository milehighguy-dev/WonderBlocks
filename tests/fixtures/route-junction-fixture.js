// Test-only inputs for geometry and connection regressions.
import {makePart} from '../../src/core/model.js';import {defaultHallway} from '../../src/routes/hallway.js';import {preparePatternScaling} from '../../src/materials/pattern-scaling.js';
export function routeJunctionFixture(){
 const h={...defaultHallway(),ceiling:false,height:2.4},flat=(run,turn='straight')=>({kind:'landing',run,rise:0,steps:1,turn,hallway:structuredClone(h)}),ramp=run=>({...flat(run),kind:'ramp'});
 const segments=[flat(3),flat(7),flat(3),{...ramp(6),branchFrom:{segment:0,side:'left'}},flat(2,'right'),ramp(8),flat(2,'right'),{...flat(7),joinTo:{segment:2,side:'left'}}];
 const p=makePart('stair-route',{name:'Loop • split at section 1, rejoin section 3',route:{width:2,thickness:.18,gap:.2,segments}});
 return preparePatternScaling({format:'open-building-studio',version:1,name:'Test fixture',parts:[p]});
}
