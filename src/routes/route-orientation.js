import {Vector3} from '../../vendor/three.module.js';
import {partMatrix} from '../interiors/entrances.js';
import {routeLayout} from './stair-route.js';

export function routeIsUpright(part){
 if(part.scale[1]<=0||part.scale[2]<=0)return false;
 const up=new Vector3(0,1,0).transformDirection(partMatrix(part));
 return up.y>0&&Math.hypot(up.x,up.z)<1e-7;
}

// Level around the selected path's destination, rather than moving its mouth
// to a different height or treating an equivalent Euler yaw as a half-turn.
export function levelRoute(part,index){
 if(part.scale[1]<=0||part.scale[2]<=0)throw Error('Use positive vertical and forward scale before connecting this route.');
 const next=structuredClone(part),matrix=partMatrix(part),local=new Vector3(...routeLayout(part.route)[index].end),anchor=local.clone().applyMatrix4(matrix),forward=new Vector3(0,0,1).transformDirection(matrix);
 next.rotation=[0,Math.hypot(forward.x,forward.z)>1e-8?Math.atan2(forward.x,forward.z):part.rotation[1],0];
 next.position=new Vector3(...next.position).add(anchor.sub(local.applyMatrix4(partMatrix(next)))).toArray();
 return next;
}
