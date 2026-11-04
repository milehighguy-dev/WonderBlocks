import {japaneseWallProfile,japaneseRoofCurve} from './japanese-wall-profile.js';
import * as THREE from '../../vendor/three.module.js';
import {architecturalTexture} from '../materials/architectural-textures.js';

const stone='#777b76',plaster='#eee9d8',roof='#61958b',wood='#403e35',gold='#d4ad52';
export const JAPANESE_PARTS=[
 ['jp-base','Battered stone foundation',stone],['jp-stone-wall','Stone rampart',stone],
 ['jp-stone-corner','Stone rampart corner',stone],
 ['jp-story','Plaster keep story',plaster],['jp-entry-story','Keep entrance story',plaster],['jp-dark-story','Timber keep story',wood],
 ['jp-gallery-wall','Open defensive wall',plaster],['jp-wall','Plaster wall panel',plaster],['jp-timber-wall','Timber wall panel',wood],
 ['jp-hip-roof','Swept hip roof',roof],['jp-tier-roof','Open tier roof',roof],
 ['jp-gable-roof','Swept gable roof',roof],['jp-half-roof','Half swept roof',roof],
 ['jp-irimoya','Hip-and-gable roof',roof],['jp-swept-gable','Swept roof gable face',plaster],['jp-chidori','Triangular dormer gable',plaster],
 ['jp-karahafu','Curved entrance gable',plaster],['jp-eave','Straight eave canopy',roof],
 ['jp-ridge','Roof ridge cap',roof],['jp-window','Barred castle window',wood],
 ['jp-katomado','Bell-shaped window',wood],['jp-arrow','Arrow-slit panel',plaster],
 ['jp-gate','Open timber gate',wood],['jp-torii','Red torii gate','#bd3926'],['jp-gate-doors','Studded double doors',wood],
 ['jp-balcony','Observation balcony frame',wood],['jp-railing','Balcony railing',wood],
 ['jp-bracket','Eave bracket',wood],['jp-shachi','Golden fish roof ornament',gold],
 ['jp-crest','Golden floral crest',gold],['jp-tiger','Golden tiger relief',gold],['jp-wall-cap','Courtyard wall cap',roof]
].map(([id,name,color])=>({id,name,color,category:'Medieval Japan',icon:'◇',...(id==='jp-torii'?{description:'Place a red torii gate with an open passage, leaning round posts and a curved black cap.'}:{})}));

