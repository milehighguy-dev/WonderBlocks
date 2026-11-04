const MIN_SCALE=.05,MAX_SCALE=1000,PIXELS_PER_E_FOLD=160;
function bounds(start,selected,limits){if(limits)return {lower:limits[0],upper:limits[1]};return {
 lower:Math.max(...selected.map(i=>Math.min(MIN_SCALE,Math.abs(start[i]))/Math.abs(start[i]))),
 upper:Math.min(...selected.map(i=>Math.max(MAX_SCALE,Math.abs(start[i]))/Math.abs(start[i])))
};}

export function limitScaleTravel(start,axes,pixels,snap=null,limits=null){
 const selected=[0,1,2].filter(i=>axes.includes('XYZ'[i]));if(!selected.length)return 0;
 const {lower,upper}=bounds(start,selected,limits);let lo=Math.log(lower),hi=Math.log(upper);
 if(snap>0){const step=Math.log1p(snap);lo=Math.floor(lo/step)*step;hi=Math.ceil(hi/step)*step;}
 return Math.max(lo*PIXELS_PER_E_FOLD,Math.min(hi*PIXELS_PER_E_FOLD,pixels));
}

// Snap the multiplier once, rather than rounding each dimension independently.
// A shared bound also keeps proportions intact when any axis reaches a limit.
export function dragScale(start,axes,pixels,snap=null,limits=null){
 if(start.length!==3||start.some(v=>!Number.isFinite(v)||Math.abs(v)<1e-12)||!Number.isFinite(pixels))throw Error('Invalid scale drag.');
 const selected=[0,1,2].filter(i=>axes.includes('XYZ'[i]));
 if(!selected.length)return [...start];
 let logarithm=Math.max(-40,Math.min(40,pixels/PIXELS_PER_E_FOLD));
 if(snap>0){const step=Math.log1p(snap);logarithm=Math.round(logarithm/step)*step;}
 const {lower,upper}=bounds(start,selected,limits);
 const factor=Math.max(lower,Math.min(upper,Math.exp(logarithm)));
 return start.map((value,i)=>selected.includes(i)?value*factor:value);
}
