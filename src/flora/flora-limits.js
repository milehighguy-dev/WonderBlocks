// Authoring budgets are independent of the engine's per-model attachment limit.
export const FLORA_LIMITS=Object.freeze({branches:256,parts:2048});

export function floraCapacityError(flora,{branches=0,parts=0}={}){
 const branchCount=flora.branches.reduce((n,b)=>n+(b?.anchor!==true),0),partCount=flora.organs.length;
 if(branchCount+branches>FLORA_LIMITS.branches)return `Branch limit: ${FLORA_LIMITS.branches} per plant (${branchCount} used, ${branches} requested).`;
 if(partCount+parts>FLORA_LIMITS.parts)return `Leaf/body part limit: ${FLORA_LIMITS.parts} per plant (${partCount} used, ${parts} requested).`;
 return null;
}
