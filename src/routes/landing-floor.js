import * as THREE from '../../vendor/three.module.js';
import {landingRailEdges} from './railings.js';

// Remove only the strips occupied by walls, leaving connection openings intact.
export function enclosedLandingFloor(route,l,height,scale=[1,1,1]){
 const s=l.segment,returning=s.turn.startsWith('return-');
 const shift=returning?(s.turn==='return-right'?-1:1)*(l.nextWidth+(s.gap??route.gap))/2:0;
 const width=returning?l.width+l.nextWidth+(s.gap??route.gap):l.width;
 const xmin=shift-width/2,xmax=shift+width/2,zmax=s.run;
 const thickness=s.hallway?.thickness??s.railing?.panelThickness??.1;
 const determinant=Math.max(1e-8,Math.abs(scale[0]*scale[2]));
 const ix=thickness*Math.hypot(scale[0]*Math.sin(l.heading),scale[2]*Math.cos(l.heading))/determinant;
 const iz=thickness*Math.hypot(scale[0]*Math.cos(l.heading),scale[2]*Math.sin(l.heading))/determinant;
 const sides=s.hallway?'both':s.railing?.sides??'both';
 const strips=landingRailEdges(route,l,l.index).filter(e=>sides==='both'||e.side==='both'||sides===e.side).map(({a,b})=>{
  if(a[0]===b[0])return a[0]<shift?[xmin,Math.min(xmax,xmin+ix),a[1],b[1]]:[Math.max(xmin,xmax-ix),xmax,a[1],b[1]];
  return a[1]===0?[a[0],b[0],0,Math.min(zmax,iz)]:[a[0],b[0],Math.max(0,zmax-iz),zmax];
 });
 const xs=[...new Set([xmin,xmax,...strips.flatMap(r=>r.slice(0,2))])].sort((a,b)=>a-b);
 const zs=[...new Set([0,zmax,...strips.flatMap(r=>r.slice(2))])].sort((a,b)=>a-b);
 const cells=zs.slice(1).map((z,j)=>xs.slice(1).map((x,i)=>!strips.some(([a,b,c,d])=>(xs[i]+x)/2>a&&(xs[i]+x)/2<b&&(zs[j]+z)/2>c&&(zs[j]+z)/2<d)));
 const positions=[];
 function quad(a,b,c,d,normal){
  const ab=new THREE.Vector3(...b).sub(new THREE.Vector3(...a)),ac=new THREE.Vector3(...c).sub(new THREE.Vector3(...a));
  const corners=ab.cross(ac).dot(new THREE.Vector3(...normal))>0?[a,b,c,a,c,d]:[a,c,b,a,d,c];
  positions.push(...corners.flat());
 }
 const occupied=(i,j)=>!!cells[j]?.[i];
 for(let j=0;j<cells.length;j++){
  // Merge adjacent cells into broad top/bottom faces instead of small tiles.
  for(let i=0;i<xs.length-1;i++)if(occupied(i,j)){
   let end=i+1;while(end<xs.length-1&&occupied(end,j))end++;
   const x=xs[i],xx=xs[end],z=zs[j],zz=zs[j+1];
   for(const [y,ny] of [[0,1],[-height,-1]])quad([x,y,z],[xx,y,z],[xx,y,zz],[x,y,zz],[0,ny,0]);
   i=end-1;
  }
  for(let i=0;i<xs.length-1;i++)if(occupied(i,j)){
   const x=xs[i],xx=xs[i+1],z=zs[j],zz=zs[j+1];
   if(!occupied(i-1,j))quad([x,0,z],[x,0,zz],[x,-height,zz],[x,-height,z],[-1,0,0]);
   if(!occupied(i+1,j))quad([xx,0,z],[xx,0,zz],[xx,-height,zz],[xx,-height,z],[1,0,0]);
   if(!occupied(i,j-1))quad([x,0,z],[xx,0,z],[xx,-height,z],[x,-height,z],[0,0,-1]);
   if(!occupied(i,j+1))quad([x,0,zz],[xx,0,zz],[xx,-height,zz],[x,-height,zz],[0,0,1]);
  }
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.computeVertexNormals();return g;
}
