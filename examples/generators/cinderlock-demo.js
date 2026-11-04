import {prepareExampleCopies} from '../../src/editor/example-copies.js';
import {makePart,validateProject} from '../../src/core/model.js';
import {defaultInterior} from '../../src/interiors/interior.js';
import {preparePatternScaling} from '../../src/materials/pattern-scaling.js';

// Infantry blockout first: 96 × 72 m, protected three-exit spawns, three terraces,
// separate grade connections, and low control booths with two stair approaches.
// Objectives are editable scene markers, not mission-script command posts.
export function cinderlock(){
 const parts=[],C={wall:'#a69c87',floor:'#777b72',dark:'#35484b',rust:'#a75435',metal:'#657d7d',cyan:'#67cbd4',amber:'#e3b45e',light:'#e7dfc6'};
 let group='01 · Ground and boundary';
 const add=(type,name,position,scale=[1,1,1],color=C.wall,preset='plain',angle=0)=>{
  const p=makePart(type,{id:'cinderlock-'+parts.length,name,position,scale,rotation:[0,angle,0],color,surface:{preset,scale:.5},interiorProp:true,assemblyId:'cinderlock-'+group,assemblyName:group});parts.push(p);return p;
 };
 const box=(name,p,s,c=C.wall,surface='cor-concrete')=>add('block',name,p,s,c,surface);
 const room=(name,x,y,z,w,d,height=4.2)=>{
  const p=add('interior',name,[x,y,z]);delete p.interiorProp;
  const plan=defaultInterior();plan.height=height;plan.thickness=.3;plan.rooms=[{id:p.id+'-room',x:-w/2,z:-d/2,w,d}];
  plan.finishes={floor:{color:C.floor,preset:'cor-floor-plates',scale:.5},wall:{color:C.light,preset:'cor-interior-panel',scale:.5},outside:{color:C.wall,preset:'cor-concrete',scale:.5},ceiling:{color:C.dark,preset:'cor-ceiling-panels',scale:.5},roof:{color:C.dark,preset:'metal',scale:.5}};
  p.interior=plan;return p;
 };
 const opening=(p,axis,line,at,width=3.2,kind='door',height=3.2,sill=1)=>{
  p.interior.doors.push({id:p.id+'-opening-'+p.interior.doors.length,axis,line:line-p.position[axis==='x'?2:0],offset:at-p.position[axis==='x'?0:2],width,height,kind,...(kind==='window'?{sill}:{})});
  if(kind==='door')box('Door threshold · continuous footing',[axis==='x'?at:line,p.position[1]-.15,axis==='x'?line:at],axis==='x'?[width,.14,.7]:[.7,.14,width],C.metal,'metal');
 };
 const cover=(name,x,z,w,d,h=1.1,c=C.metal)=>box(name,[x,0,z],[w,h,d],c,'cor-panels');
 const marker=(name,x,z,c)=>{box(name+' · capture console',[x,0,z],[1.2,1.1,.8],C.dark,'cor-panels');box(name+' · illuminated display',[x,1.1,z],[1.08,.12,.7],c,'plain');add('antenna',name+' · locator mast',[x+.85,0,z],[.45,2,.45],c,'metal');};
 const roof=(name,x,y,z,w,d,c=C.dark)=>add('roof',name,[x,y,z],[w,3,d],c,'metal');

 for(const [name,z,bottom,height,depth] of [['Foundry street',0,-.8,.8,28],['Upper cooling terrace',-25,-3.2,5.6,22],['Sunken freight yard',25,-3.2,.8,22]]){
  const ground=box(name+' · solid ground',[0,bottom,z],[98,height,depth],C.floor,'cor-concrete');delete ground.interiorProp;
 }
 for(const x of [-49,49])box('Arena boundary · side retaining wall',[x,-2.4,0],[1.2,8.4,74],C.dark,'cor-concrete');
 for(const z of [-37,37])box('Arena boundary · end retaining wall',[0,-2.4,z],[99.2,8.4,1.2],C.dark,'cor-concrete');

 for(const sign of [-1,1]){
  const x=sign*42,team=sign<0?C.cyan:C.amber;
  group=sign<0?'02 · West team workshop':'03 · East team workshop';
  const base=room(sign<0?'WEST START · sheltered workshop':'EAST START · sheltered workshop',x,0,0,12,16);
  opening(base,'z',sign*36,0,3.2);opening(base,'x',-8,x,3.2);opening(base,'x',8,x,3.2);
  cover('Spawn exit baffle · prevents base-to-base fire',sign*32,0,1.4,7,3,C.dark);
  cover('Spawn north exit shoulder',sign*37,-11,4,1.2,2,C.dark);
  cover('Spawn south exit shoulder',sign*37,11,4,1.2,2,C.dark);
  box('Team workshop · recognition band',[sign*35.8,3.5,0],[.16,.4,14],team,'plain');
  marker(sign<0?'WEST · home console':'EAST · home console',x+sign*3,5,team);
  // The exits lead to local choices rather than a single exposed corridor.
  for(const z of [-6,6])box('Workshop bench',[x+sign*3,0,z],[2,1,1],C.rust,'wood');
  group=sign<0?'D · West workshop roof':'D · East workshop roof';roof('Team workshop roof',x,4.44,0,13.5,18,team);
 }

 group='04 · Foundry hall';
 const hall=room('FOUNDRY · contested central hall',0,0,0,24,24,7.4);
 for(const x of [-12,12])for(const z of [-6,6])opening(hall,'z',x,z,4, 'door',2.8);
 for(const z of [-12,12])for(const x of [-6,6])opening(hall,'x',z,x,4,'door',2.8);
 cover('Foundry core · blocks the full center sightline',0,0,6,5,2.8,C.dark);
 cover('Core west hard cover',-1.7,4.2,2.5,1.2,1.05,C.rust);
 cover('Core east hard cover',1.7,-4.2,2.5,1.2,1.05,C.rust);
 marker('B · FOUNDRY CONTROL',0,7.8,C.amber);
 // The control booths are deliberately only 2.4 m up. Each has two full stairs,
 // and a single inward-facing window; neither surveys the other two lanes.
 for(const sign of [-1,1]){
  group=sign<0?'05 · West control booth':'06 · East control booth';const x=sign*8;
  const booth=room(sign<0?'West control booth · two exits':'East control booth · two exits',x,2.4,0,5,6,3);
  for(const z of [-3,3])opening(booth,'x',z,x,2.4,'door',2.6);
  opening(booth,'z',x-sign*2.5,0,3.8,'window',1.5,.65);
  for(const z of [-1.6,1.6])box('Booth exit baffle · limits outside sightlines',[x,2.4,z],[2.4,2.2,.2],C.dark,'cor-interior-panel');
  for(const side of [-1,1]){
   const stairs=add('stair-route',(sign<0?'West':'East')+' booth · '+(side<0?'north':'south')+' stairs',[x,0,side*9.8],[1,1,1],C.metal,'cor-floor-plates',side<0?0:Math.PI);
   stairs.route={width:2.4,thickness:.3,gap:.2,segments:[{kind:'stairs',run:6.8,rise:2.4,steps:15,turn:'straight',fillToGround:true,railing:{style:'posts',height:1.1,color:C.dark}}],groundHeight:0};
  }
  box('Booth footing · no space to hide underneath',[x,0,0],[5,2.25,6],C.dark,'cor-concrete');
 }

 // The two side lanes alternate enclosed rooms and contested open courts.
 // The 5 m alleys at x=±15 connect all three lanes at the center building corners.
 for(const north of [true,false])for(const sign of [-1,1]){
  const x=sign*24,z=north?-23:23;
  group=(north?'07 · Cooling works':'08 · Freight warehouses')+(sign<0?' west':' east');
  const p=room((north?'Cooling house':'Freight warehouse')+(sign<0?' · west':' · east'),x,0,z,14,14,north?4.8:4.2);
  for(const side of [-1,1])opening(p,'z',x+side*7,z,3.4);
  opening(p,'x',z+(north?7:-7),x,3.4);
  opening(p,'x',z+(north?-7:7),x,2.6);
  // Offset room cover breaks a shot straight through the opposing doors.
  cover('Interior cover · staggered ' +(north?'pump cabinet':'pallet rack'),x,z,2.6,4,2.1,north?C.metal:C.rust);
  cover('Interior low cover',x-sign*3.8,z+(north?3:-3),1.2,2.2,1,C.rust);
  group=north?'D · Cooling house roofs':'D · Warehouse roofs';roof(north?'Cooling shed roof':'Freight shed roof',x,north?5.04:4.44,z,15.8,16,north?C.metal:C.rust);
 }

 group='09 · Cooling court';
 for(const x of [-7,7]){
  cover('Cooling turbine · tall line-of-sight blocker',x,-26.5,6,7,2.8,C.metal);
  cover('Turbine approach low cover',Math.sign(x)*10.8,-18.2,2.2,1.4,1.05,C.dark);
 }
 cover('North service crate · cuts the rear lane',0,-29,3,3,2.2,C.dark);
 marker('A · COOLANT CONTROL',0,-18.5,C.cyan);

 group='10 · Freight yard';
 for(const x of [-10,10])cover('Freight container · split loading approach',x,28,4,10,2.7,C.rust);
 cover('Freight entry low cover · crossfire break',0,20.5,3,1.4,1.05,C.dark);
 marker('C · FREIGHT CONTROL',0,28,C.amber);
 for(const x of [-15,15])cover('Freight outer lane cover',x,30.5,2,3,1.05,C.metal);

 group='11 · West approach';
 cover('West midcourt tall cover',-26,-4,4,3,2.2,C.dark);
 cover('West midcourt low cover',-21,6,3,5,1.05,C.rust);
 cover('West hall entrance shoulder',-16,-5,1.5,4,2.5,C.metal);
 group='12 · East approach';
 cover('East midcourt tall cover',26,4,4,3,2.2,C.dark);
 cover('East midcourt low cover',21,-6,3,5,1.05,C.rust);
 cover('East hall entrance shoulder',16,5,1.5,4,2.5,C.metal);

 // Dressing follows the blockout. Optional D groups can be hidden in the preview
 // while retaining every wall, solid cover object, doorway, stair and objective.
 group='D · Foundry envelope';roof('Foundry main roof',0,7.64,0,26,26,C.dark);
 for(const x of [-12.2,12.2])for(const z of [-11.2,0,11.2])box('Foundry exterior pilaster',[x,0,z],[.45,7.5,.65],C.dark,'metal');
 for(const z of [-12.2,12.2])for(const x of [-10,0,10])box('Foundry front pilaster',[x,0,z],[.65,7.5,.45],C.dark,'metal');
 for(const z of [-12.25,12.25]){box('Foundry amber identification stripe',[0,4.1,z],[24,.5,.12],C.rust,'metal');box('Foundry light strip',[0,6.6,z],[19,.16,.14],C.amber,'plain');}
 group='D · Furnace machinery';
 for(const x of [-1.8,1.8]){add('round','Furnace pressure drum',[x,2.8,0],[2.2,2.1,2.2],C.metal,'cor-ribs');add('dome','Furnace copper cap',[x,4.9,0],[2.4,1,2.4],C.rust,'metal');}
 for(const x of [-9,-4,1,6,11]){add('round','Exhaust chimney',[x,0,-34],[1.8,12+(x+9)*.3,1.8],C.dark,'cor-ribs');add('ring','Exhaust copper collar',[x,10+(x+9)*.3,-34],[2,1,2],C.rust,'metal');}
 group='D · Cooling machinery';
 for(const x of [-7,7]){add('round','Turbine top fan',[x,2.8,-26.5],[4,.45,4],C.dark,'metal');add('gear','Turbine rotor',[x,3.26,-26.5],[2.5,.5,2.5],C.metal,'metal');box('Cooling status light',[x,2.85,-22.95],[2,.16,.15],C.cyan,'plain');}
 group='D · Freight gantry';
 for(const x of [-13,13])box('Gantry leg · outside the central lane',[x,0,24],[.5,7,.6],C.dark,'metal');
 box('Gantry overhead girder',[0,7,24],[27,.6,1.2],C.rust,'metal');
 box('Gantry suspended hoist',[0,5.8,24],[1.2,1.2,1.3],C.dark,'metal');
 for(const x of [-10,10])for(const dx of [-1.8,1.8])box('Container corner casting',[x+dx,0,28],[.15,2.85,10.1],C.dark,'metal');
 group='D · Wayfinding and services';
 for(const x of [-15,15])for(const z of [-20.5,20.5]){
  add('slab','Cross-lane floor stripe',[x,.005,z],[4.2,.05,.22],z<0?C.cyan:C.amber,'plain');
  box('Alley lamp pole',[x+(x<0?-.6:.6),0,z+(z<0?-.8:.8)],[.12,3.5,.12],C.dark,'metal');
  box('Alley light strip',[x+(x<0?-.6:.6),3.5,z+(z<0?-.8:.8)],[.6,.25,.35],C.light,'plain');
 }
 for(const x of [-34,34])for(const z of [-23,23])add('slab','Team-side lane entry stripe',[x,.005,z],[.24,.05,3],x<0?C.cyan:C.amber,'plain');
 for(const z of [-36.2,36.2])for(const x of [-40,-16,16,40])box('Perimeter reinforcement',[x,-2.4,z],[1,8.6,1.2],C.metal,'cor-ribs');
 // A restrained skyline puts an industrial district behind the playable boundary.
 group='D · Offsite factory skyline';
 for(const [x,z,w,h,d] of [[-57,-20,12,17,18],[57,19,12,19,18],[-27,-46,22,14,12],[28,46,24,11,12]]){
  box('Offsite factory mass',[x,0,z],[w,h,d],C.dark,'cor-slots');roof('Offsite factory roof',x,h+.04,z,w+1,d+1,C.rust);
 }
 group='13 · Player reference';add('character-reference','START HERE · west workshop',[-42,0,0]);
 // Each lane is a solid terrace. There is no usable corridor underneath another
 // path. Independent ramps/stairs carve only their own retaining-wall channel.
 for(const p of parts)if(p.assemblyName!=='01 · Ground and boundary'&&p.name!=='Perimeter reinforcement'){
  if(p.position[2]<=-16)p.position[1]+=2.4;else if(p.position[2]>=16)p.position[1]-=2.4;
 }
 group='14 · Grade connections';
 const grade=(name,x,z,run,rise,width,kind,angle)=>{
  const p=add('stair-route',name,[x,0,z],[1,1,1],C.metal,'cor-floor-plates',angle);
  p.route={width,thickness:.3,gap:.2,groundHeight:-3.2,cutThroughSolids:true,cutHeight:3,segments:[{kind,run,rise,steps:kind==='stairs'?15:1,turn:'straight',fillToGround:true,railing:{style:'posts',height:1.1,color:C.dark}}]};return p;
 };
 for(const x of [-42,42]){grade('Team cooling ramp · upper terrace',x,-8,8,2.4,3.2,'ramp',Math.PI);grade('Team freight ramp · sunken yard',x,8,8,-2.4,3.2,'ramp',0);}
 for(const x of [-14.4,14.4]){grade('Cross-lane cooling stairs',x,-8,10,2.4,3.2,'stairs',Math.PI);grade('Cross-lane freight stairs',x,8,10,-2.4,3.2,'stairs',0);}
 for(const x of [-6,6]){grade('Foundry north entry stairs',x,-12,8,2.4,3,'stairs',Math.PI);grade('Foundry south entry stairs',x,12,8,-2.4,3,'stairs',0);}
 group='15 · Terrace retaining guards';
 const holes=[[-44,-40],[-16.4,-12.4],[-8,-4],[4,8],[12.4,16.4],[40,44]],spans=[];let start=-48;
 for(const [a,b] of holes){spans.push([start,a]);start=b;}spans.push([start,48]);
 for(const [z,y] of [[-14,2.4],[14,0]])for(const [a,b] of spans)box('Terrace edge guard · separates grades',[(a+b)/2,y,z],[b-a,1.1,.25],C.dark,'metal');
 // Freight sits at world ground height so the editor grid cannot hide the yard.
 for(const p of parts){p.position[1]+=2.4;if(p.route?.groundHeight!==undefined)p.route.groundHeight+=2.4;}
 return prepareExampleCopies(validateProject(preparePatternScaling({format:'open-building-studio',version:1,name:'Cinderlock · Foundry Crossfire',parts})),'cinderlock-copy');
}