// Original stylized castle kit. Unit story: 2 × 1.2 × 2, open inside.
export function buildJapanese(type,group,material,part={}){
 const dark=new THREE.MeshStandardMaterial({color:wood,roughness:.8}),trim=new THREE.MeshStandardMaterial({color:gold,roughness:.5,metalness:.45});
 const white=new THREE.MeshStandardMaterial({color:plaster,roughness:.85});
 const detailKind=({'jp-window':'window','jp-swept-gable':'gable','jp-story':'story','jp-entry-story':'story','jp-dark-story':'story','jp-wall':'wall','jp-timber-wall':'wall'})[type];
 if(detailKind)material.map=architecturalTexture(detailKind);
 const used=new Set();
 const mesh=(g,pos=[0,0,0],mat=material)=>{used.add(mat);const m=new THREE.Mesh(g,mat);m.position.fromArray(pos);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;};
 const box=(w,h,d,x=0,y=h/2,z=0,mat=material)=>mesh(new THREE.BoxGeometry(w,h,d,1,1,1),[x,y,z],mat);
 const line=(a,b,r=.025,mat=material)=>{const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),m=mesh(new THREE.CylinderGeometry(r,r,av.distanceTo(bv),4),av.clone().add(bv).multiplyScalar(.5).toArray(),mat);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),bv.sub(av).normalize());return m;};
 const extrude=(points,depth,mat=material,z=-depth/2)=>{const s=new THREE.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return mesh(new THREE.ExtrudeGeometry(s,{depth,steps:1,bevelEnabled:false}),[0,0,z],mat);};
 function quad(a,b,c,d,mat=material){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([...a,...b,...c,...a,...c,...d],3));g.computeVertexNormals();return mesh(g,[0,0,0],mat);}
 function masonry(w=2,d=2,h=1.2){
  const g=new THREE.BoxGeometry(w,h,d,1,1,1),p=g.attributes.position;
  for(let i=0;i<p.count;i++){const t=(p.getY(i)+h/2)/h,k=.78+(part.parameters?.batter??.22)*(1-t);p.setXYZ(i,p.getX(i)*k,p.getY(i)+h/2,p.getZ(i)*k);}g.computeVertexNormals();mesh(g);
 }

 const curve=japaneseRoofCurve;
 function sweptGable(half=false,depth=2,mat=material,segments=8){
  const steps=half?4:segments,points=[];for(let i=0;i<=steps;i++){const x=half?i/steps:-1+2*i/steps;points.push([x,curve(Math.abs(x))]);}for(let i=steps;i>=0;i--){const x=half?i/steps:-1+2*i/steps;points.push([x,curve(Math.abs(x))-.06]);}extrude(points,depth,mat);
 }
 function halfPanel(){
  const inner=part.parameters?.roofInnerSpan??1;
  if(inner===1){sweptGable(true);return;}
  const pt=(t,side,lower=false)=>[t,curve(t)-(lower?.06:0),side*(inner+(1-inner)*t)];
  for(let i=0;i<4;i++){
   const a=i/4,b=(i+1)/4;
   quad(pt(a,-1),pt(a,1),pt(b,1),pt(b,-1));
   quad(pt(a,-1,true),pt(b,-1,true),pt(b,1,true),pt(a,1,true));
   for(const side of [-1,1]){const points=[pt(a,side,true),pt(a,side),pt(b,side),pt(b,side,true)];if(side<0)points.reverse();quad(...points,dark);}
  }
  for(const t of [0,1]){const points=[pt(t,-1,true),pt(t,1,true),pt(t,1),pt(t,-1)];if(t===0)points.reverse();quad(...points);}
 }
 function hip(open=false){
  // Closed shell surrounding an optional square opening; shared rings prevent corner overlap.
  const rings=Array.from({length:7},(_,i)=>{const r=(open?.5:0)+(1-(open?.5:0))*i/6;return {r,y:curve(r)};});
  for(let side=0;side<4;side++){
   const pt=(r,y,end)=>new THREE.Vector3(end?r:-r,y,r).applyAxisAngle(new THREE.Vector3(0,1,0),side*Math.PI/2).toArray();
   for(let i=0;i<rings.length-1;i++){const a=rings[i],b=rings[i+1];quad(pt(a.r,a.y,false),pt(b.r,b.y,false),pt(b.r,b.y,true),pt(a.r,a.y,true));quad(pt(a.r,a.y-.06,true),pt(b.r,b.y-.06,true),pt(b.r,b.y-.06,false),pt(a.r,a.y-.06,false));}
   for(const [r,y] of [[1,curve(1)],...(open?[[.5,curve(.5)]]:[])]){const pts=[pt(r,y-.06,false),pt(r,y-.06,true),pt(r,y,true),pt(r,y,false)];if(r<1)pts.reverse();quad(...pts);}
   line(pt(1,curve(1),false),pt(1,curve(1),true),.025,dark);
   for(let i=0;i<6;i++){const a=rings[i],b=rings[i+1];line(pt(a.r,a.y,false),pt(b.r,b.y,false),.012);}
  }
 }
 function railing(width=2,z=0){box(width,.07,.1,0,.48,z);box(width,.05,.08,0,.12,z);for(let i=0;i<=4;i++)box(.045,.48,.045,-width/2+width*i/4,.24,z);}
 function gable(curved=false){
  const upper=[];for(let i=0;i<=8;i++){const x=-1+i/4,y=curved?.16+.58*Math.exp(-5*x*x)+.10*Math.abs(x)**8:.68*(1-Math.abs(x));upper.push([x,y]);}
  extrude([[-1,0],...upper,[1,0]],.22);
  for(let i=0;i<upper.length-1;i++){const [x,y]=upper[i],[xx,yy]=upper[i+1];line([x,y+.025,.14],[xx,yy+.025,.14],.036,dark);line([x,y+.065,.15],[xx,yy+.065,.15],.012,trim);}
  box(2,.07,.3,0,.035,0,dark);for(const x of [-.32,0,.32])box(.035,curved?.4:.25,.04,x,.17,.14,dark);
 }
 switch(type){
 case 'jp-base':masonry();break;
 case 'jp-stone-wall':masonry(2,.5,1.2);break;
 case 'jp-stone-corner':masonry(1,1,1.2);break;
 case 'jp-story':case 'jp-entry-story':case 'jp-dark-story':
  for(const x of [-.94,.94])box(.12,1.2,2,x);box(1.76,1.2,.12,0,.6,-.94);
  if(type==='jp-entry-story'){for(const x of [-.615,.615])box(.53,1.2,.12,x,.6,.94);box(.7,.25,.12,0,1.075,.94);}else box(1.76,1.2,.12,0,.6,.94);
  break;
 case 'jp-gallery-wall':{
  // Real openings: the parapet protects the legs, with timber posts above.
  const sx=Math.abs(part.scale?.[0]||1),bays=Math.max(1,Math.min(64,Math.ceil(2*sx/4))),post=Math.min(.16/sx,.15);
  const profile=japaneseWallProfile(1.2);
  const sill=new THREE.BoxGeometry(2,profile.sill,.18),si=sill.index.array;
  sill.setIndex([...si.slice(0,18),...si.slice(24)]); // Bottom rests on the courtyard.
  mesh(sill,[0,profile.sill/2,0]);
  box(2,profile.beam,.18,0,1.2-profile.beam/2,0,dark);
    for(let i=0;i<=bays;i++){
   const g=new THREE.BoxGeometry(post,profile.opening,.18),index=g.index.array;
   // Top and bottom are buried in the sill and lintel.
   g.setIndex([...index.slice(0,12),...index.slice(24)]);
   mesh(g,[-1+post/2+(2-post)*i/bays,profile.sill+profile.opening/2,0],dark);
  }
  break;
 }
 case 'jp-wall':case 'jp-timber-wall':box(2,1.2,.18);break;
 case 'jp-hip-roof':hip();break;
 case 'jp-tier-roof':hip(true);break;
 case 'jp-gable-roof':sweptGable();break;
 case 'jp-half-roof':halfPanel();break;
 case 'jp-irimoya':hip(true);{const before=group.children.length;sweptGable(false,2);for(const z of [-1, .97]){const points=[[-1,curve(1)-.06],[1,curve(1)-.06]];for(let i=8;i>=0;i--){const x=-1+i/4;points.push([x,curve(Math.abs(x))-.06]);}extrude(points,.03,white,z);}for(const m of group.children.slice(before)){m.scale.multiplyScalar(.52);m.position.multiplyScalar(.52);m.position.y+=curve(.5)-.52*curve(1);}}break;
 case 'jp-chidori':gable();break;
 case 'jp-swept-gable':{
  const points=[[-1,.12],[1,.12]];for(let i=8;i>=0;i--){const x=-1+i/4;points.push([x,curve(Math.abs(x))-.06]);}
  const m=extrude(points,.08),a=m.geometry.attributes.position,uv=m.geometry.attributes.uv;
  for(let i=0;i<a.count;i++)uv.setXY(i,(a.getX(i)+1)/2,(a.getY(i)-.12)/.48);
  break;
 }
 case 'jp-karahafu':gable(true);break;
 case 'jp-eave':{sweptGable(true,2);for(const m of group.children){m.position.applyAxisAngle(new THREE.Vector3(0,1,0),Math.PI/2);m.position.z+=.5;m.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI/2));}break;}
 case 'jp-wall-cap':sweptGable(false,.4,material,4);break;
 case 'jp-ridge':box(2.08,.17,.2);break;
 case 'jp-window':box(1.08,.86,.08,0,.4,.025);break;
 case 'jp-katomado':{const s=new THREE.Shape();s.moveTo(-.45,0);s.lineTo(.45,0);s.lineTo(.45,.6);s.bezierCurveTo(.45,.82,.15,.76,0,1);s.bezierCurveTo(-.15,.76,-.45,.82,-.45,.6);s.closePath();mesh(new THREE.ExtrudeGeometry(s,{depth:.06,curveSegments:4,bevelEnabled:false}));const pts=s.getPoints(10);for(let i=0;i<pts.length-1;i++)line([pts[i].x,pts[i].y,.08],[pts[i+1].x,pts[i+1].y,.08],.026,trim);for(const x of [-.24,0,.24])box(.025,.62,.035,x,.33,.085,trim);break;}
 case 'jp-arrow':box(.7,1,.12);extrude([[-.11,.3],[.11,.3],[0,.65]],.02,dark,.065);break;
 case 'jp-torii':{
  const cap=new THREE.MeshStandardMaterial({color:'#242723',roughness:.8});
  // Slightly inward-leaning round posts and a continuous swept lintel.
  for(const sign of [-1,1]){
   const bottom=new THREE.Vector3(sign*1.08,.01,0),top=new THREE.Vector3(sign*.98,2.64,0),axis=top.clone().sub(bottom);
   const post=mesh(new THREE.CylinderGeometry(.115,.15,axis.length(),8),bottom.clone().add(top).multiplyScalar(.5).toArray());
   post.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),axis.normalize());
   mesh(new THREE.CylinderGeometry(.16,.175,.18,8),[bottom.x,.09,0],cap);
  }
  const lintel=(height,thickness,depth,mat)=>{
   const profile=[];
   for(let i=0;i<=8;i++){const x=-1.65+3.3*i/8;profile.push([x,height+.13*(x/1.65)**2]);}
   for(let i=8;i>=0;i--){const x=-1.65+3.3*i/8;profile.push([x,height+.13*(x/1.65)**2-thickness]);}
   extrude(profile,depth,mat);
  };
  lintel(2.66,.16,.29,material);lintel(2.74,.08,.36,cap);
  box(2.75,.16,.2,0,2.03);
  box(.16,.59,.17,0,2.335);
  // A plain plaque leaves the gate editable without baked lettering.
  box(.29,.39,.035,0,2.34,.115,cap);
  break;
 }
 case 'jp-gate':for(const x of [-.8,.8]){box(.22,1.6,.4,x);box(.32,.15,.5,x,.075,0,white);}box(1.9,.24,.4,0,1.52);box(2.15,.12,.5,0,1.7);break;
 case 'jp-gate-doors':for(const x of [-.4,.4]){box(.78,1.5,.12,x);for(const y of [.25,.75,1.25]){box(.75,.06,.04,x,y,.08,dark);for(const dx of [-.25,0,.25])mesh(new THREE.SphereGeometry(.025,4,3),[x+dx,y,.11],trim);}}break;
 case 'jp-balcony':for(const x of [-1.08,1.08])box(.25,.1,2.4,x);for(const z of [-1.08,1.08])box(1.91,.1,.25,0,.05,z);for(let side=0;side<4;side++){const before=group.children.length;railing(2.35,1.17);for(const m of group.children.slice(before)){m.position.applyAxisAngle(new THREE.Vector3(0,1,0),side*Math.PI/2);m.rotation.y=side*Math.PI/2;}}break;
 case 'jp-railing':railing();break;
 case 'jp-bracket':box(.14,.45,.18);box(.5,.12,.22,0,.36,.07);box(.72,.1,.32,0,.47,.12);break;
 case 'jp-shachi':extrude([[-.14,0],[.15,0],[.24,.18],[.12,.32],[.09,.52],[.28,.87],[.05,.8],[-.16,1],[-.1,.62],[-.22,.36],[-.36,.23],[-.4,.11],[-.2,.1]],.12);mesh(new THREE.SphereGeometry(.025,4,3),[-.29,.21,.071],dark);box(.45,.08,.28);break;
 case 'jp-crest':for(let i=0;i<8;i++){const a=i*Math.PI/4,m=mesh(new THREE.SphereGeometry(.11,6,4),[Math.sin(a)*.19,.32+Math.cos(a)*.19,0]);m.scale.set(1,1,.35);}mesh(new THREE.CylinderGeometry(.13,.13,.08,24),[0,.32,0]).rotation.x=Math.PI/2;break;
 case 'jp-tiger':{extrude([[-.7,0],[-.38,0],[-.32,.14],[.25,.14],[.4,.02],[.7,.02],[.6,.16],[.46,.23],[.66,.36],[.59,.52],[.4,.57],[.25,.41],[-.05,.44],[-.4,.36],[-.55,.18]],.065);break;}
 }
 for(const mat of [dark,trim,white])if(!used.has(mat))mat.dispose();
}
