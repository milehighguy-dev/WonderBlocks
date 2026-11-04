import {buildYavinBridgeStructure} from '../routes/yavin-bridge-structure.js';
import {buildYavinTempleBridge} from '../routes/yavin-temple-bridge.js';
import {buildYavinAqueducts,finishYavinAqueducts} from '../routes/yavin-aqueduct.js';
import {YAVIN_PARTS,buildYavin} from '../parts/yavin.js';
import {buildingBaseGeometry} from '../parts/building-base.js';
import {buildRoofParapet} from '../parts/roof-parapet.js';
import {MOS_EISLEY_PARTS,buildMosEisley} from '../parts/mos-eisley.js';
import {KOTOR_KASHYYYK_STYLE,applyKotorDeck,buildKotorWalkways,buildKotorPlatformBands} from '../routes/kotor-kashyyyk.js';
import {applyPlatformFinishes} from '../platforms/platform-finishes.js';
import {buildKashyyykBridges} from '../routes/kashyyyk-bridges.js';
import {buildFlora} from '../flora/flora.js';
import {metaballGeometry} from '../parts/metaballs.js';
import {applyHighwayFinishes} from '../highways/highway-finishes.js';
import {buildHighway} from '../highways/highway-mesh.js';
import {buildRingBody} from '../parts/ring-body.js';
import {buildStandaloneWalls} from '../routes/standalone-walls.js';
import {applyFaceFinishes} from '../editor/surface-selection.js';
import {applyRouteFinishes} from '../routes/route-finishes.js';
import {bendRouteMeshes} from '../routes/curved-route.js';
import {buildPlatform,buildPlatformRails,platformOutline} from '../platforms/platform.js';
import {cutNeighborInteriors} from '../interiors/interior-hull-cuts.js';
import {buildConnectedInteriors,buildConnectedWindows} from '../interiors/connected-interior.js';
import {buildEntrances} from '../interiors/entrances.js';
import {CORUSCANT_PARTS,buildCoruscant} from '../parts/coruscant.js';
import {buildRouteHallways} from '../routes/hallway.js';
import {buildCharacter} from '../walk/character.js';
import {buildInterior} from '../interiors/interior.js';
import {buildRouteRailings} from '../routes/railings.js';
import {buildRoute,anchorRouteGround,routeLayout} from '../routes/stair-route.js';
import {buildNewYork,NEW_YORK_PARTS} from '../parts/new-york.js';
import {batchPart} from './mesh-budget.js';
import * as THREE from '../../vendor/three.module.js';
import {buildJapanese,JAPANESE_PARTS} from '../parts/japanese.js';
import {applySurface} from '../materials/surfaces.js';
import {buildClassical,CLASSICAL_PARTS} from '../parts/classical.js';
import {attachObjectCollision} from '../collision/collision-service.js';
import {rememberAssemblyHull} from '../collision/assembly-collision.js';
import {conformRouteEntrances} from '../interiors/entrance-conform.js';
export function buildPart(p,{batch=false,parts=[],openingCuts,floraEditing=false,floraLive=false,exportRouteSections=0,collision=true}={}){
 if(p.type==='character-reference'){const group=buildCharacter();group.name=p.name;group.userData.partId=p.id;group.position.fromArray(p.position);group.rotation.set(...p.rotation);group.scale.fromArray(p.scale.map(v=>Math.sign(v)||1));return group;}
 const group=new THREE.Group();group.name=p.name;group.userData.partId=p.id;
 const material=new THREE.MeshStandardMaterial({color:p.color,roughness:.72,metalness:.05});
 if(p.type==='highway')buildHighway(group,material,p.highway,p,parts,{routeSections:exportRouteSections});
 function mesh(geo,pos=[0,0,0],mat=material){const m=new THREE.Mesh(geo,mat);m.position.fromArray(pos);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;}
 function box(w,h,d,x=0,y=h/2,z=0,mat=material){return mesh(new THREE.BoxGeometry(w,h,d,...(p.shape&&Object.values(p.shape).some(Boolean)?[2,4,2]:[1,1,1])),[x,y,z],mat);}
 function lathe(points){return mesh(new THREE.LatheGeometry(points.map(p=>new THREE.Vector2(...p)),12));}
 function torus(radius,tube,x=0,y=0,z=0){return mesh(new THREE.TorusGeometry(radius,tube,6,16),[x,y,z]);}
 function shapeMesh(points,depth=.15){const s=new THREE.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return mesh(new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:false,steps:1}));}
 function glass(){return new THREE.MeshStandardMaterial({color:'#28596a',roughness:.3,metalness:.25});}
 if(YAVIN_PARTS.some(def=>def.id===p.type))buildYavin(p.type,group,material,p.parameters);
 if(MOS_EISLEY_PARTS.some(def=>def.id===p.type))buildMosEisley(p.type,group,material);
 if(CLASSICAL_PARTS.some(def=>def.id===p.type))buildClassical(p.type,group,material,p.parameters);
 if(JAPANESE_PARTS.some(def=>def.id===p.type))buildJapanese(p.type,group,material,p);
 if(NEW_YORK_PARTS.some(def=>def.id===p.type))buildNewYork(p.type,group,material);
 if(CORUSCANT_PARTS.some(def=>def.id===p.type))buildCoruscant(p.type,group,material);
 if(p.platform)buildPlatform(group,material,p,parts);
 if(p.type==='interior')buildInterior(group,p);
 if(p.type==='stair-route')buildRoute(group,material,p.route,p.scale);
 switch(p.type){
 case 'flora':buildFlora(group,p.flora,p,{editable:floraEditing,live:floraLive});material.dispose();break;
 case 'metaballs':mesh(metaballGeometry(p.metaballs));break;
 case 'block':if(p.parameters?.baseSlopeHeight&&p.parameters?.baseSlopeProjection)mesh(buildingBaseGeometry({scale:p.scale},{height:p.parameters.baseSlopeHeight,projection:p.parameters.baseSlopeProjection}));else box(1,1,1);if(p.parameters?.parapetHeight)buildRoofParapet(group,material,{scale:p.scale},{height:p.parameters.parapetHeight,thickness:p.parameters.parapetThickness??.3});break;
 case 'waterfall':mesh(new THREE.PlaneGeometry(1,1),[0,.5,0]);break;
 case 'slab':box(1,.3,1);break;
 case 'hex':mesh(new THREE.CylinderGeometry(.5,.5,1,6,1),[0,.5,0]);break;
 case 'ring-body':buildRingBody(group,material,p.parameters,p.shape);break;
 case 'round':mesh(new THREE.CylinderGeometry(.5,.5,1,p.parameters?.sides??24,3),[0,.5,0]);break;
 case 'taper':mesh(new THREE.CylinderGeometry(.3,.5,1,6,3),[0,.5,0]);break;
 case 'dome':mesh(new THREE.SphereGeometry(.5,12,6,0,Math.PI*2,0,Math.PI/2));break;
 case 'cone':mesh(new THREE.ConeGeometry(.5,1,12),[0,.5,0]);break;
 case 'roof':{const roof=mesh(new THREE.ConeGeometry(Math.SQRT1_2,.6,4),[0,.3,0]);roof.rotation.y=Math.PI/4;break;}
 case 'pillar':mesh(new THREE.CylinderGeometry(.35,.4,1,24),[0,.5,0]);box(1,.12,1,0,.06);box(1,.12,1,0,.94);break;
 case 'ring':{const ring=mesh(new THREE.TorusGeometry(.46,.04,6,16));ring.rotation.x=Math.PI/2;break;}
 case 'capsule':mesh(new THREE.CapsuleGeometry(.4,.5,8,24),[0,.65,0]);break;
 case 'orb':mesh(new THREE.SphereGeometry(.6,12,8),[0,.6,0]);break;
 case 'bell':lathe([[0,0],[.5,0],[.5,.1],[.38,.25],[.28,.6],[.22,1],[0,1]]);break;
 case 'waist':lathe([[0,0],[.5,0],[.45,.15],[.28,.4],[.26,.5],[.28,.6],[.45,.85],[.5,1],[0,1]]);break;
 case 'archbody':{const s=new THREE.Shape();s.moveTo(-.65,0);s.lineTo(-.65,.65);s.absarc(0,.65,.65,Math.PI,0,true);s.lineTo(.65,0);s.lineTo(.4,0);s.lineTo(.4,.65);s.absarc(0,.65,.4,0,Math.PI,false);s.lineTo(-.4,0);s.closePath();mesh(new THREE.ExtrudeGeometry(s,{depth:.4,bevelEnabled:false,curveSegments:8}));break;}
 case 'flat-arch':{const s=new THREE.Shape();s.moveTo(-.65,0);s.lineTo(-.65,1.3);s.lineTo(.65,1.3);s.lineTo(.65,0);s.lineTo(.4,0);s.lineTo(.4,.65);s.absarc(0,.65,.4,0,Math.PI,false);s.lineTo(-.4,0);s.closePath();mesh(new THREE.ExtrudeGeometry(s,{depth:.4,bevelEnabled:false,curveSegments:8}));break;}
 case 'buttress':shapeMesh([[-.5,0],[.5,0],[.15,1.2],[-.15,1.2]],.35);break;
 case 'onion':lathe([[0,0],[.38,0],[.52,.2],[.56,.38],[.48,.55],[.3,.7],[.12,.85],[0,1.1]]);break;
 case 'saucer':lathe([[0,0],[.65,.04],[.75,.12],[.62,.23],[.35,.33],[0,.38]]);break;
 case 'pagoda':for(let i=0;i<3;i++){const r=.7-i*.17;lathe([[0,i*.3],[r,i*.3],[r*.7,i*.3+.08],[r*.3,i*.3+.32],[0,i*.3+.37]]);}break;
 case 'gable':{const m=shapeMesh([[-.65,0],[.65,0],[0,.65]],1);m.position.z=-.5;break;}
 case 'pyramid':for(let i=0;i<5;i++)box(1-i*.18,.2,1-i*.18,0,.1+i*.2);break;
 case 'fin':shapeMesh([[-.5,0],[.5,0],[.18,.3],[.05,.8],[-.4,1.3],[-.2,.45]],.15);break;
 case 'crown':{mesh(new THREE.CylinderGeometry(.5,.5,.2,12),[0,.1,0]);for(let i=0;i<8;i++){const a=i*Math.PI/4;const b=box(.22,.22,.2,Math.cos(a)*.43,.3,Math.sin(a)*.43);b.rotation.y=-a;}break;}
 case 'balcony':box(1.2,.12,.65);for(const x of [-.52,-.26,0,.26,.52])box(.04,.45,.04,x,.34,.28);box(1.15,.05,.05,0,.56,.28);break;
 case 'chimney':box(.45,1,.45);box(.6,.12,.6,0,.95);box(.33,.03,.33,0,1.025,0,glass());break;
 case 'antenna':mesh(new THREE.CylinderGeometry(.025,.07,1.3,12),[0,.65,0]);mesh(new THREE.SphereGeometry(.13,16,12),[0,1.3,0]);torus(.3,.025,0,.9,0).rotation.x=Math.PI/2;break;
 case 'flag':mesh(new THREE.CylinderGeometry(.025,.025,1.5,12),[0,.75,0]);shapeMesh([[0,1.4],[.7,1.4],[.5,1.13],[.7,.88],[0,.88]],.035);break;
 case 'gear':torus(.33,.12,0,.5,0);for(let i=0;i<12;i++){const a=i*Math.PI/6;const b=box(.15,.2,.16,Math.sin(a)*.46,.5+Math.cos(a)*.46,0);b.rotation.z=-a;}break;
 case 'crystal':mesh(new THREE.OctahedronGeometry(.6),[0,.65,0]).scale.y=1.5;break;
 case 'pipe':{mesh(new THREE.CylinderGeometry(.14,.14,.6,20),[0,.3,0]);const m=mesh(new THREE.TorusGeometry(.3,.14,6,12,Math.PI/2),[.3,.6,0]);m.rotation.z=Math.PI/2;break;}
 case 'awning':{const m=box(1.2,.08,.75,0,.75,.28);m.rotation.x=.2;box(.04,.7,.04,-.5,.35,.58);box(.04,.7,.04,.5,.35,.58);break;}
 }
 if(!p.platform&&p.shape&&Object.values(p.shape).some(Boolean))deform(group,p.shape);
 if(p.route?.segments.some(s=>s.fillToGround))anchorRouteGround(group,p);
 applySurface(group,material,p);
 if(p.highway)applyHighwayFinishes(group,p);
 if(p.route)for(const m of group.children){const finish=p.route.segments[m.userData.routeSegment]?.floorFinish;if(!finish||!m.isMesh)continue;m.material=material.clone();m.material.color.set(finish.color);applySurface(group,m.material,{...p,...finish});}
 if(p.platform){if(p.platform.style===KOTOR_KASHYYYK_STYLE){applyKotorDeck(group,m=>m.geometry.userData.platformPart!=='supports',{platform:true});buildKotorPlatformBands(group,platformOutline(p.platform));}buildPlatformRails(group,p,parts);applyPlatformFinishes(group,p);}
 if(p.type==='wall-route'){buildStandaloneWalls(group,p);applyRouteFinishes(group,p);}
 else if(p.route){const layout=routeLayout(p.route);buildYavinAqueducts(group,p,layout);buildYavinBridgeStructure(group,p,layout);buildYavinTempleBridge(group,p,layout);buildKashyyykBridges(group,p,layout);buildKotorWalkways(group,p,layout);buildRouteRailings(group,p,layout.map(l=>l.segment.hallway?{...l,segment:{...l.segment,railing:{style:'none'}}}:l));buildRouteHallways(group,p,layout);applyRouteFinishes(group,p);bendRouteMeshes(group,layout);finishYavinAqueducts(group,p,layout);}
 conformRouteEntrances(group,p,parts,buildPart);
 if(collision&&!floraEditing&&!floraLive)rememberAssemblyHull(p,group);
 cutNeighborInteriors(group,p,parts,openingCuts);
 buildConnectedInteriors(group,p);buildConnectedWindows(group,p,parts,openingCuts?.get(p.id));
 buildEntrances(group,p);
 applyFaceFinishes(group,p);
 group.position.fromArray(p.position);group.rotation.set(...p.rotation);group.scale.fromArray(p.scale);
 if(collision&&!floraEditing&&!floraLive)attachObjectCollision(p,group,{parts,asynchronous:collision==='sync'?false:typeof Worker!=='undefined'});
 if(batch){if(p.interior||p.entranceInteriors?.length){const buckets=new Map();for(const m of [...group.children]){const key=JSON.stringify([m.userData.interiorStorey??null,!!m.userData.interiorCeiling,!!m.userData.interiorFloor,m.userData.connectedInteriorId??null]);if(!buckets.has(key))buckets.set(key,new THREE.Group());buckets.get(key).add(m);}for(const [key,bucket] of buckets){batchPart(bucket);const [level,ceiling,floor,connected]=JSON.parse(key);for(const m of [...bucket.children]){m.userData.interiorCeiling=ceiling;m.userData.interiorFloor=floor;if(connected)m.userData.connectedInteriorId=connected;if(level)m.userData.interiorStorey=level;group.add(m);}}}else batchPart(group);}
 return group;
}
export function deform(group,{taper=0,bulge=0,twist=0}){
 group.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(group),height=Math.max(.001,bounds.max.y-bounds.min.y);
 group.traverse(m=>{if(!m.isMesh)return;m.updateMatrix();const inv=m.matrix.clone().invert(),a=m.geometry.attributes.position;
 for(let i=0;i<a.count;i++){const v=new THREE.Vector3().fromBufferAttribute(a,i).applyMatrix4(m.matrix),t=THREE.MathUtils.clamp((v.y-bounds.min.y)/height,0,1),factor=Math.max(.1,1+taper*t+bulge*Math.sin(Math.PI*t)),angle=twist*Math.PI/180*t,x=v.x*factor,z=v.z*factor;v.x=x*Math.cos(angle)+z*Math.sin(angle);v.z=z*Math.cos(angle)-x*Math.sin(angle);v.applyMatrix4(inv);a.setXYZ(i,v.x,v.y,v.z);}a.needsUpdate=true;m.geometry.computeVertexNormals();m.geometry.computeBoundingBox();m.geometry.computeBoundingSphere();});
}
export function disposePart(group){const mats=new Set(),geometries=new Set();group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const material of Array.isArray(o.material)?o.material:[o.material])if(material)mats.add(material);});geometries.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());}
