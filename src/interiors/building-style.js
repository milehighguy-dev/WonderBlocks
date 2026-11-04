import {profileBuildingBase} from './wall-base-profile.js';
import {buildingContours,offsetContour} from './building-contours.js';
import * as T from '../../vendor/three.module.js';
import {inside,area} from './polygon-plan.js';
import {roofFootprints} from './interior-roof.js';
import {prismVolume} from '../collision/structural-volumes.js';
import {applySurface} from '../materials/surfaces.js';

export const MOS_BUILDING_STYLE={type:'mos-eisley',rimHeight:.4,rimThickness:.3,baseHeight:.55,baseProjection:.3};
const finishes={
 default:{floor:{color:'#a8a18b',preset:'tile',scale:1},wall:{color:'#d9d4bd',preset:'stone',scale:1},outside:{color:'#b6bcae',preset:'plain',scale:1},ceiling:{color:'#eee8d8',preset:'plain',scale:1},roof:{color:'#eee8d8',preset:'plain',scale:1}},
 'mos-eisley':Object.fromEntries(Object.entries({floor:['mos-sand-floor',.25],wall:['mos-interior-plaster',.3],outside:['mos-worn-stucco',.25],ceiling:['mos-interior-plaster',.3],roof:['mos-stucco',.25]}).map(([role,[preset,scale]])=>[role,{color:'#ffffff',preset,scale}]))
};
export function validateBuildingStyle(s){
 if(!s||s.type!=='mos-eisley'||Object.keys(s).some(k=>!Object.hasOwn(MOS_BUILDING_STYLE,k))||!['rimHeight','rimThickness','baseHeight','baseProjection'].every(k=>Number.isFinite(s[k])&&s[k]>= (k==='rimThickness'?.05:0)&&s[k]<=(k==='rimThickness'?1:k==='baseProjection'?1.5:2)))throw Error('Invalid building style dimensions.');
 return s;
}
// A deliberate style change paints every floor; later finish edits stay independent.
export function applyBuildingStyle(plan,type){
 if(!Object.hasOwn(finishes,type))throw Error('Unknown building style.');
 for(const p of [plan,...(plan.storeys||[]).map(l=>l.plan)])p.finishes=structuredClone(finishes[type]);
 if(type==='default')delete plan.buildingStyle;
 else plan.buildingStyle={...MOS_BUILDING_STYLE};
 if(plan.shell){delete plan.shell.parapet;delete plan.shell.baseSlope;}
 return plan;
}
const mix=(a,b,t)=>({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t});
function geometry(volume){
 const positions=[];for(const tri of volume.triangles)for(const i of tri)positions.push(...volume.positions[i]);
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(positions.length/3*2),2));g.computeVertexNormals();return g;
}
function remaining(cuts){let ranges=[[0,1]];for(const [lo,hi] of cuts)ranges=ranges.flatMap(([a,b])=>hi<=a||lo>=b?[[a,b]]:[[a,Math.max(a,lo)],[Math.min(b,hi),b]].filter(([x,y])=>y-x>1e-6));return ranges;}
function coverCuts(a,b,polys){
 const dx=b.x-a.x,dz=b.z-a.z,marks=[0,1];
 for(const poly of polys)for(let i=0;i<poly.length;i++){const c=poly[i],d=poly[(i+1)%poly.length],ex=d.x-c.x,ez=d.z-c.z,den=dx*ez-dz*ex;if(Math.abs(den)<1e-9)continue;const t=((c.x-a.x)*ez-(c.z-a.z)*ex)/den,u=((c.x-a.x)*dz-(c.z-a.z)*dx)/den;if(t>0&&t<1&&u>=0&&u<=1)marks.push(t);}
 marks.sort((a,b)=>a-b);return marks.slice(0,-1).flatMap((t,i)=>polys.some(p=>inside(mix(a,b,(t+marks[i+1])/2),p))?[[t,marks[i+1]]]:[]);
}
export function buildBuildingStyle(group,part){
 const root=part.interior,s=root.buildingStyle;if(!s)return;validateBuildingStyle(s);
 profileBuildingBase(group,part,{height:s.baseHeight,projection:s.baseProjection});
 const materials=new Map(),scale=part.scale.map(Math.abs),levels=[{id:'ground',elevation:0,plan:root},...(root.storeys||[])];
 const add=(volume,role,plan,level,flags)=>{
  const f=plan.finishes[role],key=level.id+':'+role;let entry=materials.get(key);if(!entry){const mat=new T.MeshStandardMaterial({color:f.color,roughness:.8});mat.userData.interiorRole=role;entry={mat,finish:f};materials.set(key,entry);}const mat=entry.mat;
  const mesh=new T.Mesh(geometry(volume),mat);mesh.name='Raised roof rim';mesh.userData={...flags,interiorStorey:level.id,structuralVolume:volume};mesh.castShadow=mesh.receiveShadow=true;mesh.position.y=level.elevation;group.add(mesh);
 };
 for(const level of levels){const plan=level.plan;
  if(root.shell&&level.id!=='ground')continue;
  for(const loop of buildingContours(plan)){
   const half=plan.shell?0:plan.thickness/2,wall=offsetContour(loop,half,[1,1,1]);
   // Offset the physical exterior contour in world metres, including nonuniform scale.
   const exterior=loop.map((e,i)=>({...e,a:wall[i]})),rimInner=offsetContour(exterior,-s.rimThickness,scale);
   for(let i=0;i<loop.length;i++){
    const e=loop[i],j=(i+1)%loop.length,roof=e.height;
    if(s.rimHeight){const upper=levels.filter(l=>l.elevation>level.elevation&&l.elevation<level.elevation+roof+s.rimHeight/scale[1]).flatMap(l=>l.plan.rooms.flatMap(r=>roofFootprints(r,l.plan.thickness))),cuts=root.shell?[]:coverCuts(e.a,e.b,upper);
     for(const [a,b] of remaining(cuts)){let poly=[mix(wall[i],wall[j],a),mix(wall[i],wall[j],b),mix(rimInner[i],rimInner[j],b),mix(rimInner[i],rimInner[j],a)];if(area(poly)<0)poly.reverse();add(prismVolume(poly,roof,roof+s.rimHeight/scale[1]),'roof',plan,level,{roofParapet:true});}
    }
   }
  }
 }
 for(const {mat,finish:f} of materials.values())applySurface(group,mat,{...part,surface:{preset:f.preset,scale:f.scale}});
}
