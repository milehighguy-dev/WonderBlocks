import * as T from '../../vendor/three.module.js';
import {simplifySurface} from '../parts/surface-simplify.js';

// Reduce the complete skin, never the field's sampling resolution. The shared
// edge-collapse keeps boundaries and topology, including thin connected limbs.
export function floraSurfaceDetail(geometry,detail){
 if(detail!=='swbf2')return geometry;
 const p=geometry.attributes.position,index=geometry.index;
 // Float32 field crossings can coincide at a cube corner. Weld those near-identical
 // vertices before collapsing edges so removing a zero-area face cannot open
 // an otherwise closed surface.
 const positions=[],mapping=[],vertices=new Map(),epsilon=Math.max(1e-6,(geometry.userData.skinStep??.01)*1e-4),key=(x,y,z)=>x+','+y+','+z;
 for(let i=0;i<p.count;i++){
  const point=[p.getX(i),p.getY(i),p.getZ(i)],cell=point.map(v=>Math.floor(v/epsilon));let found;
  for(let z=-1;z<=1;z++)for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++)for(const at of vertices.get(key(cell[0]+x,cell[1]+y,cell[2]+z))??[])if(point.reduce((n,v,j)=>n+(v-positions[at][j])**2,0)<=epsilon**2&&(found===undefined||at<found))found=at;
  if(found===undefined){found=positions.length;positions.push(point);const k=key(...cell);if(!vertices.has(k))vertices.set(k,[]);vertices.get(k).push(found);}mapping.push(found);
 }
 const triangles=Array.from({length:(index?.count??p.count)/3},(_,i)=>[0,1,2].map(j=>mapping[index?index.getX(i*3+j):i*3+j])).filter(t=>new Set(t).size===3);
 if(triangles.length<=120)return geometry;
 geometry.computeBoundingBox();
 const span=geometry.boundingBox.getSize(new T.Vector3());
 // A budget is a goal, not permission to destroy a small feature. The error
 // bound may retain extra faces on roots and complex imported plant bodies.
 const target=Math.max(120,Math.round(triangles.length*.08));
 const reduced=simplifySurface({positions,triangles},target,{maximumError:Math.max(.003,span.length()*.008),preserveSmallFaces:true});
 if(reduced.triangles.length>=triangles.length)return geometry;
 const g=new T.BufferGeometry(),flat=reduced.positions.flat();
 g.setAttribute('position',new T.Float32BufferAttribute(flat,3));
 // Joined wood uses a planar seed UV; the material editor projects its finish
 // afterwards. Foliage and native textured surfaces never pass through here.
 g.setAttribute('uv',new T.Float32BufferAttribute(reduced.positions.flatMap(p=>[p[0],p[1]]),2));
 g.setIndex(reduced.triangles.flat());g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();
 g.userData={...geometry.userData,floraSurfaceDetail:'swbf2',sourceTriangles:triangles.length};
 geometry.dispose();return g;
}
