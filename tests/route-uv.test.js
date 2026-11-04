import test from 'node:test';import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';import {buildRoute,anchorRouteGround} from '../src/routes/stair-route.js';import {applySurface} from '../src/materials/surfaces.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-5,a+' != '+b);
const route=kind=>({width:2,thickness:.2,gap:.15,segments:[{kind:'landing',run:3,rise:0,steps:1,turn:'left'},{kind,run:6,rise:kind==='landing'?0:2,steps:12,turn:'straight'}]});
test('straight stairs and ramps map textures in section space after a turn',()=>{
 for(const kind of ['stairs','ramp','landing']){const r=route(kind),group=new T.Group(),material=new T.MeshStandardMaterial();buildRoute(group,material,r);applySurface(group,material,{route:r,scale:[1,1,1],surface:{preset:'tile',scale:2}});
 const m=group.children[1],p=m.geometry.attributes.position,n=m.geometry.attributes.normal,uv=m.geometry.attributes.uv;let count=0;
 for(let i=0;i<p.count;i++)if(n.getY(i)>.1){near(uv.getX(i),p.getX(i)*2);near(uv.getY(i),p.getZ(i)*2);count++;}assert.ok(count>0);
 }
});
test('curved floors preserve unwrapped UVs across texture updates',()=>{
 for(const kind of ['stairs','ramp','landing'])for(const angle of [-Math.PI/2,Math.PI/2]){const r=route(kind);r.segments[1].curveAngle=angle;const group=new T.Group(),material=new T.MeshStandardMaterial();buildRoute(group,material,r);const m=group.children[1],raw=m.geometry.attributes.routeUV;assert.ok(raw);
 for(const density of [2,3,1]){applySurface(group,material,{route:r,scale:[1,1,1],surface:{preset:'tile',scale:density}});const uv=m.geometry.attributes.uv;for(let i=0;i<uv.count;i++){near(uv.getX(i),raw.getX(i)*density);near(uv.getY(i),raw.getY(i)*density);}}
 }
});

test('curved filled route walls tile over their anchored height after repainting',()=>{
 for(const kind of ['landing','ramp','stairs'])for(const angle of [-Math.PI/2,Math.PI/2])for(const height of [4,21]){
  const r=route(kind);r.groundHeight=-6;r.segments[1].curveAngle=angle;r.segments[1].fillToGround=true;
  const part={route:r,position:[0,height,0],rotation:[0,0,0],scale:[2,3,2],surface:{preset:'tile',scale:.4}};
  const group=new T.Group(),material=new T.MeshStandardMaterial();buildRoute(group,material,r);anchorRouteGround(group,part);
  const m=group.children[1],p=m.geometry.attributes.position,axes=m.geometry.attributes.routeUVAxes,source=m.geometry.attributes.routeUV;
  const saved=Array.from(source.array);let changed=0;
  for(const density of [.4,.8]){
   applySurface(group,material,{...part,surface:{preset:'tile',scale:density}});
   const uv=m.geometry.attributes.uv;
   for(let i=0;i<p.count;i++){
    near(uv.getX(i),source.getX(i)*2*density);
    near(uv.getY(i),(axes.getY(i)===1?p.getY(i)*3:source.getY(i)*2)*density);
    if(axes.getY(i)===1&&Math.abs(p.getY(i)-source.getY(i))>1)changed++;
   }
  }
  assert.ok(changed>0,'test covers ground vertices stretched beyond their original height');
  assert.deepEqual(Array.from(source.array),saved,'retain the unwrapped curve coordinates');
 }
});
