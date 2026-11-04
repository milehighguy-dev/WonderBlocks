// Independent leaf volumes. These surfaces are generated from authored
// cross-sections and asymmetric angular fields, with no imported mesh data.
// A single continuous surface runs from the attachment base through the stem,
// head and lip, and back down the inside where a form has an open cavity.
const TAU=Math.PI*2;
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const lerp=(a,b,t)=>a+(b-a)*t;
const wrapped=a=>Math.atan2(Math.sin(a),Math.cos(a));
const peak=(a,c,width)=>Math.exp(-((wrapped(a-c)/width)**2));

function closedProfile(profile,evaluate,{sides=28,end=[0,0,0],height=1.5,morphs={}}={}){
 const positions=[],uv=[],indices=[],rings=[];
 const put=(p,u,v)=>{const i=positions.length/3;positions.push(...p);uv.push(u,v);return i;};
 const width=lerp(.68,1.38,morphs.width??.5),length=lerp(.72,1.28,morphs.length??.5),bend=lerp(-.28,.28,morphs.curl??.5);
 function morph(p){const t=p[1]/height;return [p[0]*width+bend*.24*t*t,p[1]*length,p[2]*width+bend*.55*t*t];}
 for(let j=0;j<profile.length;j++){
  const ring=[];for(let i=0;i<=sides;i++){
   const a=i/sides*TAU,p=evaluate(profile[j],a,j);
   ring.push(put(morph(p),i/sides,j/(profile.length-1)));
  }rings.push(ring);
 }
 for(let j=0;j<rings.length-1;j++)for(let i=0;i<sides;i++){
  const a=rings[j][i],b=rings[j][i+1],c=rings[j+1][i+1],d=rings[j+1][i];indices.push(a,d,c,a,c,b);
 }
 const root=put([0,0,0],.5,0),tip=put(morph(end),.5,1);
 for(let i=0;i<sides;i++){indices.push(root,rings[0][i],rings[0][i+1]);indices.push(tip,rings.at(-1)[i+1],rings.at(-1)[i]);}
 return {positions,uv,indices};
}

// Each ring is [radius,height,angular influence]. The head starts well before
// the visible rim, so a broad neck replaces the old detached bowl-on-a-stick.
const CUP_PROFILES={
 horned:[
  [.105,0,0,0],[.145,.17,0,0],[.20,.37,.15,0],[.265,.53,.33,0],
  [.355,.64,.48,1],[.29,.73,.50,0],[.33,.82,.60,0],
  [.405,.91,.72,1.1],[.35,1.015,.74,0],[.385,1.10,.84,0],
  [.445,1.24,1,1.05],[.43,1.275,1,1.02],[.38,1.25,.98,.85],
  [.325,1.09,.80,0],[.245,.90,.55,0],[.12,.73,.22,0]
 ],
 folded:[
  [.065,0,0],[.085,.14,0],[.072,.34,.02],[.09,.55,.09],
  [.16,.70,.28],[.28,.83,.56],[.35,.94,.81],[.405,1.015,1],
  [.397,1.06,1],[.35,1.06,1],[.305,1.01,.87],
  [.24,.89,.62],[.135,.79,.32],[.065,.755,.10]
 ],
 ruffled:[
  [.06,0,0],[.085,.12,0],[.075,.28,.04],[.14,.38,.18],
  [.265,.46,.36],[.40,.60,.58],[.49,.77,.80],[.535,.89,.96],
  [.555,.95,1],[.55,1.005,1],[.515,1.035,1],[.48,1.005,1],
  [.465,.94,.95],[.425,.80,.78],[.34,.66,.54],[.22,.56,.30],[.085,.515,.10]
 ]
};

function horned(morphs){
 return closedProfile(CUP_PROFILES.horned,([r,y,f,tier],a)=>{
  const phase=a+.12*f,spikes=Array.from({length:6},(_,i)=>{const c=i*TAU/6+.15+.07*Math.sin(i*1.9);return peak(phase,c,.21)*(1+.16*Math.sin(i*2.4));}),pointed=Math.max(...spikes);
  const radial=r+(.095*tier*pointed),angle=a+.17*f;
  // Three staggered shelves grow into unequal fleshy horns. They belong to
  // the calyx surface rather than being separate cones placed over a bowl.
  return [Math.cos(angle)*radial*(1+.025*Math.sin(3*a))+f*.035,
   y+.23*tier*pointed+.018*Math.sin(a+.3)*f,
   Math.sin(angle)*radial*1.10+f*.018];
 },{morphs,sides:30,height:1.60,end:[.006,.725,0]});
}

