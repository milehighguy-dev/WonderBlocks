import * as T from '../../vendor/three.module.js';
import {landingRailEdges,hallwayRibFits} from './railings.js';
import {angledTurn,angledLanding} from './angled-landing.js';
import {applySurface} from '../materials/surfaces.js';
import {hallwayPreset} from './hallway-presets.js';
import {roughenNaturalHallways} from './natural-hallway.js';
// Simplified structural bays inspired by the references, not copied mesh skins.
// Source-space measurements: corridor width, repeat pitch, band width and relief.
// Prison: 6.98m cell bays / .62m frames / .51m relief.
// Conference: alternating 3m panels in a 6m bay / .625m column relief.
// Polis Massa: 7.03m window bays / .88m frames; relief reduced to .36m for playable clearance.
export const HALLWAY_BAY_FEATURES={
 'yavin-temple':{sourceWidth:4,spacing:4,band:.3,depth:.2,crown:true},
 'death-star-prison':{sourceWidth:6,spacing:6.98,band:.62,depth:.51,crown:true},
 'death-star-conference':{sourceWidth:8,spacing:6,band:3,depth:.625,crown:true},
 hoth:{sourceWidth:6,spacing:8,band:0,depth:0,crown:false},
 'hoth-natural':{sourceWidth:10.82,spacing:5,band:0,depth:0,crown:false},
 'polis-massa':{sourceWidth:4.77,spacing:7.03,band:.88,depth:.36,crown:true},
 'rhen-var':{sourceWidth:9.45,spacing:12,band:5,depth:1.6,crown:false}
};

