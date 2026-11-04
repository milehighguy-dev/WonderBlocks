import * as T from '../../vendor/three.module.js';
import {partMatrix} from './entrances.js';
import {hullProfile} from './hull-network.js';
// Hull faces attract nearby handles; crossing a face never clamps the room.
export function snapRoomHandle(part,plan,room,key,value,hulls,elevation=0,threshold=.18){
 const inverse=partMatrix(part).invert(),candidates=[],xSide=['left','right'].includes(key),axis=xSide?'x':'z',along=xSide?'z':'x';
 for(const hull of hulls){const profile=hullProfile(hull,part.position[1]+elevation);if(!profile)continue;
 if(key==='height'){const v=new T.Vector3(part.position[0],profile.top,part.position[2]).applyMatrix4(inverse);candidates.push(v.y-elevation-plan.slab);continue;}
 const bottom=part.position[1]+elevation,top=bottom+(room.wallHeight??plan.height);if(top<profile.bottom||bottom>profile.top)continue;
 const points=profile.points.map(p=>new T.Vector3(p.x,bottom,p.z).applyMatrix4(inverse)),center=points.reduce((s,p)=>s.add(p),new T.Vector3()).divideScalar(points.length),start=room[along],end=start+(xSide?room.d:room.w);
 for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];if(Math.abs(a[axis]-b[axis])>1e-5||Math.max(a[along],b[along])<start||Math.min(a[along],b[along])>end)continue;candidates.push(a[axis]+Math.sign(center[axis]-a[axis])*plan.thickness/2);}
 }
 const nearest=candidates.filter(v=>Math.abs(v-value)<=threshold).sort((a,b)=>Math.abs(a-value)-Math.abs(b-value))[0];return nearest===undefined?{value:Math.round(value*4)/4,snapped:false}:{value:nearest,snapped:true};
}
