import * as T from '../../vendor/three.module.js';

// Preserve the full parent transform, including rotated nonuniform scales.
export function poseBlobHandle(marker,parent,position,radii,rotation=[0,0,0]){
 const local=new T.Matrix4().compose(position,new T.Quaternion().setFromEuler(new T.Euler(...rotation)),new T.Vector3(...radii));
 marker.matrixAutoUpdate=false;
 marker.matrix.multiplyMatrices(parent.matrixWorld,local);
 marker.matrix.decompose(marker.position,marker.quaternion,marker.scale);
 marker.matrixWorldNeedsUpdate=true;
}

// Overlapping size outlines should not steal clicks from a nearby origin.
export function pickBlobHandle(ray,markers,camera,pointer){
 const hits=ray.intersectObjects(markers),distance=m=>{const center=m.getWorldPosition(new T.Vector3()).project(camera);return (center.x-pointer.x)**2+(center.y-pointer.y)**2;};
 hits.sort((a,b)=>distance(a.object)-distance(b.object)||a.distance-b.distance);
 return hits[0];
}