export function buildPresetHallways(group,part,layout,presetFor=hallwayPreset){

 const materials=new Map(),edges=[],matrix=new T.Matrix4().compose(new T.Vector3(...part.position),new T.Quaternion().setFromEuler(new T.Euler(...part.rotation)),new T.Vector3(...part.scale)),inverse=matrix.clone().invert();
 const world=(l,x,y,z)=>new T.Vector3(l.start[0]+Math.cos(l.heading)*x+Math.sin(l.heading)*z,l.start[1]+y,l.start[2]-Math.sin(l.heading)*x+Math.cos(l.heading)*z).applyMatrix4(matrix);
 for(const [index,l] of layout.entries()){const h=l.segment.hallway;if(!presetFor(h?.style))continue;const s=l.segment,raw=s.kind==='landing'||!s.rise?landingRailEdges(part.route,l,index):[-1,1].map(sign=>({a:[sign*l.width/2,0],b:[sign*l.width/2,s.run],out:[sign,0]}));for(const e of raw){const out=e.out||(e.a[0]===e.b[0]?[e.side==='left'?1:-1,0]:[0,e.a[1]===0?-1:1]),a=world(l,e.a[0],s.kind==='landing'?0:s.rise*e.a[1]/s.run,e.a[1]),b=world(l,e.b[0],s.kind==='landing'?0:s.rise*e.b[1]/s.run,e.b[1]),normal=world(l,out[0],0,out[1]).sub(world(l,0,0,0)).normalize(),width=world(l,l.width,0,0).distanceTo(world(l,0,0,0));edges.push({a,b,normal,h,l,index,width});}}
 const key=p=>[p.x,p.y,p.z].map(v=>v.toFixed(5)).join(','),joins=new Map();for(const e of edges)for(const end of ['a','b']){const k=key(e[end]);if(!joins.has(k))joins.set(k,[]);joins.get(k).push(e);}
 const distance=(e,bevel,inner)=>bevel*e.width/presetFor(e.h.style).width+(e.h.outsideClearance?(inner?0:-e.h.thickness):(inner?e.h.thickness:0));
 function point(e,end,bevel,height,inner){const source=e[end],p=source.clone().addScaledVector(e.normal,-distance(e,bevel,inner)),other=(joins.get(key(source))||[]).find(q=>q!==e);if(other){const q=source.clone().addScaledVector(other.normal,-distance(other,bevel,inner)),u=e.b.clone().sub(e.a),v=other.b.clone().sub(other.a),den=u.x*v.z-u.z*v.x;if(Math.abs(den)>1e-8){const t=((q.x-p.x)*v.z-(q.z-p.z)*v.x)/den;p.x+=u.x*t;p.z+=u.z*t;}}p.y=source.y+height*e.h.height/presetFor(e.h.style).height+(!inner&&height===presetFor(e.h.style).height?(e.h.roofThickness??e.h.thickness):0);return p;}
 function mesh(points,h,index,ceiling=false,kind='shell'){if(!points.length)return;const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points.flatMap(p=>p.clone().applyMatrix4(inverse).toArray()),3));g.computeVertexNormals();const materialKey=JSON.stringify([h.color,h.surface,kind]);if(!materials.has(materialKey))materials.set(materialKey,new T.MeshStandardMaterial({color:h.color,roughness:.65}));const material=materials.get(materialKey),m=new T.Mesh(g,material),holder=new T.Group();m.userData={routeSegment:index,hallway:true,hallwayCeiling:ceiling,hallwayDetail:kind==='detail',hallwayInspired:true,tantivePart:kind};m.castShadow=m.receiveShadow=true;holder.add(m);applySurface(holder,material,{...part,surface:h.surface});group.add(m);}
 for(const e of edges){const wall=[],upper=[],details=[],profile=presetFor(e.h.style).profile;const quad=(out,pts,expected)=>{if(pts[1].clone().sub(pts[0]).cross(pts[2].clone().sub(pts[0])).dot(expected)<0)pts.reverse();for(const i of [0,1,2,0,2,3])out.push(pts[i]);};
 const feature=HALLWAY_BAY_FEATURES[e.h.style]??{depth:0,band:0,spacing:4,sourceWidth:4},length=e.a.distanceTo(e.b),samples=[[0,0],[1,0]];
 if(feature.depth>0&&e.h.style!=='hoth-natural'&&e.l.segment.turn==='straight'&&!e.l.segment.turnAngle){const spacing=feature.spacing*e.width/feature.sourceWidth,half=feature.band*e.width/feature.sourceWidth/2,depth=Math.min(feature.depth*e.width/feature.sourceWidth,e.width*.22);for(let z=spacing/2;z+half+.12<length;z+=spacing)for(const [offset,d] of [[-half-.08,0],[-half,depth],[half,depth],[half+.08,0]])samples.push([(z+offset)/length,d]);}samples.sort((a,b)=>a[0]-b[0]);
 const innerPoint=(p,t,d)=>point(e,'a',...p,true).lerp(point(e,'b',...p,true),t).addScaledVector(e.normal,-d);
 for(let i=0;i<profile.length-1;i++){const high=i>=presetFor(e.h.style).ceilingStart;if(high&&!e.h.ceiling)continue;const out=high?upper:wall,a=profile[i],b=profile[i+1],preset=presetFor(e.h.style),faceNormal=e.normal.clone().multiplyScalar((b[1]-a[1])*e.h.height/preset.height).add(new T.Vector3(0,(b[0]-a[0])*e.width/preset.width,0)).normalize();quad(out,[point(e,'a',...a,false),point(e,'b',...a,false),point(e,'b',...b,false),point(e,'a',...b,false)],faceNormal);
 for(let j=0;j<samples.length-1;j++){const [t0,d0]=samples[j],[t1,d1]=samples[j+1];quad(high?upper:d0||d1?details:wall,[innerPoint(a,t0,d0),innerPoint(a,t1,d1),innerPoint(b,t1,d1),innerPoint(b,t0,d0)],faceNormal.clone().negate());}
 for(const end of ['a','b']){const a=profile[i],b=profile[i+1];quad(out,[point(e,end,...a,true),point(e,end,...a,false),point(e,end,...b,false),point(e,end,...b,true)],e.b.clone().sub(e.a).multiplyScalar(end==='a'?-1:1));}}
 if(e.h.outsideClearance){for(const [p,normal] of [[profile[0],new T.Vector3(0,-1,0)],[profile.at(-1),new T.Vector3(0,1,0)]])quad(wall,[point(e,'a',...p,false),point(e,'b',...p,false),point(e,'b',...p,true),point(e,'a',...p,true)],normal);}
 mesh(wall,e.h,e.index);mesh(upper,e.h,e.index,true);mesh(details,e.h,e.index,false,'detail');
 }
 for(const [index,l] of layout.entries()){const h=l.segment.hallway;if(!presetFor(h?.style))continue;const s=l.segment;
 if(h.ceiling){const returning=s.turn.startsWith('return-'),shift=returning?(s.turn==='return-right'?-1:1)*(l.width/2+l.nextWidth/2+(s.gap??part.route.gap)):0,min=Math.min(-l.width/2,shift-l.nextWidth/2),max=Math.max(l.width/2,shift+l.nextWidth/2),poly=angledTurn(s)?angledLanding(l).points:[[returning?min:-l.width/2,0],[returning?max:l.width/2,0],[returning?max:l.width/2,s.run],[returning?min:-l.width/2,s.run]],base=poly.map(([x,z])=>world(l,x,s.kind==='landing'?0:s.rise*z/s.run,z)),boundary=[];
 // Include wall endpoints at branch openings before insetting the roof edge.
 for(let i=0;i<base.length;i++){const a=base[i],b=base[(i+1)%base.length],v=b.clone().sub(a),len2=v.lengthSq(),cuts=[0];for(const e of edges.filter(e=>e.index===index))for(const p of [e.a,e.b]){const t=p.clone().sub(a).dot(v)/len2;if(t>1e-7&&t<1-1e-7&&a.clone().addScaledVector(v,t).distanceTo(p)<1e-5)cuts.push(t);}cuts.sort((a,b)=>a-b);for(const t of [...new Set(cuts)])boundary.push(a.clone().addScaledVector(v,t));}
 const roofEdges=edges.filter(e=>e.index===index);
 const ring=inner=>boundary.map(p=>{const joined=roofEdges.find(e=>e.a.distanceTo(p)<1e-5||e.b.distanceTo(p)<1e-5);if(joined)return point(joined,joined.a.distanceTo(p)<1e-5?'a':'b',...presetFor(joined.h.style).profile.at(-1),inner);const e=roofEdges.find(e=>{const v=e.b.clone().sub(e.a),t=p.clone().sub(e.a).dot(v)/v.lengthSq();return t>=0&&t<=1&&e.a.clone().addScaledVector(v,t).distanceTo(p)<1e-5;});const v=p.clone();if(e)v.addScaledVector(e.normal,-distance(e,presetFor(e.h.style).profile.at(-1)[0],inner));v.y=p.y+h.height+(inner?0:(h.roofThickness??h.thickness));return v;}),lower=ring(true),upper=ring(false),positions=[];
 for(const [ring,up] of [[lower,false],[upper,true]]){const faces=T.ShapeUtils.triangulateShape(ring.map(p=>new T.Vector2(p.x,p.z)),[]);for(const f of faces){const pts=f.map(i=>ring[i]);if(up)pts.reverse();positions.push(...pts);}}
 // Roof end reveals; side bevels already meet both roof rings.
 const center=[...lower,...upper].reduce((a,b)=>a.add(b),new T.Vector3()).multiplyScalar(1/(lower.length*2));for(let i=0;i<lower.length;i++){const j=(i+1)%lower.length,face=[lower[i],upper[i],upper[j],lower[j]],normal=face[1].clone().sub(face[0]).cross(face[2].clone().sub(face[0])),out=face.reduce((a,b)=>a.add(b),new T.Vector3()).multiplyScalar(.25).sub(center);if(normal.dot(out)<0)face.reverse();for(const k of [0,1,2,0,2,3])positions.push(face[k]);}mesh(positions,h,index,true,'roof');
 }
 // Carry each structural rib across the crown, rather than stopping at the walls.
 if(h.ceiling&&HALLWAY_BAY_FEATURES[h.style]?.crown&&s.turn==='straight'&&!s.turnAngle){const feature=HALLWAY_BAY_FEATURES[h.style],preset=presetFor(h.style),depth=Math.min(feature.depth*l.width/feature.sourceWidth,l.width*.22),drop=feature.depth*h.height/preset.height,spacing=feature.spacing*l.width/feature.sourceWidth,half=feature.band*l.width/feature.sourceWidth/2,points=[];
 const halfWidth=y=>{const sourceY=y/h.height*preset.height,profile=preset.profile;let inset=profile.at(-1)[0];for(let i=0;i<profile.length-1;i++)if(sourceY>=profile[i][1]&&sourceY<=profile[i+1][1]){const a=profile[i],b=profile[i+1],t=(sourceY-a[1])/(b[1]-a[1]);inset=a[0]+(b[0]-a[0])*t;break;}return Math.max(.05,l.width/2-inset*l.width/preset.width-h.thickness-depth);};
 const top=halfWidth(h.height),bottom=halfWidth(h.height-drop);
 for(let z=spacing/2;z+half+.12<s.run;z+=spacing){if(!hallwayRibFits(part.route,l,index,z,half+.08))continue;const local=[[-bottom,h.height-drop,z-half],[bottom,h.height-drop,z-half],[top,h.height,z-half],[-top,h.height,z-half],[-bottom,h.height-drop,z+half],[bottom,h.height-drop,z+half],[top,h.height,z+half],[-top,h.height,z+half]],v=local.map(([x,y,z])=>world(l,x,y+(s.kind==='landing'?0:s.rise*z/s.run),z));for(const face of [[0,3,2,1],[4,5,6,7],[0,1,5,4],[3,7,6,2],[0,4,7,3],[1,2,6,5]])for(const i of [0,1,2,0,2,3])points.push(v[face[i]]);}
 mesh(points,h,index,true,'detail');
 }
 }
 roughenNaturalHallways(group,layout);
}
