// Organization only: prop and building share the game's static scenery class.
export const CHARACTER_SIZE_METRES=2;
export function recommendSceneryClass(parts,dimensions){
 const largestDimension=Math.max(0,...dimensions),floraOnly=parts.length>0&&parts.every(p=>p.type==='flora');
 return {recommended:floraOnly||largestDimension<=CHARACTER_SIZE_METRES+1e-6?'prop':'building',reason:floraOnly?'flora':'size',dimensions:[...dimensions],largestDimension,characterSizeMetres:CHARACTER_SIZE_METRES};
}
export function sceneryDimensions(pointGroups){
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 for(const points of pointGroups)for(const p of points)for(let i=0;i<3;i++){min[i]=Math.min(min[i],p[i]);max[i]=Math.max(max[i],p[i]);}
 return min.map((v,i)=>Number.isFinite(v)?max[i]-v:0);
}
