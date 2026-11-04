import {boxSurface,weldSurface} from '../collision/collision-geometry.js';
import {reviewContactSurface,summarizeContactReviews} from './swbf2-contact-review.js';

export function classifyContactReview(review){
 const infantryCrowding=review.infantry.flaggedSamples>0,vehicleReview=review.vehicle.flaggedSamples>0;
 return {infantryCrowding,vehicleReview,reasons:[...(infantryCrowding?['infantry-crowding']:[]),...(vehicleReview?['vehicle-review']:[])]};
}

export function collisionMeshGroups(bodies,separate=true){
 const groups=new Map();
 for(const body of bodies){const key=separate&&body.mask&3?body.mask+'|'+body.collisionGroup:String(body.mask);if(!groups.has(key))groups.set(key,{mask:body.mask,bodies:[]});groups.get(key).bodies.push(body);}
 return groups;
}
export function primaryCollisionGroup(groups){return [...groups.entries()].sort(([,a],[,b])=>(b.mask===23)-(a.mask===23)||(b.mask===16)-(a.mask===16)||b.bodies.reduce((n,x)=>n+x.surface.triangles.length,0)-a.bodies.reduce((n,x)=>n+x.surface.triangles.length,0))[0];}

// Off changes packaging only: preserve the prepared faces and exact box volumes.
// Different mesh masks and non-box primitive overflow cannot share one model.
export function collisionHelperLayout(asset,retained,separate=true){
 const native=asset.primitives.filter(p=>retained.has(p)),fallback=asset.primitives.filter(p=>!retained.has(p));
 const surfaces=asset.bodies.filter(b=>b.surface),separateGroups=collisionMeshGroups(surfaces),primary=primaryCollisionGroup(separateGroups),separateLimit=primary?63:64;
 const fallbackMasks=new Map();for(const p of fallback)fallbackMasks.set(p.mask,(fallbackMasks.get(p.mask)||0)+1);
 const helperCount=Math.max(0,separateGroups.size-1)+Math.ceil(Math.max(0,native.length-separateLimit)/64)+[...fallbackMasks.values()].reduce((n,count)=>n+Math.ceil(count/5),0);
 const boxCounts=new Map();for(const p of native)if(p.shape===4)boxCounts.set(p.mask,(boxCounts.get(p.mask)||0)+1);
 const conversionMask=surfaces[0]?.mask??fallback[0]?.mask??[...boxCounts].sort((a,b)=>b[1]-a[1])[0]?.[0];
 // Keep analytic shapes and other masks in primitive slots before converting
 // compatible boxes. Their order has no effect on the physical shape.
 const embeddedNative=[...native].sort((a,b)=>Number(b.shape!==4)-Number(a.shape!==4)||Number(b.mask!==conversionMask)-Number(a.mask!==conversionMask));
 const needsMesh=surfaces.length>0||fallback.length>0||native.length>64,limit=needsMesh?63:64,kept=embeddedNative.slice(0,limit),overflow=embeddedNative.slice(limit),converted=[...fallback,...overflow];
 const unsupportedPrimitive=converted.some(p=>p.shape!==4);
 const combinedBodies=[...surfaces.map(b=>({...b,contactPartition:false,contactPartitionTriangles:undefined})),...converted.filter(p=>p.shape===4).map((p,i)=>({id:'embedded-box-'+i,partId:asset.partIds?.[0],surface:boxSurface(p),mask:p.mask,preserveFaces:true,source:'serialized box',sourceBodyIds:[p.id??'embedded-box-'+i]}))];
 const combinedGroups=collisionMeshGroups(combinedBodies,false),mixedMasks=combinedGroups.size>1;
 const contactReview=summarizeContactReviews([...combinedGroups.values()].filter(g=>g.mask&3).map(({mask,bodies})=>reviewContactSurface(weldSurface(bodies.map(b=>b.surface)),mask))),density=classifyContactReview(contactReview);
 const maximumContactTriangles=Math.max(contactReview.infantry.maximumPolygons,contactReview.vehicle.maximumPolygons);
 const required=mixedMasks||unsupportedPrimitive,reasons=[...(mixedMasks?['different-masks']:[]),...(unsupportedPrimitive?['primitive-limit']:[]),...density.reasons];
 if(!separate&&required)throw Error('Separate collision helpers are required to preserve '+(mixedMasks?'different movement/projectile collision profiles.':'non-box collision primitives beyond the per-model limit.'));
 return {
  nativePrimitives:separate?native:kept,meshPrimitives:separate?fallback:[],meshGroups:separate?separateGroups:combinedGroups,embeddedBoxes:separate?0:converted.length,convertedNativeBoxes:separate?0:overflow.length,
  recommendation:{ruleVersion:2,recommended:required||density.infantryCrowding&&helperCount>0,required,helperCount,reasons,maximumContactTriangles,contactReview}
 };
}

export function summarizeCollisionHelpers(assets,retained,layouts=null){
 const reports=assets.map(asset=>({label:asset.label,role:asset.role,...(layouts?.get(asset)??collisionHelperLayout(asset,retained)).recommendation}));
 return {ruleVersion:2,recommended:reports.some(r=>r.recommended),required:reports.some(r=>r.required),helperCount:reports.reduce((n,r)=>n+r.helperCount,0),reasons:[...new Set(reports.flatMap(r=>r.reasons))],contactReview:summarizeContactReviews(reports.map(r=>r.contactReview)),assets:reports};
}
