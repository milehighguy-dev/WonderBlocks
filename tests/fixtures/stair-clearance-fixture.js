// Test-only inputs for geometry and connection regressions.
import {makePart} from '../../src/core/model.js';
import {interiorFromShell,defaultInterior,interiorWalls} from '../../src/interiors/interior.js';
import {preparePatternScaling} from '../../src/materials/pattern-scaling.js';

// A split-level hall: the rear gallery floor ends at the stair landing,
// leaving the central atrium open all the way from the ground to the roof.
export function stairClearanceFixture(){
 const parts=[],stone='#c9ceb8',green='#719487',bronze='#897447';
 const add=(type,name,position,scale=[1,1,1],color=stone)=>{const p=makePart(type,{name,position,scale,color});parts.push(p);return p;};
 function door(plan,axis,line,offset,width=1.6,height=2.4){const wall=interiorWalls(plan).find(w=>w.axis===axis&&Math.abs(w.line-line)<1e-6&&offset>w.start&&offset<w.end);if(!wall)throw Error('Fixture doorway has no wall.');plan.doors.push({wall:wall.key,offset,width,height});}
 const shell=interiorFromShell(makePart('block',{name:'Stair hall • existing outer shell',scale:[18,7.6,16],color:green,surface:{preset:'stone',scale:.45}}));
 shell.interior.height=7.2;shell.interior.finishes.floor={color:'#b5ad96',preset:'tile',scale:.5};shell.interior.finishes.wall={color:stone,preset:'plain',scale:1};door(shell.interior,'x',7.6,0,3,2.8);parts.push(shell);
 const lower=defaultInterior();lower.height=3.1;lower.rooms=[{id:'archive',x:-7.5,z:-7,w:5,d:4},{id:'reading',x:2.5,z:-7,w:5,d:4}];lower.finishes.floor={color:'#a19b80',preset:'wood',scale:.6};lower.finishes.wall={color:'#e2ddc6',preset:'plain',scale:1};door(lower,'x',-3,-5,1.8);door(lower,'x',-3,5,1.8);
 // Raised floor finish avoids coplanar overlap with the shell's structural floor.
 add('interior','Ground floor • archive and reading room',[0,.3,0]).interior=lower;
 const upper=defaultInterior();upper.height=3;upper.rooms=[{id:'west-gallery',x:-7.5,z:-7,w:5,d:4},{id:'upper-lobby',x:-2.5,z:-7,w:5,d:4},{id:'east-gallery',x:2.5,z:-7,w:5,d:4}];upper.finishes.floor={color:'#c5bea5',preset:'tile',scale:.6};upper.finishes.wall={color:'#dddcc9',preset:'plain',scale:1};door(upper,'x',-3,0,3,2.6);door(upper,'z',-2.5,-5,1.8);door(upper,'z',2.5,-5,1.8);
 add('interior','Upper floor • lobby and two galleries',[0,3.8,0]).interior=upper;
 const rail={style:'posts',height:.9,color:bronze,spacing:1.8,railWidth:.07,railHeight:.07,postWidth:.06};
 const stairs=add('stair-route','Grand stair • atrium to upper lobby',[0,.2,4.6]);stairs.rotation[1]=Math.PI;stairs.surface={preset:'stone',scale:.5};stairs.route={width:2.4,thickness:.2,gap:.2,segments:[{kind:'stairs',run:6.2,rise:3.6,steps:20,treadDepth:.31,treadThickness:.05,turn:'straight',fillToGround:false,railing:{...rail}},{kind:'landing',run:1.4,rise:0,steps:1,turn:'straight',fillToGround:false,railing:{...rail}}]};
 const approach=add('stair-route','Entrance • gentle threshold ramp',[0,0,10.5]);approach.rotation[1]=Math.PI;approach.route={width:3,thickness:.12,gap:.2,segments:[{kind:'ramp',run:2.5,rise:.2,steps:1,turn:'straight',fillToGround:true}]};
 add('block','Entry court',[0,-.3,2],[23,.3,22],'#919d95').surface={preset:'tile',scale:.35};
 return preparePatternScaling({format:'open-building-studio',version:1,name:'Test fixture',parts});
}
