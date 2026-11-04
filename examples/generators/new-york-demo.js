import {prepareExampleCopies} from '../../src/editor/example-copies.js';
import {resizeScene,facadeMetres} from '../../src/walk/human-scale.js';
import {makePart} from '../../src/core/model.js';
import {preparePatternScaling} from '../../src/materials/pattern-scaling.js';
// Stylized Midtown block, not a measured reconstruction of neighboring properties.
export function newYorkBlock(){
 const parts=[];
 const add=(type,name,x,y,z,sx=1,sy=1,sz=1,color,angle=0)=>{const p=makePart(type,{name,position:[x,y,z],scale:[sx,sy,sz],rotation:[0,angle,0],...(color?{color}:{})});parts.push(p);return p;};
 // Building masses are the existing cube; facade styles are surface presets.
 const facade=(preset,name,x,y,z,w,h,d,color='#d4c7ae')=>{
  const p=add('block',name,x,y,z,w*2,h,d*2,color);p.surface={preset,scale:2};
  add('slab',name+' • flat roof finish',x,y+h-.01,z,w*2,.0666666667,d*2,'#354249');return p;
 };
 const shop=(name,x,y,z,sx,sy,angle)=>{
  const p=add('block',name,x,y,z,2*sx,sy,.12,'#a8c4c4',angle);
  p.surface={preset:'ny-storefront',scale:1};p.pattern={mode:'stretch',texture:[1/(2*sx),1/sy,1]};return p;
 };
 const group=start=>{const id=crypto.randomUUID();parts.slice(start).forEach(p=>p.assemblyId=id);};
 add('slab','Midtown • street bed',0,0,0,34,.1333333333,24,'#41484c');
 add('slab','Fifth Avenue block • sidewalk',0,.045,0,27,.4,16.4,'#b4b3a8');
 // Empire State's broad podium, long vertical shaft, upper setbacks and mast.
 const start=parts.length,x=6,z=0,ground=.165;
 for(const [name,y,w,h,d] of [['Retail podium',0,4.8,1.8,5.9],['Lower setback',1.8,4.3,2.4,5.35],['Middle shoulders',4.2,3.6,2.7,4.7],['Tower shaft',6.9,2.65,16,3.5],['Upper setback',22.9,2.35,1.7,3.15],['Executive floors',24.6,1.95,1.5,2.75],['Observatory',26.1,1.6,.7,2.25]]){
  facade('ny-deco','Empire State • '+name,x,ground+y,z,w,h,d);
  add('ny-cornice','Empire State • '+name+' coping',x,ground+y+h,z,w,.35,d);
 }
 add('ny-parapet','Empire State • observation terrace',x,ground+26.8,z,1.6,.9,2.25);
 add('ny-mast','Empire State • mooring mast',x,ground+26.8,z,1.95,2.5,1.95);
 add('ny-spire','Empire State • antenna',x,ground+31.85,z,1,2.4,1);
 // Vertical limestone ribs reinforce the signature long shaft silhouette.
 for(const side of [-1,1])for(const dx of [-1.6,0,1.6])add('block','Empire State • limestone pier',x+dx,ground+6.9,side*3.52,.10,16,.10,'#d6cbb4');
 for(const side of [-1,1])for(const dz of [-2.3,-.8,.8,2.3])add('block','Empire State • side pier',x+side*2.67,ground+6.9,dz,.1,16,.1,'#d6cbb4');
 for(const zz of [-4,-2,0,2,4])shop('Empire State • Fifth Avenue shops',x+4.81,ground,zz,.92,1.35,Math.PI/2);
 add('ny-entry','Empire State • Fifth Avenue entrance',x+4.94,ground,0,1,1.05,1,undefined,Math.PI/2);group(start);
 // Closely packed loft and commercial buildings occupy the west of the block.
 const neighbors=[[-10,-4.4,2,2.3,4.8,'#b18b73'],[-5.5,-4.4,2.2,2.3,7.4,'#b6b19a'],[-.9,-4.4,2.1,2.3,5.9,'#906c59'],[-10,2.9,2,3.1,6.6,'#a77360'],[-5.5,2.9,2.2,3.1,4.5,'#c4b6a0'],[-.9,2.9,2.1,3.1,8.8,'#aea995']];
 neighbors.forEach(([bx,bz,w,d,h,color],i)=>{const begin=parts.length,label='West block '+(i+1);
  facade(i===5?'ny-deco':'ny-brick',label+' • loft',bx,ground,bz,w,h,d,color);
  add('ny-cornice',label+' • cornice',bx,ground+h,bz,w,1,d);
  add('ny-parapet',label+' • parapet',bx,ground+h+.17,bz,w,1,d);
  add('ny-hvac',label+' • rooftop plant',bx+.6,ground+h+.18,bz,.75,.75,.75);
  if(i%2===0)add('ny-water-tank',label+' • water tower',bx-.6,ground+h+.18,bz-.6,.8,.8,.8);
  const face=bz<0?-1:1,front=bz+face*(d+.025),angle=face<0?Math.PI:0;
  for(const dx of [-.95,.95]){shop(label+' • shopfront',bx+dx,ground,front,.9,1,angle);add('ny-awning',label+' • awning',bx+dx,ground+1,front,.9,1,1,i%2?'#635c52':'#426a60',angle);}
  if(i%2===0)for(let y=1.5;y<h-.5;y+=1.2)add('ny-fire-escape',label+' • fire escape',bx,ground+y,front,.65,1,.8,undefined,angle);
  group(begin);
 });
 for(const side of [-1,1]){
  for(const bx of [-12,-6,0,6,12])add('ny-lamp','Midtown • street lamp',bx,.165,side*7.8,1,1,1,undefined,side>0?Math.PI:0);
  for(const bx of [-11,11])add('ny-crosswalk','Midtown • pedestrian crossing',bx,.052,side*10.1,1.3,1,1.65);
  for(const bx of [-9,0,9])add('ny-taxi','Midtown • yellow taxi',bx,.045,side*9.2,1,1,1,undefined,side*Math.PI/2);
 }
 resizeScene(parts,2.5,2.5);facadeMetres(parts);for(const p of parts)if(p.type==='ny-parapet')p.scale[1]=5.5;
 return prepareExampleCopies(preparePatternScaling({format:'open-building-studio',version:1,name:'Midtown • Empire State Block',parts}),'empire-state-copy');
}
