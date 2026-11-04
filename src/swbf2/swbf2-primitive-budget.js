// CollisionBodyPrimitive::Read uses a fixed 1,024-entry global hash table.
// _Find never terminates when it is full. Leave room for mission/side assets.
export const SWBF2_PRIMITIVE_CAPACITY=1024;
export const SWBF2_PRIMITIVE_BUDGET=768;
export function allocatePrimitiveBudget(assets){
 const entries=assets.flatMap((asset,index)=>asset.primitives.map((primitive,order)=>({primitive,index,order,priority:primitive.shape!==4?3:asset.role==='details'?0:/floor|ceiling|wall|railing/.test(primitive.source??'')?2:1})));
 entries.sort((a,b)=>b.priority-a.priority||a.index-b.index||a.order-b.order);
 // Keep spheres analytic; a box has an exact twelve-triangle serialization.
 if(entries.filter(e=>e.primitive.shape!==4).length>SWBF2_PRIMITIVE_BUDGET)throw Error('This scene has too many non-box collision primitives for the game. Split it into separate maps.');
 return {retained:new Set(entries.slice(0,SWBF2_PRIMITIVE_BUDGET).map(e=>e.primitive)),requested:entries.length,converted:Math.max(0,entries.length-SWBF2_PRIMITIVE_BUDGET),budget:SWBF2_PRIMITIVE_BUDGET,reserved:SWBF2_PRIMITIVE_CAPACITY-SWBF2_PRIMITIVE_BUDGET};
}