function folded(morphs){
 return closedProfile(CUP_PROFILES.folded,([r,y,f],a)=>{
  const angle=a+.15*f,lobes=.46*Math.cos(3*a+.30)+.045*Math.sin(2*a-.7),radius=r*(1+f*lobes);
  const petalRise=.065*Math.cos(3*a+.30)+.035*Math.sin(a-.6),crease=.075*Math.cos(6*a+.6);
  // Three independently pitched fleshy petals wrap around a deep central
  // crease. The valleys narrow toward the throat instead of making a square.
  return [Math.cos(angle)*radius+f*.015,
   y+(petalRise+crease*.35)*f*f,
   Math.sin(angle)*radius*.94+f*.02];
 },{morphs,sides:30,height:1.22,end:[0,.75,0]});
}

function ruffled(morphs){
 return closedProfile(CUP_PROFILES.ruffled,([r,y,f],a)=>{
  const wave=.026*Math.sin(8*a+.34)+.014*Math.sin(5*a-.2),fold=.018*Math.cos(8*a+.34);
  const radius=r*(1+f*(fold+.045*Math.sin(a*3+.7)));
  const angle=a+.12*f;
  // A rounded lip is made by the outer/upper/inner profile rings, not a thin
  // sawtooth edge. Soft waves carry down into the thick living bowl wall.
  return [Math.cos(angle)*radius+f*.035,
   y+wave*f*f+.035*Math.sin(2*a-.4)*f,
   Math.sin(angle)*radius*.90+f*.025];
 },{morphs,sides:32,height:1.15,end:[.003,.51,0]});
}

const CAP_PROFILES={
 disc:[
  [.055,0,0],[.075,.14,0],[.05,.38,.02],[.075,.61,.12],
  [.18,.69,.35],[.335,.715,.64],[.475,.725,.93],[.515,.76,1],
  [.52,.80,1],[.48,.84,.94],[.37,.90,.73],[.23,.925,.44],[.085,.93,.16]
 ],
 shield:[
  [.065,0,0],[.085,.16,0],[.07,.40,.03],[.10,.65,.17],
  [.25,.72,.39],[.43,.705,.68],[.55,.675,.90],[.60,.68,1],
  [.615,.74,1],[.55,.91,.93],[.43,1.095,.74],[.28,1.225,.48],[.11,1.27,.18]
 ],
 notched:[
  [.08,0,0],[.12,.17,0],[.085,.35,0],[.06,.72,.01],[.075,1.08,.05],[.14,1.24,.15],
  [.36,1.28,.36],[.65,1.25,.62],[.85,1.20,.86],[1.0,1.15,1],
  [.99,1.24,1],[.88,1.53,.88],[.68,1.78,.65],[.43,1.94,.40],[.16,2.0,.14]
 ]
};

function cap(kind,morphs){
 const profile=CAP_PROFILES[kind],notched=kind==='notched',top=notched?2.02:kind==='shield'?1.28:.94;
 return closedProfile(profile,([r,y,f],a)=>{
  const lobe=Math.cos((notched?8:7)*a+.16),wrinkle=(notched?.035:.012)*lobe*f;
  const scallop=notched?.20*(1-lobe)*.5*f*f*f:0;
  const asym=.025*Math.sin(3*a+.6)+.018*Math.cos(a-.4),radius=r*(1+f*asym-scallop);
  const angle=a+.07*f,drop=notched?-.135*lobe*f*f*f:.022*Math.sin(2*a+.2)*f*f;
  // The notched cap is tall and strongly drooping. Disk and shield heads
  // retain their circular volume and separate head/stalk proportions.
  const bend=.025*Math.sin(y/top*Math.PI);
  return [Math.cos(angle)*radius+bend+f*.012,
   y+wrinkle+drop,
   Math.sin(angle)*radius*(kind==='disc'?1.01:.99)+f*.014];
 },{morphs,sides:notched?32:24,height:top+ .05,end:[.003,top,.003]});
}

export function volumeForm(kind,morphs={}){
 if(kind==='horned')return horned(morphs);
 if(kind==='folded')return folded(morphs);
 if(kind==='ruffled')return ruffled(morphs);
 if(kind==='disc'||kind==='shield'||kind==='notched')return cap(kind,morphs);
 throw Error('Unknown volume review form: '+kind);
}
