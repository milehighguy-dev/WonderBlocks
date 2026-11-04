import * as THREE from '../../vendor/three.module.js';
const up=new THREE.Vector3(0,1,0),down=new THREE.Vector3(0,-1,0);
export function walkableHit(hit){for(let o=hit.object;o;o=o.parent)if(!o.visible||o.userData.referenceOnly||o.material?.userData?.walkCollision===false)return false;return true;}
export function hitNormal(hit){return hit.face.normal.clone().applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld)).normalize();}
export function firstWalkHit(roots,ray,accept=()=>true){const valid=h=>walkableHit(h)&&accept(h);return roots.firstHit?roots.firstHit(ray,valid):ray.intersectObjects(roots,true).find(valid);}
export function groundAt(roots,position,upDistance=.4,downDistance=.6){const ray=new THREE.Raycaster(position.clone().addScaledVector(up,upDistance),down,0,upDistance+downDistance);return firstWalkHit(roots,ray,h=>hitNormal(h).y>.55);}
export function moveWalker(roots,feet,delta,height=1.8,radius=.24,step=.4){
 // Short sweeps prevent tunnelling; horizontal rays above step height block walls.
 const length=delta.length(),steps=Math.max(1,Math.ceil(length/.08)),increment=delta.clone().divideScalar(steps),next=feet.clone();
 for(let i=0;i<steps;i++)for(const axis of ['x','z']){if(!increment[axis])continue;const dir=new THREE.Vector3();dir[axis]=Math.sign(increment[axis]);let blocked=false;
  for(const y of [step+.05,height*.5,height-.05])for(const offset of [-radius*.7,0,radius*.7]){const origin=next.clone();origin.y+=y;origin[axis==='x'?'z':'x']+=offset;const ray=new THREE.Raycaster(origin,dir,0,Math.abs(increment[axis])+radius);if(firstWalkHit(roots,ray,h=>Math.abs(hitNormal(h).y)<.55)){blocked=true;break;}}
  if(blocked)continue;const candidate=next.clone();candidate[axis]+=increment[axis];const ground=groundAt(roots,candidate,step,.08);if(ground)candidate.y=ground.point.y;
  if(candidate.y>next.y+1e-6){const rise=candidate.y-next.y;let lowCeiling=false;for(const [x,z] of [[0,0],[-radius,0],[radius,0],[0,-radius],[0,radius]]){const origin=new THREE.Vector3(candidate.x+x,next.y+height-.02,candidate.z+z),ray=new THREE.Raycaster(origin,up,0,rise+.04);if(firstWalkHit(roots,ray,h=>hitNormal(h).y<-.3)){lowCeiling=true;break;}}if(lowCeiling)continue;}
  next.copy(candidate);
 }
 return next;
}
export function cameraPosition(roots,target,desired){const delta=desired.clone().sub(target),distance=delta.length(),ray=new THREE.Raycaster(target,delta.normalize(),0,distance);const hit=firstWalkHit(roots,ray);return hit?target.clone().addScaledVector(delta,Math.max(.15,hit.distance-.18)):desired;}

// Holding Space is a deliberate upward movement, not a ballistic jump impulse.
export function verticalWalker(roots,feet,velocity,dt,held,height=1.8,radius=.24){
 const next=feet.clone();dt=Math.min(.05,Math.max(0,dt));
 if(held){let rise=3.2*dt;
  for(const [x,z] of [[0,0],[-radius,0],[radius,0],[0,-radius],[0,radius]]){const origin=feet.clone().add(new THREE.Vector3(x,height-.02,z)),ray=new THREE.Raycaster(origin,up,0,rise+.04),hit=firstWalkHit(roots,ray,h=>hitNormal(h).y<-.3);if(hit)rise=Math.min(rise,Math.max(0,hit.distance-.04));}
  next.y+=rise;return {feet:next,velocity:0};
 }
 const below=groundAt(roots,feet,.02,.025);if(below){next.y=below.point.y;return {feet:next,velocity:0};}
 velocity=Math.min(0,velocity)-9.8*dt;const distance=-velocity*dt,fall=groundAt(roots,feet,.02,distance+.02);if(fall){next.y=fall.point.y;velocity=0;}else next.y-=distance;return {feet:next,velocity};
}
