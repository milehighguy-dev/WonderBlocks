// Independently authored branches. Centerlines, cross-sections and thorn
// placements below are new design data, not transformed source-game vertices.
// Thorn outgrowths replace stem wall patches, so their roots are part of the
// same closed surface. The segmented branch is one continuous sheathed shoot.
const TAU=Math.PI*2;
const mix=(a,b,t)=>a+(b-a)*t;
const add=(a,b)=>a.map((x,i)=>x+b[i]);
const scale=(a,s)=>a.map(x=>x*s);
const sub=(a,b)=>a.map((x,i)=>x-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=a=>scale(a,1/Math.max(1e-12,Math.hypot(...a)));

function skin(sections,{sides=12,thorns=[],height=1.7,morphs={}}={}){
 const positions=[],uv=[],indices=[],rings=[],frames=[],arc=[0],growthUV=[];
 const put=(p,u,v)=>{const id=positions.length/3;positions.push(...p);uv.push(u,v);return id;};
 const point=id=>positions.slice(id*3,id*3+3);
 for(let j=1;j<sections.length;j++)arc.push(arc[j-1]+Math.hypot(...sub(sections[j].p,sections[j-1].p)));
 for(let j=0;j<sections.length;j++){
  const s=sections[j],tangent=unit(sub(sections[Math.min(j+1,sections.length-1)].p,sections[Math.max(0,j-1)].p));
  const x=unit(cross(tangent,[0,0,1])),z=unit(cross(x,tangent)),ring=[];
  frames.push({x,z,tangent});
  for(let k=0;k<=sides;k++){
   const a=k/sides*TAU,c=Math.cos(a),si=Math.sin(a),rough=1+.045*Math.sin(3*a+s.p[1]*2.1)+.025*Math.cos(5*a-.4);
   // Oblique collars are broader to one side, with an angled living lip.
   const asym=1+(s.sheath||0)*(.24*si+.10*Math.cos(2*a+.5));
   const radial=add(scale(x,c*s.rx*rough*asym),scale(z,si*s.rz*rough*asym));
   const p=add(s.p,radial);p[1]+=(s.slant||0)*si;
   ring.push(put(p,k/sides*.75,arc[j]*1.5));
  }rings.push(ring);
 }
 const patches=new Map(thorns.map(t=>[t.ring+':'+t.side,t]));
 for(let j=0;j<rings.length-1;j++)for(let k=0;k<sides;k++){
  const a=rings[j][k],b=rings[j][k+1],c=rings[j+1][k+1],d=rings[j+1][k];
  const thorn=patches.get(j+':'+k);
  if(!thorn){indices.push(a,d,c,a,c,b);continue;}
  // A broad four-sided heel is skinned directly out of this stem quad. A
  // second bent section forms a woody hooked wedge, ending at one true tip.
  const base=[a,b,c,d],center=scale(base.map(point).reduce(add,[0,0,0]),.25);
  const angle=(k+.5)/sides*TAU,frame=frames[j];
  const outward=unit(add(scale(frame.x,Math.cos(angle)),scale(frame.z,Math.sin(angle))));
  const across=unit(cross(outward,frame.tangent));
  let branchArc=(arc[j]+arc[j+1])*.5,priorCenter=center;
  let prior=Array.from({length:5},(_,n)=>put(point(base[n%4]),n/4*.75,branchArc*1.5));
  const growth={rootRing:j,points:[center],rings:[prior]};growthUV.push(growth);
  const length=thorn.length,hook=thorn.hook||.045;
  for(const [step,along,girth,lift] of [[1,.44,.62,-.008],[2,.77,.29,hook*.35]]){
   const middle=add(add(center,scale(outward,length*along)),scale(frame.tangent,lift));
   branchArc+=Math.hypot(...sub(middle,priorCenter));priorCenter=middle;
   const next=[],wide=.031*girth,high=.063*girth;
   for(const [n,[cx,cy]] of [[-1,-1],[1,-1],[1,1],[-1,1],[-1,-1]].entries()){
    const p=add(add(middle,scale(across,cx*wide)),scale(frame.tangent,cy*high));
    next.push(put(p,n/4*.75,branchArc*1.5));
   }
   for(let n=0;n<4;n++){const a=prior[n],b=prior[n+1],c=next[n+1],d=next[n];indices.push(a,d,c,a,c,b);}
   growth.points.push(middle);growth.rings.push(next);
   prior=next;
  }
  const end=add(add(center,scale(outward,length)),scale(frame.tangent,hook));
  branchArc+=Math.hypot(...sub(end,priorCenter));
  const tip=put(end,.375,branchArc*1.5);
  growth.points.push(end);growth.rings.push([tip]);
  for(let n=0;n<4;n++)indices.push(prior[n],tip,prior[n+1]);
 }
 // Cap vertices are duplicated for the separate original endgrain atlas zone.
 for(const [j,top] of [[0,false],[rings.length-1,true]]){
  const s=sections[j],r=[];
  for(let k=0;k<=sides;k++){const a=k/sides*TAU;r.push(put(point(rings[j][k]),.875+Math.cos(a)*.115,.5+Math.sin(a)*.44));}
  const center=put(top?s.p:[0,0,0],.875,.5);
  for(let k=0;k<sides;k++)indices.push(...(top?[center,r[k+1],r[k]]:[center,r[k],r[k+1]]));
 }
 const width=mix(.65,1.4,morphs.width??.5),length=mix(.65,1.35,morphs.length??.5),bend=mix(-.32,.32,morphs.bend??.5);
 const deform=p=>{const t=p[1]/height;return [p[0]*width+bend*height*t*t,p[1]*length,p[2]*width];};
 for(let i=0;i<positions.length;i+=3){const p=deform(positions.slice(i,i+3));positions[i]=p[0];positions[i+1]=p[1];positions[i+2]=p[2];}
 // Preserve bark texel density after both scaling and bending. Longitudinal
 // distances follow the deformed centerlines; the endgrain UVs stay unchanged.
 const deformedArc=[0],centers=sections.map(s=>deform(s.p));
 for(let j=1;j<centers.length;j++)deformedArc.push(deformedArc[j-1]+Math.hypot(...sub(centers[j],centers[j-1])));
 for(let j=0;j<rings.length;j++)for(const id of rings[j])uv[id*2+1]=deformedArc[j]*1.5;
 for(const growth of growthUV){
  const points=growth.points.map(deform);let distance=(deformedArc[growth.rootRing]+deformedArc[growth.rootRing+1])*.5;
  for(let j=0;j<points.length;j++){
   if(j)distance+=Math.hypot(...sub(points[j],points[j-1]));
   for(const id of growth.rings[j])uv[id*2+1]=distance*1.5;
  }
 }
 return {positions,uv,indices};
}

function thorn(morphs){
 const heights=[0,.07,.19,.29,.39,.49,.60,.71,.82,.93,1.04,1.15,1.26,1.38,1.50,1.59,1.635,1.655];
 const sections=heights.map((y,i)=>{
  const t=y/1.655,rx=i===heights.length-1?.012:i===heights.length-2?.024:.054-.021*t;
  return {p:[.014*Math.sin(t*4.4)*t,y,.016*Math.sin(t*5.1-.3)*t],rx,rz:rx*(.95+.07*Math.sin(t*7))};
 });
 return skin(sections,{sides:12,height:1.655,morphs,thorns:[
  {ring:2,side:6,length:.145,hook:.028},
  {ring:4,side:0,length:.142,hook:.046},
  {ring:5,side:9,length:.103,hook:.036},
  {ring:8,side:4,length:.124,hook:.05},
  {ring:10,side:0,length:.105,hook:.04},
  {ring:12,side:8,length:.081,hook:.045}
 ]});
}

function segmented(morphs){
 // The internodes grow narrow, then widen into an oblique protective sheath.
 // Each lip folds back into the next shoot; the same surface encloses it.
 const data=[
  [0,.036,.046,0,0],[.08,.034,.043,0,0],
  [.27,.035,.045,.1,0],[.41,.038,.055,.3,.006],
  [.51,.044,.069,.7,.018],[.565,.046,.086,1,.032],
  [.585,.044,.085,1,.033],[.615,.030,.043,.15,.014],[.68,.026,.036,0,0],
  [.83,.031,.042,.1,0],[.99,.036,.058,.35,.007],
  [1.09,.040,.075,.75,.022],[1.145,.044,.089,1,.039],
  [1.165,.043,.086,1,.039],[1.20,.029,.044,.15,.016],[1.27,.025,.034,0,0],
  [1.40,.029,.042,.1,0],[1.55,.034,.058,.4,.007],
  [1.66,.038,.074,.8,.025],[1.76,.042,.084,1,.041],
  [1.80,.040,.082,.9,.039],[1.845,.035,.073,.7,.03],
  [1.885,.026,.050,.3,.014],[1.905,.014,.028,0,0]
 ];
 const sections=data.map(([y,rx,rz,sheath,slant])=>({
  p:[.012*Math.sin(y*4.3)*Math.min(1,y*3),y,.018*Math.sin(y*3.4)+.028*(y/1.9)**2],rx,rz:rz*(1+.3*sheath),sheath,slant
 }));
 sections[0].p=[0,0,0];
 return skin(sections,{sides:12,height:1.9,morphs});
}

export function branchAccent(kind,morphs={}){
 if(kind==='thorn')return thorn(morphs);
 if(kind==='segmented')return segmented(morphs);
 throw Error('Unknown authored branch accent: '+kind);
}
