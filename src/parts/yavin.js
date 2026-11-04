import * as T from '../../vendor/three.module.js';

export const YAVIN_PARTS=[{id:'yavin-gallery',name:'Arena gallery block',category:'Yavin',icon:'▥',color:'#ffffff',surface:'yavin-stone',surfaceScale:.35}];
export const YAVIN_GALLERY_DEFAULTS={bayWidth:16,bayDepth:7,terraceHeight:4.2,passageWidth:3.6,passageHeight:3.2,pierHeight:3};

// One repeatable fighting-terrace bay, abstracted from the BF1 arena's large
// gallery meshes. The tapered underpass and the upper lane are real spaces.
export function buildYavin(type,group,material,parameters={}){
 if(type!=='yavin-gallery')return;
 const p={...YAVIN_GALLERY_DEFAULTS,...parameters},w=p.bayWidth/2,h=p.terraceHeight,d=p.bayDepth,door=p.passageWidth/2,head=p.passageHeight,neck=door*.68;
 const shape=new T.Shape();
 const outline=[[-w-.35,0],[-w-.35,.25],[-w,.6],[-w,h],[w,h],[w,.6],[w+.35,.25],[w+.35,0],[door,0],[neck,head],[-neck,head],[-door,0]];
 outline.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
 const body=new T.ExtrudeGeometry(shape,{depth:d,bevelEnabled:false,steps:1});body.translate(0,0,-d/2);
 const mesh=new T.Mesh(body,material);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);
 const box=(width,height,depth,x,y,z)=>{if(height<=0)return;const m=new T.Mesh(new T.BoxGeometry(width,height,depth),material);m.position.set(x,y+height/2,z);m.castShadow=m.receiveShadow=true;group.add(m);};
 // Back cover leaves the front of the upper gallery open for lateral travel.
 const pierWidth=Math.min(3.2,p.bayWidth*.24),back=-d/2+.45;
 for(const sign of [-1,1])box((p.bayWidth-pierWidth)/2,1.05,.65,sign*(pierWidth/2+(p.bayWidth-pierWidth)/4),h,back);
 if(p.pierHeight){
  box(pierWidth,p.pierHeight,1.25,0,h,-d/2+.625);
  box(pierWidth+.4,.22,1.5,0,h+p.pierHeight*.65,-d/2+.625);
  box(pierWidth-.35,.25,1,0,h+p.pierHeight,-d/2+.625);
 }
}
