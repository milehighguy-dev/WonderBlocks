// Test-only inputs for geometry and connection regressions.
import {makePart} from '../../src/core/model.js';
import {interiorFromShell,validateInterior} from '../../src/interiors/interior.js';
import {addStorey} from '../../src/interiors/interior-storeys.js';
import {preparePatternScaling} from '../../src/materials/pattern-scaling.js';
export function storeysFixture(){
 const hall=interiorFromShell(makePart('block',{name:'Connected Gallery • two editable floors',scale:[16,6.6,14],color:'#779a8c',surface:{preset:'stone',scale:.5}}));
 let p=hall.interior;p.height=3;p.finishes.floor={color:'#c9bb98',preset:'tile',scale:.5};p.rooms.push({id:'archive',x:-7.6,z:-6.6,w:4,d:4},{id:'studio',x:3.6,z:-6.6,w:4,d:4});p.doors=[{axis:'x',line:6.6,offset:0,width:3,height:2.6},{axis:'x',line:-2.6,offset:-5.6,width:2,height:2.4},{axis:'x',line:-2.6,offset:5.6,width:2,height:2.4}];
 p=addStorey(p);const upper=p.storeys[0];upper.name='Upper gallery';upper.plan.rooms.push({id:'west-gallery',x:-7.6,z:-6.6,w:4,d:4},{id:'east-gallery',x:3.6,z:-6.6,w:4,d:4});upper.plan.doors=[{axis:'x',line:-2.6,offset:-5.6,width:2,height:2.4},{axis:'x',line:-2.6,offset:5.6,width:2,height:2.4}];
 for(const plan of [p,upper.plan])for(const x of [-7.6,7.6])plan.doors.push({axis:'z',line:x,offset:2,width:4,height:1.3,sill:.9,kind:'window'});
 p.stairs=[{id:'main-stair',from:'ground',to:upper.id,x:0,z:-2.5,run:5.04,width:1.6,direction:'south'}];validateInterior(p);hall.interior=p;
 return preparePatternScaling({format:'open-building-studio',version:1,name:'Test fixture',parts:[hall,makePart('block',{name:'Entry court',position:[0,-.3,0],scale:[20,.3,18],color:'#9da58f',surface:{preset:'tile',scale:.5}})]});
}
