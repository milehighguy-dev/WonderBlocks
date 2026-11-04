import {JAPANESE_WALL} from '../parts/japanese-wall-profile.js';
import {PLATFORM_MATERIAL_PARTS,readPlatformFinish,editPlatformFinish} from '../platforms/platform-finishes.js';
import {HIGHWAY_MATERIAL_PARTS,readHighwayFinish,editHighwayFinish} from '../highways/highway-finishes.js';
import {paintSurface,sameSurface} from './surface-selection.js';
import {routeFinishParts,ROUTE_PARTS} from '../routes/route-finishes.js';
export function materialSpaces(part){return [...(part?.interior?[{id:'interior',name:'Interior',plan:part.interior}]:[]),...(part?.entranceInteriors||[]).map((s,i)=>({id:s.id,name:'Entrance interior '+(i+1),plan:s.plan}))];}
export function materialPlan(part,scope={}){return scope.spaceId==='hull'?null:materialSpaces(part).find(s=>s.id===(scope.spaceId||materialSpaces(part)[0]?.id))?.plan;}
export function materialTargets(part,scope={}){return [...(scope.face&&!scope.face.highwayComponent&&!scope.face.platformComponent&&part?.type!=='character-reference'?[['face','Selected surface']]:[]),...categoryTargets(part,scope)];}
function categoryTargets(part,scope={}){
 if(!part||part.type==='character-reference')return [];
 if(materialPlan(part,scope)&&scope.levelId==='roof')return [['roof','Roof / top surface']];
 if(materialPlan(part,scope))return [['all','All room surfaces'],...['floor','wall','outside','ceiling','roof'].map(k=>[k,{floor:'Floors',wall:'Inside walls',outside:'Outside walls',ceiling:'Ceilings',roof:'Roof / top surface'}[k]])];
 if(part.flora)return [['all','Whole plant'],['bark','Trunk & branches'],['leaf','Leaves']];
 if(part.platform)return [['all','Whole platform'],...Object.entries(PLATFORM_MATERIAL_PARTS)];
 if(part.highway)return [['all','Whole highway'],...Object.entries(HIGHWAY_MATERIAL_PARTS)];
 if(part.type==='wall-route')return [['all','Whole wall / fence'],...[...new Set(part.route.segments.flatMap(routeFinishParts))].filter(k=>k!=='deck').map(k=>[k,part.route.segments.some(s=>['japanese-open','japanese-roofed'].includes(s.railing?.style))?({walls:'Plaster parapet',posts:'Timber posts',rails:'Timber top beam'}[k]??ROUTE_PARTS[k]):k==='posts'&&part.route.segments.some(s=>s.railing?.style==='buttressed')?'Supports':ROUTE_PARTS[k]])];
 if(part.route)return [['all','Whole route'],...[...new Set(part.route.segments.flatMap(routeFinishParts))].map(k=>[k,part.route.segments.some(s=>s.railing?.style==='yavin-temple-bridge')?({deck:'Bridge deck',underbody:'Bridge structure',posts:'Side blocks',rails:'Cap beams',cap:'Base curbs'}[k]??ROUTE_PARTS[k]):part.route.segments.some(s=>s.railing?.style==='yavin-aqueduct')?({deck:'Aqueduct paving',underbody:'Aqueduct body',cap:'Low curbs',walls:'Passage walls',ceiling:'Passage roof'}[k]??ROUTE_PARTS[k]):ROUTE_PARTS[k]])];
 return [['all','Object surface']];
}
export function readMaterial(part,target='all',scope={}){
 if(part.flora&&target!=='face'){const key=target==='all'?'bark':target;return {color:part.flora.colors[key],preset:part.flora.finishes?.[key]?.preset||'plain',scale:part.flora.finishes?.[key]?.scale||1};}
 if(part.platform)return readPlatformFinish(part,target==='all'?'top':target==='face'?scope.face.platformComponent:target);
 if(part.highway)return readHighwayFinish(part,target==='all'?'road':target==='face'?scope.face.highwayComponent:target);
 if(target==='face'&&scope.face)return {...(part.faceFinishes?.find(f=>sameSurface(f,scope.face))?.finish||scope.face.finish)};
 const plan=materialPlan(part,scope);if(plan&&scope.levelId==='roof'){const f=plan.finishes.roof;return {color:f.color,preset:f.preset,scale:f.scale};}const level=scope.levelId&&scope.levelId!=='all'&&scope.levelId!=='ground'?plan?.storeys?.find(l=>l.id===scope.levelId)?.plan:plan;
 if(level){const f=level.finishes[target==='all'?'wall':target];return {color:f.color,preset:f.preset,scale:f.scale};}
 if(part.route){const allKey=part.type==='wall-route'?(['solid','buttressed','yavin-stepped','yavin-ruined','arched-recess','arched-openings','japanese-open','japanese-roofed'].includes(part.route.segments[0].railing.style)?'walls':'rails'):'deck',s=part.route.segments.find(s=>routeFinishParts(s).includes(target==='all'?allKey:target)),key=target==='all'?allKey:target,f=s?.componentFinishes?.[key];const color=f?.color||(key==='deck'?(s?.floorFinish?.color||part.color):s?.hallway?.color||(key==='roof'&&s?.railing?.style==='japanese-roofed'?JAPANESE_WALL.roof:['japanese-open','japanese-roofed'].includes(s?.railing?.style)&&['posts','rails'].includes(key)?JAPANESE_WALL.timber:s?.railing?.color)||part.color),surface=f?.surface||(key==='rails'&&s?.railing?.style==='yavin-temple-bridge'?{preset:'yavin-bridge-trim',scale:1}:key==='roof'&&s?.railing?.style==='japanese-roofed'?JAPANESE_WALL.roofSurface:key==='deck'?((s?.floorFinish?.surface||(s?.floorFinish?.preset?{preset:s.floorFinish.preset,scale:s.floorFinish.scale}:part.surface))):s?.hallway?.surface||s?.railing?.surface||{preset:'plain',scale:1});return {color,preset:surface?.preset||'plain',scale:surface?.scale||1};}
 return {color:part.color,preset:part.surface?.preset||'plain',scale:part.surface?.scale||1};
}
export function editMaterial(part,target,patch,scope={}){
 if(!materialTargets(part,scope).some(([key])=>key===target))return false;if(target==='face')return paintSurface(part,scope.face,patch);if(target==='all'){if(!materialPlan(part,scope))delete part.faceFinishes;else if(part.faceFinishes)part.faceFinishes=part.faceFinishes.filter(f=>(f.spaceId||'interior')!==(scope.spaceId||'interior')||scope.levelId&&scope.levelId!=='all'&&(f.levelId||'ground')!==scope.levelId);}
 if(part.flora){for(const k of target==='all'?Object.keys(part.flora.colors):[target]){if(patch.color)part.flora.colors[k]=patch.color;if(patch.preset!==undefined||patch.scale!==undefined){part.flora.finishes??={};part.flora.finishes[k]={preset:patch.preset??part.flora.finishes[k]?.preset??'plain',scale:patch.scale??part.flora.finishes[k]?.scale??1};}}return true;}
 if(part.platform)return editPlatformFinish(part,target==='face'?scope.face.platformComponent:target,patch);
 if(part.highway)return editHighwayFinish(part,target==='face'?scope.face.highwayComponent:target,patch);
 const interior=materialPlan(part,scope);
 if(interior&&scope.levelId==='roof'){interior.finishes.roof={...interior.finishes.roof,...patch};}
 else if(interior){const plans=scope.levelId&&scope.levelId!=='all'?[scope.levelId==='ground'?interior:interior.storeys?.find(l=>l.id===scope.levelId)?.plan].filter(Boolean):[interior,...(interior.storeys||[]).map(l=>l.plan)];for(const plan of plans){for(const key of target==='all'?['floor','wall','outside','ceiling','roof']:[target])Object.assign(plan.finishes[key],patch);}}
 else if(part.route){for(const s of part.route.segments)for(const key of target==='all'?routeFinishParts(s):[target]){if(!routeFinishParts(s).includes(key))continue;const current=readMaterial({...part,route:{...part.route,segments:[s]}},key),next={...current,...patch};s.componentFinishes??={};if(s.railing?.style==='kotor-kashyyyk'){const finish={...s.componentFinishes[key]};if(patch.color!==undefined)finish.color=patch.color;if(patch.preset!==undefined||patch.scale!==undefined)finish.surface={preset:next.preset,scale:next.scale};s.componentFinishes[key]=finish;}else s.componentFinishes[key]={color:next.color,surface:{preset:next.preset,scale:next.scale}};}}
 else {if(patch.color)part.color=patch.color;if(patch.preset!==undefined||patch.scale!==undefined)part.surface={preset:patch.preset??part.surface?.preset??'plain',scale:patch.scale??part.surface?.scale??1};}
 return true;
}
