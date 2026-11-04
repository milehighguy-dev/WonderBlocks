import {curvePoint} from '../routes/curved-route.js';
import * as THREE from '../../vendor/three.module.js';
import {routeLayout,stepDepth} from '../routes/stair-route.js';

// Match an actual upward-facing surface near the endpoint, not an object's bounding box.
export function snapRouteToSurface(part,index,values,targets,{tolerance=.35}={}){
 const s=part.route.segments[index];
 const entry=routeLayout(part.route)[index],matrix=new THREE.Matrix4().compose(new THREE.Vector3(...part.position),new THREE.Quaternion().setFromEuler(new THREE.Euler(...part.rotation)),new THREE.Vector3(...part.scale));
 // A tilted local up axis would move the endpoint sideways when its rise changes.
 const up=new THREE.Vector3(0,1,0).transformDirection(matrix);if(up.y<.999)return null;
 const forward=new THREE.Vector3(Math.sin(entry.heading),0,Math.cos(entry.endHeading));
 const endpoint=(run,rise)=>new THREE.Vector3(...curvePoint(0,rise,run,run,s.curveAngle)).applyAxisAngle(new THREE.Vector3(0,1,0),entry.heading).add(new THREE.Vector3(...entry.start)).applyMatrix4(matrix);
 const desired=endpoint(values.run,values.rise),runs=[values.run];
 if(s.kind==='stairs')for(const n of [values.steps-1,values.steps+1])if(n>=1&&n<=64){const run=n*stepDepth(s);if(run>=.2&&run<=30)runs.push(run);}
 const ray=new THREE.Raycaster(),normalMatrix=new THREE.Matrix3();let best=null;
 for(const run of runs){
  const candidate=endpoint(run,values.rise),horizontal=Math.hypot(candidate.x-desired.x,candidate.z-desired.z);
  if(horizontal>tolerance)continue;
  ray.set(new THREE.Vector3(candidate.x,desired.y+tolerance,candidate.z),new THREE.Vector3(0,-1,0));ray.far=tolerance*2+.001;
  for(const hit of ray.intersectObjects(targets,true)){
   if(!hit.face||hit.object.material?.userData?.railing)continue;
   let root=hit.object,visible=true;for(let m=root;m;m=m.parent)if(!m.visible)visible=false;if(!visible)continue;
   const normal=hit.face.normal.clone().applyNormalMatrix(normalMatrix.getNormalMatrix(hit.object.matrixWorld));if(normal.y<.9)continue;
   const rise=(hit.point.y-endpoint(run,0).y)/matrix.elements[5];if(rise<-10||rise>10||s.kind==='landing'&&Math.abs(rise)>1e-5)continue;
   const score=Math.abs(hit.point.y-desired.y)+horizontal;if(best&&score>=best.score)continue;
   while(root.parent&&!targets.includes(root))root=root.parent;
   if(!supportedArrival(hit.point,entry,matrix,targets))continue;
   best={score,run,rise,steps:s.kind==='stairs'?Math.round(run/stepDepth(s)):values.steps,surfaceSnap:root.name||'surface',surfacePoint:hit.point.toArray()};
  }
 }
 if(!best)return null;const {score,...result}=best;return {...values,...result,locked:false};
}

// Sample across the walking opening, with clearance for the character above it.
function supportedArrival(point,entry,matrix,targets){
 const across=new THREE.Vector3(Math.cos(entry.endHeading),0,-Math.sin(entry.endHeading)).multiplyScalar(entry.width/2-.02);
 across.applyMatrix3(new THREE.Matrix3().setFromMatrix4(matrix));
 const ray=new THREE.Raycaster(),normalMatrix=new THREE.Matrix3();
 const usable=hit=>{for(let m=hit.object;m;m=m.parent)if(!m.visible)return false;return !hit.object.material?.userData?.railing;};
 for(const fraction of [-1,-.5,0,.5,1]){
  const p=point.clone().addScaledVector(across,fraction);
  ray.set(p.clone().add(new THREE.Vector3(0,.03,0)),new THREE.Vector3(0,-1,0));ray.far=.06;
  if(!ray.intersectObjects(targets,true).some(h=>usable(h)&&h.face&&h.face.normal.clone().applyNormalMatrix(normalMatrix.getNormalMatrix(h.object.matrixWorld)).y>.9))return false;
  ray.set(p.clone().add(new THREE.Vector3(0,.04,0)),new THREE.Vector3(0,1,0));ray.far=2.08;
  if(ray.intersectObjects(targets,true).some(usable))return false;
 }
 return true;
}
