// Independent root architecture studies. All joint positions and volume paths
// are newly authored here; no source-game mesh, skeleton or vertex layout is
// imported. Skeleton radii use the editor's half-radius convention, while edge
// radii below are physical radii in metres.
const mix=(a,b,t)=>a+(b-a)*t;
const blendPoint=(a,b,t)=>a.map((x,i)=>mix(x,b[i],t));
const node=(number,parent,point,radius)=>({id:'joint:'+number,parent:parent===null?null:'joint:'+parent,point,radius:radius*.5});

// Field offsets are stored in units scaled by girth/.1. Author in real space
// first, then encode them so later girth edits retain the designed cross-section.
function edge(skeleton,start,end,radii,paths){
 const a=skeleton[start],b=skeleton[end];
 return {start:a.id,end:b.id,radii,groups:paths.map(path=>path.map(sample=>{
  const [t,point,radius=1]=sample,girth=mix(radii[0],radii[1],t),line=blendPoint(a.point,b.point,t);
  return {t,offset:point.map((x,i)=>(x-line[i])*.1/girth),radius};
 }))};
}

function curved(skeleton,start,end,radii,lateral=[0,0,0],swell=.04){
 const a=skeleton[start].point,b=skeleton[end].point;
 const path=[0,.15,.34,.55,.75,.90,1].map(t=>{
  const p=blendPoint(a,b,t),wave=Math.sin(Math.PI*t);
  for(let i=0;i<3;i++)p[i]+=lateral[i]*wave;
  return [t,p,1+swell*Math.sin(Math.PI*t*2+.25)*wave];
 });
 return edge(skeleton,start,end,radii,[path]);
}

function buttress(){
 const skeleton=[
  node(0,null,[0,.40,0],.40),
  node(1,0,[.045,1.49,-.035],.32),
  node(2,1,[-.075,3.13,.075],.19),
  node(3,1,[1.76,.075,.15],.075),
  node(4,1,[-.52,.07,1.67],.07),
  node(5,1,[-1.59,.075,-.47],.075),
  node(6,1,[.69,.07,-1.45],.07)
 ];
 const edges=[
  curved(skeleton,0,1,[.40,.32],[.035,.015,-.015],.06),
  curved(skeleton,1,2,[.32,.19],[-.045,.015,.035],.045)
 ];
 for(const [end,thickness,pitch] of [[3,.12,1.60],[4,.115,1.78],[5,.12,1.48],[6,.11,1.68]]){
  const a=skeleton[1].point,b=skeleton[end].point,span=Math.hypot(b[0]-a[0],b[2]-a[2]);
  const normal=[-(b[2]-a[2])/span,0,(b[0]-a[0])/span],radii=[thickness,skeleton[end].radius*2];
  const paths=[];
  // Nine overlapping profiles fill the vertical radial plane. The thin
  // shared thickness creates a true blade, not a large circular root limb.
  for(let level=0;level<=8;level++){
   const q=level/8;
   paths.push([0,.13,.29,.48,.67,.84,1].map(t=>{
    const p=blendPoint(a,b,t),ground=mix(.12,b[1],t),top=(a[1]-.12)*Math.pow(1-t,pitch);
    p[1]=ground+q*top;
    const ripple=.028*Math.sin(Math.PI*t)*Math.sin(Math.PI*q)*(end%2?1:-1);
    p[0]+=normal[0]*ripple;p[2]+=normal[2]*ripple;
    return [t,p,1-.10*Math.sin(Math.PI*t)*Math.sin(Math.PI*q)];
   }));
  }
  edges.push(edge(skeleton,1,end,radii,paths));
 }
 return {id:'temp-base-buttress',name:'Buttress Base',skeleton,edges};
}

function stilt(){
 const skeleton=[
  node(0,null,[0,1.22,0],.35),
  node(1,0,[.07,2.12,-.025],.28),
  node(2,1,[-.035,3.23,.09],.175),
  node(3,0,[.90,1.30,.69],.185),
  node(4,3,[1.66,.085,1.26],.085),
  node(5,0,[-1.02,1.12,.42],.17),
  node(6,5,[-1.81,.075,.91],.075),
  node(7,1,[.64,1.58,-.96],.165),
  node(8,7,[1.36,.075,-1.57],.075),
  node(9,0,[-.79,1.37,-.83],.16),
  node(10,9,[-1.13,.07,-1.70],.07)
 ];
 const edges=[
  curved(skeleton,0,1,[.35,.28],[-.025,.025,.04],.045),
  curved(skeleton,1,2,[.28,.175],[.025,.02,-.03],.055)
 ];
 const roots=[
  {start:0,knee:3,toe:4,radii:[.245,.185,.085],rise:.28,swing:.07},
  {start:0,knee:5,toe:6,radii:[.23,.17,.075],rise:.30,swing:-.055},
  {start:1,knee:7,toe:8,radii:[.21,.165,.075],rise:.18,swing:.065},
  {start:0,knee:9,toe:10,radii:[.22,.16,.07],rise:.27,swing:-.06}
 ];
 for(const root of roots){
  const {start,knee,toe,radii,rise,swing}=root,a=skeleton[start].point,b=skeleton[knee].point,c=skeleton[toe].point;
  const across=[-(c[2]-a[2]),0,c[0]-a[0]],span=Math.hypot(...across),normal=across.map(x=>x/span);
  const arch=[0,.14,.31,.50,.69,.86,1].map(t=>{
   const p=blendPoint(a,b,t),wave=Math.sin(Math.PI*t);
   p[1]+=rise*wave;p[0]+=normal[0]*swing*wave;p[2]+=normal[2]*swing*wave;
   return [t,p,1+.045*wave*Math.sin(t*Math.PI*2)];
  });
  // The root bends outward and eases into a low toe. This curved descent
  // leaves an open arch, unlike straight spider legs or a filled buttress.
  const descent=[0,.13,.29,.48,.68,.85,1].map(t=>{
   const p=blendPoint(b,c,t),wave=Math.sin(Math.PI*t);
   p[1]=c[1]+(b[1]-c[1])*Math.pow(1-t,1.48);
   p[0]+=normal[0]*swing*.6*wave;p[2]+=normal[2]*swing*.6*wave;
   return [t,p,1+.045*Math.sin(Math.PI*t*1.4)*wave];
  });
  edges.push(edge(skeleton,start,knee,radii.slice(0,2),[arch]));
  edges.push(edge(skeleton,knee,toe,radii.slice(1),[descent]));
 }
 return {id:'temp-base-stilt',name:'Stilt Base',skeleton,edges};
}

export const ROOT_BASE_DESIGNS=[buttress(),stilt()];
