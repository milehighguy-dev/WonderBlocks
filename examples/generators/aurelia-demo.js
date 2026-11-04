import {prepareExampleCopies} from '../../src/editor/example-copies.js';
import {makePart} from '../../src/core/model.js';
import {defaultHighway,branchHighway,syncHighwayJunctions} from '../../src/highways/highway.js';
import {defaultInterior} from '../../src/interiors/interior.js';

// A compact radial composition: public plaza, station terraces, and traffic
// occupy separate elevations. The landmark stays clear of the driving lanes.
export function aureliaGate(){
 const parts=[];let district='';
 const add=(type,name,position,scale=[1,1,1],color='#829397',preset='cor-panels')=>{const p=makePart(type,{id:'aurelia-'+parts.length,name,position,scale,color,surface:{preset,scale:.25},assemblyId:district,assemblyName:district});parts.push(p);return p;};
 const box=(name,p,s,c,preset)=>add('block',name,p,s,c,preset);
 const ring=(name,p,s,c,thickness=12,preset='metal')=>{const q=add('ring-body',name,p,s,c,preset);q.parameters={sides:48,wallThickness:thickness};return q;};
 const deck=(name,p,w,d,c='#9db9b3',kind='rectangle')=>{const q=add('platform',name,p,[1,1,1],c,'cor-floor-plates');q.platform.thickness=.6;q.platform.railing='none';Object.assign(q.platform.sections[0],{width:w,depth:d,kind,radius:kind==='rectangle'?2:0});return q;};
 const stairs=(name,a,b,width=8)=>{const run=Math.hypot(b[0]-a[0],b[2]-a[2]),rise=b[1]-a[1];const q=add('stair-route',name,a,[1,1,1],'#8ea8a2','cor-floor-plates');q.rotation[1]=Math.atan2(b[0]-a[0],b[2]-a[2]);q.route={width:Math.min(width,10),thickness:.3,gap:0,segments:[{kind:rise?'stairs':'landing',run,rise,steps:Math.max(1,Math.ceil(Math.abs(rise)/.18)),turn:'straight',railing:{style:'posts',height:1.1,sides:'both',color:'#bfa56e',surface:{preset:'metal',scale:.25}}}]};return q;};
 const hall=(name,p,w,d)=>{const q=add('interior',name,p);q.interior=defaultInterior();q.interior.height=7;q.interior.rooms=[{id:'hall',x:-w/2,z:-d/2,w,d}];q.interior.finishes={floor:{color:'#8da6a1',preset:'cor-floor-plates',scale:.3},wall:{color:'#b9c7be',preset:'cor-interior-panel',scale:.3},outside:{color:'#526e79',preset:'cor-ribs',scale:.3},ceiling:{color:'#b5c4bb',preset:'cor-ceiling-panels',scale:.3},roof:{color:'#b5c4bb',preset:'cor-ceiling-panels',scale:.3}};q.interior.doors=[{id:'front',axis:'x',line:d/2,offset:0,width:8,height:5.4,kind:'door'},{id:'back',axis:'x',line:-d/2,offset:0,width:8,height:5.4,kind:'door'}];return q;};
 district='01 · Core plaza';
 ring('Deep turbine well',[0,-26,0],[66,37.9,66],'#394e59',13,'cor-ribs');
 ring('Public annular concourse',[0,12,0],[76,2,76],'#93aca8',22,'cor-floor-plates');
 ring('Inner safety parapet',[0,14,0],[43,1.1,43],'#627d82',2,'metal');
 ring('Outer bronze fascia',[0,11.7,0],[76.6,.5,76.6],'#cfa66b',2);
 add('round','Reactor plinth',[0,-23,0],[18,31,18],'#34444e','cor-panels');
 add('round','Luminous core',[0,8,0],[9,9,9],'#7ce9e6','plain');
 ring('Core containment crown',[0,17,0],[15,1,15],'#dfb87b',12);
 add('dome','Reactor lens',[0,18,0],[13,4,13],'#8be8de','metal');
 for(let i=0;i<8;i++){const a=i*Math.PI/4;const x=Math.sin(a)*27,z=Math.cos(a)*27;const p=box('Radial service rib',[x,-24,z],[2,35,3],'#546d78');p.rotation[1]=a;box('Amber guide light',[Math.sin(a)*36,14.02,Math.cos(a)*36],[1.2,.1,1.2],'#ffc778','plain');}
 deck('Arrival forecourt',[0,14.04,55],32,34);
 stairs('Concourse bridge',[0,14.08,37.4],[0,14.08,38.4],10);
 for(const x of [-12,12]){box('Arrival lantern pedestal',[x,14,64],[1,3,1],'#d1b782','metal');box('Amber beacon',[x,17,64],[.7,1.2,.7],'#ffd288','plain');}
 district='02 · Crown towers';
 for(const sign of [-1,1]){
  const x=sign*52,z=-18,h=sign===-1?87:106;
  add('round','Stepped tower base',[x,-25,z],[32,41,32],'#3e5966','cor-ribs');
  add('round','Crowned residential tower',[x,16,z],[25,h,25],sign===-1?'#9bb7b7':'#c0c4b5','cor-column-windows');
  for(let y=24;y<16+h;y+=12){ring('Bronze floor collar',[x,y,z],[25.8,.5,25.8],'#ba965f',3);}
  add('dome','Ivory tower crown',[x,16+h,z],[26,12,26],'#a6bdb5','cor-plating');
  ring('Crown halo',[x,16+h,z],[28,.8,28],'#d9b57b',6);
  add('antenna','Crown signal mast',[x,27+h,z],[3,12,3],'#c3a76f','metal');
  for(const offset of [-10,10])box('Tower vertical fin',[x+offset,-15,z-8],[1.2,h+36,4],'#cfbb8f','cor-concrete');
  deck('Tower entrance terrace',[x,14,7],28,20);
  stairs('Tower plaza link',[sign*37.05,14.04,7],[sign*38.1,14.04,7],9);
 }
 district='03 · Station terraces';
 deck('Station lower court',[0,14.04,-52],36,29);
 stairs('Station grand steps',[0,14.04,-66.5],[0,18,-78.5],10);
 deck('Station upper court',[0,18,-80.75],38,4.5);
 hall('Transit ticket hall',[0,18,-94],36,22);
 box('Station foundation',[0,-25,-94],[44,42.4,28],'#425967','cor-concrete');
 box('Station roof fascia',[0,25.2,-94],[40,.9,25],'#c7b484','metal');
 box('Cyan arrival sign',[0,24,-82.7],[15,1,.25],'#79eeed','plain');
 for(const x of [-14,14]){box('Station entry pier',[x,18,-81],[1.5,7,2],'#bac6b8','cor-concrete');box('Station lighting strip',[x,18.6,-79.9],[.2,5,.15],'#ffc479','plain');}
 district='04 · Elevated expressway';
 let h={...defaultHighway(),width:13,thickness:.7,railStyle:'jersey',barrierHeight:1,supports:true,nodes:[{point:[76,25,-125],tangent:[-8,0,28]},{point:[72,25,-38],tangent:[8,0,24]},{point:[88,30,35],tangent:[-4,1,25]},{point:[65,32,125],tangent:[-14,0,28]}]};
 h=branchHighway(h,{path:'main',segment:2,t:.25,side:-1},[23,27,82],7,'harbor-exit');
 const branch=h.branches[0];branch.nodes[1].tangent=[-20,0,0];branch.nodes.push({point:[-65,27,78],tangent:[-28,0,-5]});syncHighwayJunctions(h);
 const road=add('highway','Skyway and harbor exit',[0,0,0],[1,1,1],'#ffffff','highway-scifi-lanes');road.highway=h;road.highway.componentFinishes={road:{color:'#ffffff',surface:{preset:'highway-scifi-lanes',scale:.5}},underside:{color:'#4c6572',surface:{preset:'cor-ribs',scale:.3}},barriers:{color:'#b4c4ba',surface:{preset:'cor-concrete',scale:.4}},supports:{color:'#516a77',surface:{preset:'cor-panels',scale:.3}}};
 district='05 · Harbor platforms';
 for(const [x,z,y] of [[-70,35,20],[-88,4,14]]){
  box('Harbor pier foundation',[x,-25,z],[27,y+24,23],'#3d5664','cor-ribs');deck('Rounded landing apron',[x,y,z],29,25,'#829c9b','circle');
  add('round','Landing target',[x,y+.03,z],[12,.08,12],'#c8b079','cor-landing-pad');
 }
 stairs('West terrace ascent',[-52,14,17],[-52,20,34],6);
 stairs('Harbor boarding bridge',[-52,20.04,34],[-55.7,20.04,34],8);
 district='06 · City backdrop';
 const skyline=[[-105,-83,78,25],[-78,-116,123,22],[-34,-142,91,28],[13,-146,142,23],[54,-134,89,24],[110,-98,117,24],[126,-42,79,24],[-118,-24,58,21]];
 skyline.forEach(([x,z,height,w],i)=>{add(i%3===0?'hex':'round','Distant city tower',[x,-25,z],[w,height,w],i%2?'#637f89':'#799196',i%2?'cor-windows':'cor-slots');add('dome','Backdrop crown',[x,height-25,z],[w,7,w],'#819b9d','cor-plating');for(let y=height-40;y>5;y-=24)ring('Backdrop belt',[x,y,z],[w+1,.5,w+1],'#ac9569',3);});
 district='07 · Public furniture';
 for(const x of [-9,9])for(const z of [47,56]){box('Planter base',[x,14,z],[2.8,.6,3.5],'#626f65','stone');add('orb','Sculpted canopy',[x,15,z],[2.7,2.2,2.7],'#607e63','plain');}
 add('character-reference','Human scale · arrival court',[0,14.05,59]);
 return prepareExampleCopies({format:'open-building-studio',version:1,name:'Aurelia Gate · reactor harbor',parts},'aurelia-copy');
}
