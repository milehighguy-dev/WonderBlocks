// Test-only inputs for geometry and connection regressions.
import {makePart} from '../../src/core/model.js';
import {defaultHighway,branchHighway,syncHighwayJunctions} from '../../src/highways/highway.js';
export function highwayJunctionFixture(){
 let h={...defaultHighway(),width:12,barrierHeight:1.1,supports:true,nodes:[{point:[0,8,-45],tangent:[0,0,145/3]},{point:[0,8,100],tangent:[0,0,145/3]}]};
 h=branchHighway(h,{path:'main',segment:0,t:.25},[35,4,30],6,'exit-return');const b=h.branches[0];b.nodes[1].tangent=[0,0,12];b.nodes.push({point:[35,4,55],tangent:[0,0,14]},{point:[0,8,85.5],tangent:[0,0,12]});b.end={path:'main',segment:0,t:.9,direction:1,side:1};syncHighwayJunctions(h);
 const cross=(id,name,y,z,width,length)=>makePart('highway',{id,name,position:[-35,y,z],rotation:[0,Math.PI/2,0],surface:{preset:'slate',scale:.25},highway:{...defaultHighway(),width,barrierHeight:1.1,supports:true,nodes:[{point:[0,0,0],tangent:[0,0,length/3]},{point:[0,0,length],tangent:[0,0,length/3]}]}});
 return {format:'open-building-studio',version:1,name:'Test fixture',parts:[makePart('highway',{id:'highway-main',name:'Main highway with exit and return ramp',surface:{preset:'slate',scale:.25},highway:h}),cross('highway-crossing','Level intersection',8,-25,10,70),cross('highway-overpass','Separate overpass',17,20,10,100)]};
}
