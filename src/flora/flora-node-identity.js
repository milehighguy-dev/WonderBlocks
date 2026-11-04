// Node IDs are local references. Equivalent copied hierarchies should compare
// alike even when a preset or subtree copy assigned different UUIDs.
export function canonicalFloraNodes(branches,organs){
 const ids=new Map([...branches,...organs].map((node,i)=>[node.id,'node-'+i]));
 const copy=node=>{const result={...node};for(const key of ['id','parent','branch','parentOrgan'])if(ids.has(result[key]))result[key]=ids.get(result[key]);return result;};
 return {branches:branches.map(copy),organs:organs.map(copy)};
}
