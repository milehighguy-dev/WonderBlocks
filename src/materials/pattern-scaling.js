// Freeze the current pattern density when switching modes, without changing the silhouette.
export function patternFactors(part,kind){
 const base=part.pattern?.[kind]||[1,1,1];
 const fixed=part.pattern?part.pattern.mode==='fixed':kind==='texture';
 return base.map((v,i)=>v*(fixed?Math.abs(part.scale[i]):1));
}
export function setPatternMode(part,mode){
 const texture=patternFactors(part,'texture');
 part.pattern={mode,texture:texture.map((v,i)=>v/(mode==='fixed'?Math.abs(part.scale[i]):1))};
}
export function preparePatternScaling(project,defaultMode='fixed'){
 project.surfaceScaling??=defaultMode;
 for(const part of project.parts)if(part.pattern?.mode!==project.surfaceScaling)setPatternMode(part,project.surfaceScaling);
 return project;
}
