import {resizeScene,humanRoutes} from '../walk/human-scale.js';
import {makePart} from '../core/model.js';

// Editable approximation based on exterior photographs, not measured survey data.
export function castleKeepParts(){
 const parts=[],roof='#69988b',white='#eeeade';
 const add=(type,position,scale=[1,1,1],color,rotation=[0,0,0],name,parameters)=>{const p=makePart(type,{position,scale,rotation,...(color?{color}:{}),...(name?{name}:{}),...(parameters?{parameters}:{})});parts.push(p);return p;};
 const widths=[4.4,4.15,3.35,3.1,2.45],heights=[1.7,1.7,1.5,1.5,1.6],base=widths[0]/.76;
 add('jp-base',[0,0,0],[base,2.5,base*.84],undefined,undefined,'Keep • stone foundation');
 // Four independently editable trapezoidal half-roof planes meet along the hips.
 function collar(y,outerW,outerD,innerW,innerD,rise,label){
  for(const sign of [-1,1]){
   add('jp-half-roof',[sign*innerW,y,0],[outerW-innerW,rise,outerD],roof,[0,sign===1?0:Math.PI,0],label+' • '+(sign===1?'east':'west')+' half',{roofInnerSpan:innerD/outerD});
   add('jp-half-roof',[0,y,sign*innerD],[outerD-innerD,rise,outerW],roof,[0,sign===1?-Math.PI/2:Math.PI/2,0],label+' • '+(sign===1?'front':'back')+' half',{roofInnerSpan:innerW/outerW});
  }
 }
 function pitched(y,w,d,centerZ,rise,label){
  for(const sign of [-1,1])add('jp-half-roof',[0,y,centerZ],[w,rise,d],roof,[0,sign===1?0:Math.PI,0],label+' • '+(sign===1?'right':'left')+' half');
  for(const sign of [-1,1])add('jp-swept-gable',[0,y,centerZ+sign*d],[w,rise,1],white,[0,sign===1?0:Math.PI,0],label+' • gable');
  add('jp-ridge',[0,y+rise*.66,centerZ],[d,1,1],roof,[0,Math.PI/2,0],label+' • ridge');
 }
 let y=3;
 for(let level=0;level<widths.length;level++){
  const w=widths[level],d=w*.83,h=heights[level],top=level===widths.length-1,start=parts.length,group=crypto.randomUUID();
  add(level===0?'jp-entry-story':top?'jp-dark-story':'jp-story',[0,y,0],[w,h/1.2,d],top?'#303a32':white,undefined,'Tier '+(level+1)+' • walls');
  for(const side of [-1,1]){
   const n=top?5:7;for(let i=0;i<n;i++){const x=(i-(n-1)/2)*w*1.65/n;if(!(level===0&&side===1&&Math.abs(x)<w*.35))add('jp-window',[x,y+(top?.65:.32),side*(d+.015)],[top?.48:.34,top?.9:.7,.5],top?'#c2c1ac':'#e9e5d7',[0,side===1?0:Math.PI,0]);}
   for(const z of [-d*.6,0,d*.6])if(!top||z!==0)add('jp-window',[side*(w+.015),y+.35,z],[.35,.7,.5],'#e9e5d7',[0,side*Math.PI/2,0]);
   if(top){add('jp-tiger',[side*(w+.03),y+.17,0],[1,.75,1],undefined,[0,side*Math.PI/2,0]);for(const x of [-w*.55,w*.55])add('jp-tiger',[x,y+.12,side*(d+.035)],[.7,.6,1],undefined,[0,side===1?0:Math.PI,0]);}
  }
  if(top)add('jp-balcony',[0,y+.63,0],[w,1,d],'#ad9b65',undefined,'Crown • observation balcony');
  const ry=y+h-.22,label='Tier '+(level+1)+' roof';
  if(top){
   collar(ry,w+.6,d+.6,w*.58,d*.70,1.3,label+' skirt');
   pitched(ry+.40,w*.86,d*.73,0,2.5,label+' crown');
   for(const sign of [-1,1])add('jp-shachi',[0,ry+.40+2.5*.66+.10,sign*d*.73],[.48,.72,.48],undefined,[0,sign===1?Math.PI/2:-Math.PI/2,0]);
  }else{
   const nextW=widths[level+1],nextD=nextW*.83,rise=1.7;
   collar(ry,w+.65,d+.65,nextW*.89,nextD*.89,rise,label);
   // Major front/back gables alternate with smaller paired side gables.
   if(level%2===0){
    for(const sign of [-1,1])pitched(ry-.02,w*.79,.65,sign*(d-.02),3.0,label+' projecting '+(sign===1?'front':'back'));
   }else{
    for(const sign of [-1,1])for(const x of [-w*.48,w*.48]){
     const begin=parts.length;pitched(ry+.03,w*.33,.5,sign*(d+.05),1.9,label+' small gable');for(const p of parts.slice(begin)){p.position[0]+=x;const px=p.position[0];p.position[0]=p.position[2];p.position[2]=-px;p.rotation[1]+=Math.PI/2;}
    }
   }
   // A small curved accent belongs at the entrance, not on every roof tier.
  }
  for(const p of parts.slice(start))p.assemblyId=group;
  y=ry+.78;
 }
 const stairsIndex=parts.length;
 add('jp-gate',[0,3,widths[0]*.83+.06],[1.5,.9,1]);
 add('jp-karahafu',[0,4.55,widths[0]*.83+.18],[1.3,1.1,1.4],white);
 {resizeScene(parts,2,2);const rise=6,steps=Math.ceil(rise/.2),run=steps*.3;parts.splice(stairsIndex,0,makePart('stair-route',{name:'Keep • entrance stairs',color:'#777b76',position:[0,0,(widths[0]*.83+.06)*2+run+.2],rotation:[0,Math.PI,0],route:{width:4.8,thickness:.18,gap:.15,segments:[{kind:'stairs',run,rise,steps,turn:'straight',fillToGround:true},{kind:'landing',run:.8,rise:0,steps:1,turn:'straight',fillToGround:true}]}}));humanRoutes(parts);}
 return parts;
}
