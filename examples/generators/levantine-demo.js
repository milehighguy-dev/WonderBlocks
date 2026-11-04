import {prepareExampleCopies} from '../../src/editor/example-copies.js';
import * as T from '../../vendor/three.module.js';
import {makePart,validateProject} from '../../src/core/model.js';
import {defaultInterior} from '../../src/interiors/interior.js';
import {applyBuildingStyle} from '../../src/interiors/building-style.js';
import {MOS_EISLEY_PRESETS} from '../../src/parts/mos-eisley-presets.js';
import {defaultFlora,addFloraAsset,floraAttachmentFrame} from '../../src/flora/flora.js';
import {preparePatternScaling} from '../../src/materials/pattern-scaling.js';

// A ground-level lane: all scenery, timber and plants also exist in the editor.
export function levantine(){
 const parts=[],C={plaster:'#d6bf98',pale:'#e3d1ad',stone:'#aa9877',wood:'#94764f',dark:'#3c3830',clay:'#ae7554'};
 let group='Stone lane';
 const add=(type,name,position,scale=[1,1,1],color=C.plaster,preset='plain',rotation=[0,0,0])=>{
  const p=makePart(type,{id:'levantine-'+parts.length,name,position,scale,color,rotation,surface:{preset,scale:1},assemblyId:'levantine-'+group.toLowerCase().replaceAll(' ','-'),assemblyName:group});parts.push(p);return p;
 };
 const box=(name,p,s,c=C.plaster,finish='plain')=>add('block',name,p,s,c,finish);
 const stock=(type,name,p,s=[1,1,1],angle=0)=>{
  const part=add(type,name,p,s,'#ffffff','plain',[0,angle,0]);delete part.surface;part.interiorProp=true;return part;
 };
 const mosBlock=(name,p,s,finish='mos-stucco')=>{
  const part=box(name,p,s,'#ffffff',finish);part.surface.scale=.25;
  part.parameters=structuredClone(MOS_EISLEY_PRESETS[0].preset.parameters);return part;
 };
 const beam=(name,a,b,width=.12,depth=width)=>{
  const delta=new T.Vector3(...b).sub(new T.Vector3(...a)),r=new T.Euler().setFromQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.clone().normalize()));
  return add('block',name,a,[width,delta.length(),depth],C.wood,'forest-timber',[r.x,r.y,r.z]);
 };
 const pot=(x,z,size=.5)=>{
  add('orb','Unglazed earthenware jar',[x,-.03,z],[size*.85,size*.9,size*.85],C.clay,'plain');
  add('ring-body','Thick clay jar lip',[x,size*.91,z],[size*.52,Math.max(.05,size*.13),size*.52],C.clay,'plain');
 };
 box('Old limestone paving',[0,-.18,0],[22,.18,38],C.stone,'stone');
 box('Long worn flagstone lane',[0,.004,-.5],[4.4,.06,30], '#b8ad91','stone');
 for(const side of [-1,1])box('Shallow drainage channel',[side*1.87,.067,-1],[.16,.05,27],'#766f57','stone');
 // Editable Mos Eisley rooms with stock facades around real door openings.
 const house=(side,z,w,d,h,index)=>{
  group=(side<0?'West':'East')+' house '+index;
  const x=side*(2.65+w/2),p=add('interior','Mos Eisley courtyard house',[x,0,z],[1,1,1],'#ffffff'),plan=defaultInterior();
  plan.height=h;plan.thickness=.32;plan.rooms=[{id:p.id+'-room',x:-w/2,z:-d/2,w,d}];
  applyBuildingStyle(plan,'mos-eisley');plan.finishes.outside.preset=index%2?'mos-stucco':'mos-worn-stucco';
  plan.buildingStyle.baseHeight=.45;plan.buildingStyle.baseProjection=.22;
  plan.doors=[{id:p.id+'-door',axis:'z',line:-side*w/2,offset:-.45,width:1.6,height:2.7,kind:'door'},
   {id:p.id+'-window',axis:'z',line:-side*w/2,offset:1.75,width:.65,height:.9,sill:2.6,kind:'window'}];p.interior=plan;
  const broad=index%2,depth=broad?.16:.26,rear=(broad?-2.024449:-1.062766)*depth;
  stock(broad?'mos-entry-b-open':'mos-entry-a-open','Open recessed house entry',[side*(2.49+rear),0,z-.45],broad?[.72,.9,depth]:[.78,.95,depth],-side*Math.PI/2);
  for(const end of [-1,1])stock('mos-buttress','Tapered facade buttress',[side*2.48,0,z+end*d*.4],[.55,h/4,.35],-side*Math.PI/2);
  stock('mos-vent','Sheet-metal roof vent',[x+side*.95,h+.02,z-1.65],[1,1,1],index*Math.PI/2);
  box('Shuttered upper window',[side*2.28,2.62,z+1.75],[.12,.85,.65],'#657366','forest-timber');
  for(const edge of [-1,1])box('Shutter cross brace',[side*2.19,2.72+edge*.22,z+1.75],[.08,.09,.7],C.wood,'forest-timber');
  if(index%2===1)stock('mos-dome','Faceted plaster roof dome',[x,h+.02,z+.45],[.52,.36,.52]);
  if(index===2){mosBlock('Small rooftop store',[x+side*.45,h,-.7+z],[2.4,1.8,2.8],'mos-worn-stucco');stock('mos-dome','Store roof dome',[x+side*.45,h+1.82,z-.7],[.34,.21,.34]);}
  if(index===1){pot(side*2.02,z+1.1,.5);pot(side*2.1,z+1.85,.35);}
 };
 for(const side of [-1,1])for(let i=0;i<4;i++)house(side,-10.8+i*7.15,4.2+(i%2)*.7,6.6,4.3+(i%3)*.65,i);
 group='Timber pergola';
 for(let i=0;i<9;i++){
  const z=-13+i*3.15;
  for(const side of [-1,1]){
   const x=side*1.73;
   box('Stone post shoe',[x,.07,z],[.37,.2,.38],C.stone,'stone');
   beam('Upright hand-hewn post',[x,.22,z],[x+side*.035,3.13,z],.15,.18);
   beam('Pegged diagonal knee brace',[x,2.35,z],[x-side*.62,3.12,z],.1);
   beam('Longitudinal knee brace',[x,2.38,z],[x,3.1,z+.68],.09);
  }
  beam('Main pergola crossbeam',[-2,3.12,z],[2,3.12,z],.18,.16);
 }
 for(const side of [-1,1])beam('Continuous timber runner',[side*1.74,3.08,-13.45],[side*1.74,3.08,12.65],.16);
 for(let i=0;i<34;i++)beam('Slender overhead vine lath',[-1.98,3.31,-13.3+i*.78],[1.98,3.31,-13.3+i*.78],.065,.075);
 for(const x of [-1.1,-.35,.4,1.12])beam('Long lattice pole',[x,3.36,-13.5],[x,3.36,12.7],.055);
 // Vines are editable plants assembled from existing stems and foliage patches.
 // Positions are in each plant's origin frame, with attachment transforms cancelled
 // before applying the authored pergola layout. No new tree base mesh is needed.
 group='Living grape canopy';
 for(let bay=0;bay<8;bay++)for(const side of [-1,1]){
  const z=-12.7+bay*3.15,origin=[side*1.75,0,z],f=defaultFlora();f.detail='swbf2';f.colors={bark:'#62543c',leaf:bay%3?'#f5f8da':'#ffffff'};
  const stem=addFloraAsset(f,f.branches[0].id,'flora-basic-branch');
  stem.points=[[0,0,0],[-side*.07,.8,.12],[side*.09,1.6,-.1],[-side*.04,2.45,.08],[-side*.2,3.28,0],[-side*.8,3.44,.25],[-side*1.6,3.48,.45],[-side*3.35,3.48,.3]];
  stem.radii=[.07,.06,.052,.046,.039,.032,.025,.015];
  const patch=(position,seed,settings={})=>{
   const o=addFloraAsset(f,stem.id,'yavin-fine-leaves',0),inv=floraAttachmentFrame(f,o).invert(),q=new T.Quaternion(),s=new T.Vector3(),t=new T.Vector3();inv.decompose(t,q,s);
   o.offset=new T.Vector3(...position).applyMatrix4(inv).toArray();o.rotation=new T.Euler().setFromQuaternion(q).toArray().slice(0,3);o.scale=s.toArray();
   Object.assign(o.billboard,{count:38,radius:.7,height:.2,minSize:.7,maxSize:1.05,heightScale:.7,darknessMin:.85,darknessMax:1,seed,...settings});return o;
  };
  for(let along=0;along<4;along++)for(let across=0;across<3;across++)patch([-side*(.32+across*.6),3.47+.08*Math.sin(bay+across),along*.78-.35],bay*117+along*9+across+(side+1)*727);
  // Looser skirts close the tunnel sides without blocking headroom in its middle.
  for(let j=0;j<7;j++)patch([-.12*side*Math.sin(j),3.08-j*.12,.5+j*.09],3000+bay*41+j+(side+1)*99,{count:5,radius:.13,height:.1,minSize:.28,maxSize:.48,heightScale:.85});
  parts.push(makePart('flora',{id:'levantine-'+parts.length,name:'Grape vine '+(side<0?'west ':'east ')+(bay+1),position:origin,flora:f,assemblyId:'levantine-vines',assemblyName:group}));
 }
 group='End courtyard';
 box('Sunlit courtyard paving',[0,.01,16.3],[11,.1,8.3],'#c9b791','stone');
 for(const side of [-1,1]){
  box('Courtyard plaster enclosure',[side*5.3,0,16.2],[.45,2.1,8.5],'#ffffff','mos-worn-stucco');
  box('Built-in plaster sitting bench',[side*4.8,.02,16.1],[.72,.5,5.5],'#ffffff','mos-stucco');
  stock('mos-canopy','Courtyard cloth shade',[side*3.9,0,16.2],[.55,.85,.48],-side*Math.PI/2);
  pot(side*3.8,13.7,.62);pot(side*4,14.7,.4);
 }
 for(const side of [-1,1])box('Courtyard rear wall',[side*3.5,0,20.3],[4,2.3,.5],'#ffffff','mos-worn-stucco');
 stock('mos-arch','Courtyard street arch',[0,0,20.3],[.8,.67,.35]);
 add('round','Low courtyard cistern',[1.7,0,16.6],[1.65,.55,1.65],C.stone,'stone');
 add('ring-body','Cistern stone rim',[1.7,.5,16.6],[1.8,.22,1.8],C.pale,'stone');
 add('round','Still water in cistern',[1.7,.58,16.6],[1.35,.05,1.35],'#54796e','plain');
 group='Passage furnishings';
 for(const [x,z] of [[-2.1,-11],[2.05,-5.7],[-2.1,3.9],[2.05,9.4]]){pot(x,z,.47);pot(x*.98,z+.57,.29);}
 box('Street-side stone bench',[-2.13,.03,-7.1],[.5,.47,1.65],C.stone,'stone');
 box('Low olivewood produce table',[2.02,.7,2.8],[.64,.12,1.6],C.wood,'forest-timber');
 for(const z of [2.2,3.4])box('Table trestle',[2.02,.05,z],[.45,.65,.12],C.wood,'forest-timber');
 for(const p of parts.filter(p=>p.flora)){
  const nodes=[...p.flora.branches,...p.flora.organs],ids=new Map(nodes.map((n,i)=>[n.id,p.id+'-plant-'+i]));
  for(const n of nodes)for(const key of ['id','parent','branch','parentOrgan'])if(ids.has(n[key]))n[key]=ids.get(n[key]);
 }
 return prepareExampleCopies(validateProject(preparePatternScaling(JSON.parse(JSON.stringify({format:'open-building-studio',version:1,name:'Levantine vine passage',parts})))),'levantine-copy');
}
