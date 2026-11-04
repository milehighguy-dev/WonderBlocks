import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {aureliaGate} from '../examples/generators/aurelia-demo.js';
import {validateProject} from '../src/core/model.js';
import {buildPart} from '../src/core/geometry.js';
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
function overlap(a,b){let polygon=a;const sign=Math.sign(cross(...b));for(let i=0;i<3&&polygon.length;i++){const p=b[i],q=b[(i+1)%3],next=[];for(let j=0;j<polygon.length;j++){const u=polygon[j],v=polygon[(j+1)%polygon.length],du=sign*cross(p,q,u),dv=sign*cross(p,q,v);if(du>=-1e-8)next.push(u);if((du>0)!==(dv>0)){const t=du/(du-dv);next.push([u[0]+t*(v[0]-u[0]),u[1]+t*(v[1]-u[1])]);}}polygon=next;}return Math.abs(polygon.reduce((sum,p,i)=>{const q=polygon[(i+1)%polygon.length];return sum+p[0]*q[1]-q[0]*p[1];},0))/2;}
test('Aurelia Gate builds finite geometry without overlapping coplanar top faces',()=>{
 const project=validateProject(aureliaGate()),planes=new Map();
 for(const part of project.parts){if(part.type==='character-reference')continue;const group=buildPart(part,{parts:project.parts,batch:true});group.updateMatrixWorld(true);group.traverse(mesh=>{if(!mesh.isMesh)return;const g=mesh.geometry,pos=g.attributes.position,count=g.index?.count??pos.count;for(let i=0;i<count;i+=3){const v=[0,1,2].map(k=>new T.Vector3().fromBufferAttribute(pos,g.index?g.index.getX(i+k):i+k).applyMatrix4(mesh.matrixWorld));assert.ok(v.every(p=>[p.x,p.y,p.z].every(Number.isFinite)),part.name);const normal=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0]));if(normal.y<=0||Math.abs(normal.x)>1e-5||Math.abs(normal.z)>1e-5)continue;const key=v[0].y.toFixed(4),tri=v.map(p=>[p.x,p.z]),bounds={minX:Math.min(...v.map(p=>p.x)),maxX:Math.max(...v.map(p=>p.x)),minZ:Math.min(...v.map(p=>p.z)),maxZ:Math.max(...v.map(p=>p.z))};const list=planes.get(key)||[];for(const other of list){if(other.id===part.id||bounds.maxX<=other.minX+1e-6||bounds.minX>=other.maxX-1e-6||bounds.maxZ<=other.minZ+1e-6||bounds.minZ>=other.maxZ-1e-6)continue;assert.ok(overlap(tri,other.tri)<1e-4,part.name+' overlaps '+other.name+' at y='+key);}list.push({id:part.id,name:part.name,tri,...bounds});planes.set(key,list);}});
 }
});
