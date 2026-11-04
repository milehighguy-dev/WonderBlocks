import * as T from '../../vendor/three.module.js';
import {applySurface} from '../materials/surfaces.js';
import {segmentThickness} from './stair-route.js';

// BF2 yav_bldg_aquaduct uses three solid transverse slabs. The narrow
// central faces span the full width; their extra source vertices are UV seams,
// not openings between legs. Caps and stepped feet flare in both directions.
// Source deck width 22.48 m; slab height 9.413 m; support pitch 10 m.
export function buildYavinBridgeStructure(group,part,layout){
 for(const l of layout){
  const s=l.segment;if(s.hallway||s.railing?.style!=='yavin-temple-bridge')continue;
  const r={color:'#ffffff',surface:{preset:'yavin-bridge-stone',scale:.35},...s.railing,height:l.width*.42,spacing:l.width*.45,postWidth:l.width*.13},t=segmentThickness(part.route,s),material=new T.MeshStandardMaterial({color:r.color,roughness:1}),holder=new T.Group();
  const add=(geometry,kind,curved=false)=>{const m=new T.Mesh(geometry,material);m.userData={routeSegment:l.index,yavinBridgePart:'underbody',yavinBridgeSupport:kind==='support',routeCurved:curved};m.castShadow=m.receiveShadow=true;holder.add(m);};
  // A recessed lower course under the thick, continuous walking slab.
  for(const floor of group.children.filter(m=>m.userData.routeFloor&&m.userData.routeSegment===l.index)){
   if(s.fillToGround)continue;
   floor.updateMatrix();const g=floor.geometry.clone();g.userData={...g.userData};g.applyMatrix4(floor.matrix);
   const a=g.getAttribute('position'),center=new T.Vector3(),origin=new T.Vector3(...l.start),up=new T.Vector3(0,1,0),box=new T.Box3().setFromBufferAttribute(a);box.getCenter(center);
   const local=p=>p.sub(origin).applyAxisAngle(up,-l.heading),c=local(center);
   for(let i=0;i<a.count;i++){
    const p=local(new T.Vector3().fromBufferAttribute(a,i));
    if(s.curveAngle){const radius=s.run/s.curveAngle,sign=Math.sign(radius),angle=Math.atan2(p.z*sign,(radius-p.x)*sign),across=radius-sign*Math.hypot(radius-p.x,p.z),r=radius-across*.94;p.x=radius-r*Math.cos(angle);p.z=r*Math.sin(angle);}
    else p.x=c.x+(p.x-c.x)*.94;
    p.y-=t*.35;p.applyAxisAngle(up,l.heading).add(origin);a.setXYZ(i,p.x,p.y,p.z);
   }
   g.computeVertexNormals();add(g,'underbody',!!floor.userData.routeCurved);
  }
  const compatible=q=>q&&!q.hallway&&!q.branchFrom&&!q.pathStart&&!q.curveAngle&&!s.curveAngle&&q.turn==='straight'&&q.railing?.style===r.style&&(q.railing.spacing??4)===(s.railing.spacing??4)&&(q.width??part.route.width)===l.width&&(q.kind==='landing'?0:q.rise/q.run)===(s.kind==='landing'?0:s.rise/s.run);
  let offset=0;if(!s.branchFrom&&!s.pathStart)for(let i=l.index-1;i>=0&&compatible(part.route.segments[i]);i--)offset+=part.route.segments[i].run;
  const run=s.turn==='straight'?s.run:Math.max(0,s.run-l.nextWidth),half=r.postWidth/2,first=((r.spacing/2-offset)%r.spacing+r.spacing)%r.spacing;
  const continuing=s.turn==='straight'&&compatible(part.route.segments[l.index+1]),last=continuing?run:run-half-.1;
  for(let z=first;z<=last+1e-7;z+=r.spacing){
   // A shared-boundary frame belongs to the preceding section, exactly once.
   if(z<1e-6||offset===0&&z<half+.1)continue;
   const w=l.width,d=r.height,base=-t+(s.kind==='landing'?0:Math.min(s.rise*(z-half)/s.run,s.rise*(z+half)/s.run));
   // Horizontal rectangular rings make each support one closed slab, including
   // its continuous web, flared crown, base band and broad bevelled foot.
   const profile=[[0,.4447,.1049],[-.042,.4447,.1049],[-.127,.4447,.0468],[-.740,.5513,.0468],[-.741,.5513,.0875],[-.818,.5589,.0875],[-.890,.7135,.1301],[-1,.7555,.1301]],rings=profile.map(([y,x,depth])=>[[-x*w,base+y*d,z-depth*w/2],[x*w,base+y*d,z-depth*w/2],[x*w,base+y*d,z+depth*w/2],[-x*w,base+y*d,z+depth*w/2]].map(p=>new T.Vector3(...p))),positions=[];
   const quad=(points,out)=>{if(points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])).dot(out)<0)points.reverse();for(const i of [0,1,2,0,2,3])positions.push(...points[i].toArray());};
   quad([...rings[0]],new T.Vector3(0,1,0));quad([...rings.at(-1)],new T.Vector3(0,-1,0));
   for(let i=0;i<rings.length-1;i++)for(let j=0;j<4;j++){const k=(j+1)%4;quad([rings[i][j],rings[i][k],rings[i+1][k],rings[i+1][j]],[new T.Vector3(0,0,-1),new T.Vector3(1,0,0),new T.Vector3(0,0,1),new T.Vector3(-1,0,0)][j]);}
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.computeVertexNormals();g.rotateY(l.heading);g.translate(...l.start);add(g,'support');
  }
  applySurface(holder,material,{...part,surface:r.surface});for(const m of [...holder.children])group.add(m);
 }
}
