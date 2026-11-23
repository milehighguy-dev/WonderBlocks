// Source attachment accounting. These totals describe instantiated objects,
// not frustum visibility, draw calls, FPS, or a guarantee of runtime capacity.
export const FOLIAGE_REVIEW_BUDGET={leafObjectsPerRoot:8,referenceTransparentQueue:1024};

export function foliageCostReport(files,assets,placements,{assetsOnly=false,meshOnly=false}={}){
 const definitions=new Map(),records=new Map(assets.map(a=>[a.name,a]));
 for(const [path,text] of files)if(path.startsWith('odf/')&&path.endsWith('.odf')){
  const value=key=>text.match(new RegExp('^\\s*'+key+'\\s*=\\s*"([^"]+)"','mi'))?.[1];
  definitions.set(path.slice(4,-4),{kind:value('ClassLabel'),particles:Number(value('NumParticles')??0),distance:Number(value('MaxDistance')??0),children:[...text.matchAll(/^\s*AttachOdf\s*=\s*"([^"]+)"/gmi)].map(m=>m[1].replace(/\.odf$/i,''))});
 }
 const cache=new Map(),active=new Set();
 const walk=name=>{
  if(active.has(name))throw Error('Foliage attachment cycle: '+name);
  if(cache.has(name))return cache.get(name);
  const d=definitions.get(name);if(!d)throw Error('Missing foliage attachment dependency: '+name);
  active.add(name);
  const leaf=d.kind==='leafpatch',record=records.get(name),out={entities:1,leafObjects:leaf?1:0,leafCards:leaf?d.particles:0,collisionHelpers:record?.role==='collision'?1:0,foliageCarriers:record?.role==='foliage'?1:0,requestedLeafDistances:leaf?[d.distance]:[]};
  // Repeated references create repeated instances, even when their ODF is shared.
  for(const child of d.children){const c=walk(child);for(const k of ['entities','leafObjects','leafCards','collisionHelpers','foliageCarriers'])out[k]+=c[k];out.requestedLeafDistances.push(...c.requestedLeafDistances);}
  out.requestedLeafDistances=[...new Set(out.requestedLeafDistances)].sort((a,b)=>a-b);
  active.delete(name);cache.set(name,out);return out;
 };
 const roots=new Map();
 if(!meshOnly)for(const p of placements){const name=p.odf;roots.set(name,(roots.get(name)??0)+1);}
 const perRoot=[...roots].map(([name,instances])=>({name,label:records.get(name)?.label??name,instances,...walk(name),modelHasLOD:!!records.get(name)?.lowDetailTriangles,foliageFollowsModelLOD:false}));
 const total={rootPlacements:placements.length,entities:0,leafObjects:0,leafCards:0,collisionHelpers:0,foliageCarriers:0};
 for(const r of perRoot)for(const k of ['entities','leafObjects','leafCards','collisionHelpers','foliageCarriers'])total[k]+=r[k]*r.instances;
 const warnings=[];
 for(const r of perRoot)if(r.leafObjects>FOLIAGE_REVIEW_BUDGET.leafObjectsPerRoot)warnings.push(`${r.label}: ${r.leafObjects} separate leaf objects and ${r.collisionHelpers} collision helpers per placement (${r.instances} placement${r.instances===1?'':'s'}). Review the canopy object count before using this tree densely; fewer leaf triangles alone do not remove that cost.`);
 for(const r of perRoot)if(r.leafObjects&&r.collisionHelpers>8)warnings.push(`${r.label}: ${r.collisionHelpers} collision helper objects remain per placement. Canopy grouping preserves these physical resources; invisible helpers must not be assumed free to render.`);
 if(total.leafObjects)warnings.push('Native leaf objects have their own rendering path. Trunk LOD and the exported MaxDistance property do not establish that attached leaves leave the transparent queue at the same distance; verify the foliage transition in game.');
 if(total.leafObjects>=FOLIAGE_REVIEW_BUDGET.referenceTransparentQueue)warnings.push(`The source layout instantiates ${total.leafObjects} leaf objects. The inspected PC transparent queue holds ${FOLIAGE_REVIEW_BUDGET.referenceTransparentQueue} objects at once, shared with other scenery. These totals are not simultaneous visibility counts; inspect crowded views in game.`);
 return {version:1,basis:meshOnly?'static-mesh':assetsOnly?'source-layout-only':'exported-placements',runtimeVerified:false,visibilityEstimated:false,foliageDistanceCullingVerified:false,reviewBudget:FOLIAGE_REVIEW_BUDGET,definitions:{leafClasses:[...definitions.values()].filter(d=>d.kind==='leafpatch').length,meshFiles:[...files.keys()].filter(p=>p.endsWith('.msh')).length},total,perRoot,warnings};
}

export function addFoliageCostReport(files,manifest,placements,{meshOnly=false}={}){
 const report=foliageCostReport(files,manifest.assets,placements,{assetsOnly:!!manifest.assetsOnly,meshOnly});
 manifest.renderCost=report;manifest.warnings.push(...report.warnings);
 files.set('source/render-cost.json',JSON.stringify(report,null,2)+'\n');
 return report;
}
