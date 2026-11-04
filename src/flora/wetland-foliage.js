import * as T from '../../vendor/three.module.js';
let maps;
// A connected, three-twig willow spray with narrow lanceolate leaves. One
// top-anchored upright card keeps its stalk on the bark and its tips downward.
export function willowTexture(alpha=false){
 if(!maps){
  const width=128,height=256,rgba=new Uint8Array(width*height*4),shapes=[];
  const line=(a,b,r)=>shapes.push({a,b,r});
  function leaf(a,b,w){shapes.push({a,b,w});}
  const trunk=[[64,0],[63,24],[66,55]];for(let i=1;i<trunk.length;i++)line(trunk[i-1],trunk[i],1.5);
  for(let twig=0;twig<3;twig++){
   const points=[[64,24],[64+(twig-1)*23,70],[64+(twig-1)*33,145],[64+(twig-1)*36+Math.sin(twig)*8,245-twig*10]];
   for(let i=1;i<points.length;i++)line(points[i-1],points[i],1.15-i*.15);
   for(let n=0;n<13;n++){
    const t=.12+n*.063,segment=Math.min(2,Math.floor(t*3)),u=t*3-segment,a=points[segment],b=points[segment+1],p=[T.MathUtils.lerp(a[0],b[0],u),T.MathUtils.lerp(a[1],b[1],u)],side=(n+twig)%2?1:-1,length=18+8*Math.sin(n*2.1+twig),tip=[p[0]+side*(12+5*Math.sin(n)),p[1]+length];leaf(p,tip,4.1+Math.sin(n*.7)*.7);
   }
  }
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   let shade=0;
   for(const shape of shapes){const dx=shape.b[0]-shape.a[0],dy=shape.b[1]-shape.a[1],length=Math.hypot(dx,dy),t=((x-shape.a[0])*dx+(y-shape.a[1])*dy)/(length*length);if(t<0||t>1)continue;const d=Math.abs((x-shape.a[0])*dy-(y-shape.a[1])*dx)/length,r=shape.r??shape.w*Math.sin(Math.PI*t)**.8;if(d<r)shade=Math.max(shade,shape.r?.75:.8+.25*(1-d/Math.max(.1,r)));}
   const at=((height-1-y)*width+x)*4,grain=(((x*17+y*31)%23)/23-.5)*.12;rgba[at]=Math.round(89*((shade||.8)+grain));rgba[at+1]=Math.round(126*((shade||.8)+grain));rgba[at+2]=Math.round(44*((shade||.8)+grain));rgba[at+3]=shade?255:0;
  }
  const create=mask=>{const data=rgba.slice();for(let i=0;i<data.length;i+=4){if(mask)data[i]=data[i+1]=data[i+2]=data[i+3];data[i+3]=255;}const texture=new T.DataTexture(data,width,height,T.RGBAFormat);if(!mask)texture.colorSpace=T.SRGBColorSpace;texture.flipY=false;texture.generateMipmaps=true;texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;texture.needsUpdate=true;return texture;};maps=[create(false),create(true)];
 }
 return maps[alpha?1:0];
}
const quad={positions:[-.5,-1,0,.5,-1,0,.5,0,0,-.5,0,0],uv:[0,0,1,0,1,1,0,1],indices:[0,1,2,0,2,3]};
export const WILLOW_SPRAY={id:'willow-hanging-spray',name:'Willow · Hanging Leaf Spray',sourceName:'Original narrow-leaf pendant willow spray',category:'Leaves',paletteCategory:'Leaves',editorAxis:'z-to-y',texture:true,textureMap:()=>willowTexture(),alphaMap:()=>willowTexture(true),iconUrl:new URL('../../assets/reef-flora/willow-hanging-spray.png',import.meta.url).href,triangles:2,meshes:[quad],billboard:{count:1,radius:0,height:0,minSize:1.4,maxSize:1.4,heightScale:2.2,darknessMin:.8,darknessMax:1,seed:701,atlas:1,facing:'upright',anchor:'top'}};
