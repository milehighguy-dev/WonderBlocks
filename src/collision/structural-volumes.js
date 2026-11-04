import * as T from '../../vendor/three.module.js';
// Closed construction volumes survive material/face splitting. They are hints
// for exporters; cuts invalidate them rather than exporting an uncut wall.
export function prismVolume(poly,low,high){
 const n=poly.length,positions=poly.map(p=>[p.x,low,p.z]).concat(poly.map(p=>[p.x,high,p.z])),triangles=[];
 for(const t of T.ShapeUtils.triangulateShape(poly.map(p=>new T.Vector2(p.x,p.z)),[])){const [a,b,c]=t,pa=new T.Vector3(...positions[a]),pb=new T.Vector3(...positions[b]),pc=new T.Vector3(...positions[c]);if(pb.sub(pa).cross(pc.sub(pa)).y>0)t.reverse();triangles.push([...t],t.map(v=>v+n).reverse());}
 for(let a=0;a<n;a++){const b=(a+1)%n;triangles.push([a,a+n,b+n],[a,b+n,b]);}
 return {positions,triangles};
}
export function boxVolume(width,height,depth,center=[0,0,0]){const [x,y,z]=center;return prismVolume([{x:x-width/2,z:z-depth/2},{x:x+width/2,z:z-depth/2},{x:x+width/2,z:z+depth/2},{x:x-width/2,z:z+depth/2}],y-height/2,y+height/2);}
const volumeKeys=['structuralVolume','shadowVolume'];
export function transformStructuralVolume(mesh,matrix){for(const key of volumeKeys){const volume=mesh.userData[key];if(volume)mesh.userData[key]={...volume,matrix:matrix.clone().multiply(volume.matrix?new T.Matrix4().fromArray(volume.matrix):new T.Matrix4()).toArray()};}}
// Cutting a window must not discard the thickness of a distant floor or roof.
// Test the whole construction volume, not just the currently visible face.
export function invalidateStructuralVolume(mesh,matrix,{bounds,planes}={}){
 if(!planes&&bounds)planes=[[1,0,0,-bounds[0]],[-1,0,0,bounds[1]],[0,1,0,-bounds[2]],[0,-1,0,bounds[3]],[0,0,1,-bounds[4]],[0,0,-1,bounds[5]]];
 for(const key of volumeKeys){const volume=mesh.userData[key];if(!volume)continue;
 if(!planes){delete mesh.userData[key];continue;}
 const transform=matrix.clone();if(volume.matrix)transform.multiply(new T.Matrix4().fromArray(volume.matrix));const points=volume.positions.map(p=>new T.Vector3(...p).applyMatrix4(transform));
 if(!planes.some(([x,y,z,d])=>points.every(p=>p.x*x+p.y*y+p.z*z+d<-1e-7)))delete mesh.userData[key];
 }
}
