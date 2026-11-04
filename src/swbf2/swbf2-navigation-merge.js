import {planningFile,barrierFile} from './swbf2-navigation.js';

const number='[+-]?(?:\\d+\\.?\\d*|\\.\\d+)(?:[eE][+-]?\\d+)?',key=s=>s.toLowerCase(),escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const validFilename=s=>/^[a-z0-9_][a-z0-9_.-]{0,99}$/i.test(s)&&!/[. ]$/.test(s)&&!/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(s);
function checkedSource(text,request=false){
 text=text.replace(/^\uFEFF/,'');let quoted=false,escaped=false,depth=0,opened=false;
 for(let i=0;i<text.length;i++){
  const c=text[i],next=text[i+1];if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;continue;}
  if(c==='"'){quoted=true;continue;}
  if(c==='/'&&next==='*')throw Error('Native planning, barriers and requests do not support block comments.');
  if(c==='/'&&next==='/'){
   if(!request||!opened||depth!==0)throw Error('Native planning and barriers do not support line comments; requests allow them only after the closing scope.');
   const end=text.indexOf('\n',i);i=end<0?text.length:end;continue;
  }
  if(c==='{'){depth++;opened=true;}if(c==='}'&&--depth<0)throw Error('Unexpected closing brace in navigation source.');
 }
 if(quoted||depth)throw Error('Unclosed scope or string in navigation source.');return text;
}
function scopeEnd(text,open){
 let depth=1,quoted=false,escaped=false;
 for(let i=open+1;i<text.length;i++){const c=text[i];if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;}else if(c==='"')quoted=true;else if(c==='{')depth++;else if(c==='}'&&!--depth)return i+1;}
 throw Error('Unclosed navigation block.');
}
export function navigationBlocks(source,barriers=false){
 const text=checkedSource(source),entries=[],pattern=/\b(Hub|Connection|Barrier)\s*\(\s*"([^"\r\n]+)"\s*\)\s*\{/g;
 let cursor=0,match;const outside=s=>barriers?s.replace(/\bBarrierCount\s*\(\s*\d+\s*\)\s*;/g,'').trim():s.trim();
 while((match=pattern.exec(text))){
  if(outside(text.slice(cursor,match.index))||barriers!==(match[1]==='Barrier'))throw Error('Unexpected source outside navigation records.');
  const name=match[2];if(!/^[\x20-\x7e]{1,15}$/.test(name))throw Error('Native navigation names must be 1–15 ASCII characters: '+name);
  let end=scopeEnd(text,pattern.lastIndex-1);if(text[end]===';')end++;
  entries.push({kind:match[1],name,start:match.index,end,text:text.slice(match.index,end)});cursor=end;pattern.lastIndex=end;
 }
 if(outside(text.slice(cursor)))throw Error('Unexpected source outside navigation records.');return entries;
}
const removeRecords=(source,entries)=>{let text=source.replace(/^\uFEFF/,'');for(const entry of [...entries].sort((a,b)=>b.start-a.start))text=text.slice(0,entry.start)+text.slice(entry.end);return text;};
function positions(text,field){return [...text.matchAll(new RegExp('\\b'+field+'\\s*\\(\\s*('+number+')\\s*,\\s*('+number+')\\s*,\\s*('+number+')\\s*\\)','g'))].map(m=>m.slice(1,4).map(Number));}
function field(text,name,quoted=false){const matches=[...text.matchAll(new RegExp('\\b'+name+'\\s*\\(\\s*'+(quoted?'"([^"\\r\\n]+)"':'('+number+')')+'\\s*\\)','g'))];if(matches.length!==1)throw Error('Invalid navigation field: '+name);return quoted?matches[0][1]:Number(matches[0][1]);}
const finite=values=>values.every(Number.isFinite);
export function parsePlanning(text){
 const records=navigationBlocks(text),hubs=[],connections=[],hubNames=new Map(),connectionNames=new Map(),degrees=new Map();
 for(const record of records.filter(r=>r.kind==='Hub')){
  const p=positions(record.text,'Pos'),radius=field(record.text,'Radius');if(p.length!==1||!finite(p[0])||!Number.isFinite(radius)||radius<0)throw Error('Invalid planning hub: '+record.name);
  if(hubNames.has(key(record.name)))throw Error('Duplicate planning hub: '+record.name);
  const hub={name:record.name,position:p[0],radius,flags:0,partIds:[],kind:'existing',record};hubs.push(hub);hubNames.set(key(hub.name),hub);
 }
 for(const record of records.filter(r=>r.kind==='Connection')){
  const start=field(record.text,'Start',true),end=field(record.text,'End',true),flags=field(record.text,'Flag');
  if(connectionNames.has(key(record.name)))throw Error('Duplicate planning connection: '+record.name);
  if(!hubNames.has(key(start))||!hubNames.has(key(end)))throw Error('Connection references a missing hub: '+record.name);
  if(!Number.isInteger(flags)||flags<0||flags>0xffffffff)throw Error('Invalid connection flags: '+record.name);
  for(const name of [start,end]){const k=key(name),n=(degrees.get(k)||0)+1;degrees.set(k,n);if(n>8)throw Error('Merged planning exceeds eight connections at hub: '+name);hubNames.get(k).flags|=flags;}
  const connection={name:record.name,start:hubNames.get(key(start)).name,end:hubNames.get(key(end)).name,flags,record};connections.push(connection);connectionNames.set(key(record.name),connection);
 }
 if(hubs.length>255||connections.length>255)throw Error('Merged planning exceeds the native limit of 255 hubs or connections.');
 for(const record of records)for(const match of record.text.matchAll(/\bBranchWeight\s*\(\s*"([^"]+)"\s*,[^,]+,\s*"([^"]+)"/g))if(!hubNames.has(key(match[1]))||!connectionNames.has(key(match[2])))throw Error('BranchWeight references a missing hub or connection.');
 return {hubs,connections,hubNames};
}
export function parseBarriers(text){
 const names=new Set();return navigationBlocks(text,true).map(record=>{
  if(names.has(key(record.name)))throw Error('Duplicate AI barrier: '+record.name);names.add(key(record.name));
  const corners=positions(record.text,'Corner'),flags=field(record.text,'Flag');if(corners.length!==4||corners.some(p=>!finite(p))||!Number.isInteger(flags)||flags<0||flags>0xffffffff)throw Error('Invalid AI barrier: '+record.name);
  const dx=corners[1][0]-corners[0][0],dz=corners[1][2]-corners[0][2],length=Math.hypot(dx,dz),width=Math.hypot(corners[3][0]-corners[0][0],corners[3][2]-corners[0][2]);if(length<=1e-9||width<=1e-9)throw Error('Degenerate AI barrier: '+record.name);
  return {name:record.name,corners,flags,partIds:[],kind:'existing',surfaceHeight:corners.reduce((n,p)=>n+p[1],0)/4,record,x:corners.reduce((n,p)=>n+p[0],0)/4,z:corners.reduce((n,p)=>n+p[2],0)/4,dx:dx/length,dz:dz/length,length,width};
 });
}
function barrierTouches(bar,start,end,padding){
 const project=p=>[(p[0]-bar.x)*bar.dx+(p[2]-bar.z)*bar.dz,-(p[0]-bar.x)*bar.dz+(p[2]-bar.z)*bar.dx],p=project(start),q=project(end),half=[bar.length/2+padding,bar.width/2+padding];let lo=0,hi=1;
 for(let i=0;i<2;i++){const delta=q[i]-p[i];if(Math.abs(delta)<1e-9){if(Math.abs(p[i])>half[i])return false;continue;}let a=(-half[i]-p[i])/delta,b=(half[i]-p[i])/delta;if(a>b)[a,b]=[b,a];lo=Math.max(lo,a);hi=Math.min(hi,b);if(lo>hi)return false;}return true;
}
export function levelRequests(source){
 const text=checkedSource(source,true),header=/^\s*ucft\s*\{/.exec(text);if(!header)throw Error('Level request must begin with a ucft scope.');
 const rootEnd=scopeEnd(text,header[0].length-1);if(text.slice(rootEnd).replace(/\/\/[^\r\n]*/g,'').trim())throw Error('Unexpected source after the level request.');
 const entries=[],pattern=/\bREQN\s*\{/g;let cursor=header[0].length;pattern.lastIndex=cursor;let match;
 while((match=pattern.exec(text))&&match.index<rootEnd){
  if(text.slice(cursor,match.index).trim())throw Error('Unexpected source outside REQN blocks.');const end=scopeEnd(text,pattern.lastIndex-1),body=text.slice(pattern.lastIndex,end-1);
  const tokens=[...body.matchAll(/"([^"\r\n]*)"/g)].map(m=>m[1]);if(!tokens.length||body.replace(/"([^"\r\n]*)"/g,'').trim())throw Error('Invalid or nested REQN block.');
  const platforms=tokens.slice(1).filter(t=>/^platform=/i.test(t));entries.push({kind:tokens[0].toLowerCase(),resources:tokens.slice(1),pc:!platforms.length||platforms.some(p=>/^platform=pc$/i.test(p)),start:match.index,end,text:text.slice(match.index,end)});cursor=end;pattern.lastIndex=end;
 }
 if(text.slice(cursor,rootEnd-1).trim())throw Error('Unexpected source outside REQN blocks.');return entries;
}
export function mergeLevelRequest(source,worldName){
 const text=checkedSource(source,true),requests=levelRequests(text),matches=(r,kind)=>r.kind===kind&&r.pc&&r.resources.some(n=>key(n)===key(worldName)),world=requests.find(r=>matches(r,'world'));
 if(!world)return null;const graph=requests.find(r=>matches(r,'congraph'));if(graph&&graph.start<world.start)return text;
 const newline=text.match(/\r\n|\n|\r/)?.[0]||'\n',lineStart=text.lastIndexOf('\n',Math.max(0,world.start-1))+1,leading=text.slice(lineStart,world.start),indent=/^\s*$/.test(leading)?leading:'';
 const request=graph?.text||`REQN${newline}${indent}{${newline}${indent}    "congraph"${newline}${indent}    "${worldName}"${newline}${indent}}`;
 const kept=graph?text.slice(0,graph.start)+text.slice(graph.end):text;return kept.slice(0,world.start)+request+newline+indent+kept.slice(world.start);
}
export async function readNavigationFolder(fileList){
 const inputs=[...fileList].filter(f=>/\.(pln|bar|req)$/i.test(f.name)&&!(f.webkitRelativePath||'').split('/').slice(1,-1).some(p=>/^(wonderblocks-ai-backup_.*|_validation|\.git|backups?)$/i.test(p)));if(inputs.length>256)throw Error('Choose the world source folder, rather than the entire Mod Tools directory.');
 if(inputs.reduce((n,f)=>n+f.size,0)>32*1024*1024)throw Error('Choose a smaller world source folder; navigation sources exceed 32 MB.');
 const entries=await Promise.all(inputs.map(async file=>{if(file.size>8*1024*1024)throw Error('Navigation source is too large: '+file.name);if(!validFilename(file.name))throw Error('Unsupported navigation filename: '+file.name);return {filename:file.name,path:(file.webkitRelativePath||file.name).replaceAll('\\','/'),text:await file.text()};}));
 const seen=new Set(),worlds=[];
 for(const plan of entries.filter(f=>/\.pln$/i.test(f.filename))){
  if(seen.has(key(plan.path)))throw Error('Duplicate planning file: '+plan.path);seen.add(key(plan.path));const base=plan.path.slice(0,-4),worldName=plan.filename.slice(0,-4),bar=entries.find(e=>key(e.path)===key(base+'.bar'));
  let matching=entries.filter(e=>/\.req$/i.test(e.filename)&&new RegExp('"'+escape(worldName)+'"','i').test(e.text));const folder=plan.path.slice(0,plan.path.lastIndexOf('/')+1),local=matching.filter(e=>e.path.slice(0,e.path.lastIndexOf('/')+1)===folder);if(local.length)matching=local;
  const requests=[];for(const req of matching){const text=mergeLevelRequest(req.text,worldName);if(text!==null)requests.push({filename:req.filename,text:req.text});}
  parsePlanning(plan.text);if(bar)parseBarriers(bar.text);
  worlds.push({id:plan.path,worldName,planningFilename:plan.filename,barrierFilename:bar?.filename||worldName+'.bar',planning:plan.text,barriers:bar?.text||'',requests});
 }
 if(!worlds.length)throw Error('No .pln planning file was found in this folder. Choose the existing world source folder.');return worlds.sort((a,b)=>a.id.localeCompare(b.id));
}
export function mergeNavigation(nav,source){
 if(!validFilename(source.planningFilename)||!validFilename(source.barrierFilename)||!/\.pln$/i.test(source.planningFilename)||!/\.bar$/i.test(source.barrierFilename)||key(source.planningFilename.slice(0,-4))!==key(source.barrierFilename.slice(0,-4))||key(source.worldName)!==key(source.planningFilename.slice(0,-4)))throw Error('Planning and barrier files must use the same existing world name.');
 const marker=key(nav.prefix+'_'),owned=r=>key(r.name).startsWith(marker),oldPlan=source.planning.replace(/^\uFEFF/,''),oldBar=source.barriers.replace(/^\uFEFF/,'');
 const planning=removeRecords(oldPlan,navigationBlocks(oldPlan).filter(owned)).trim()+'\n\n'+planningFile(nav).trim()+'\n';
 const graph=parsePlanning(planning),retainedBarriers=removeRecords(oldBar,navigationBlocks(oldBar,true).filter(owned)).replace(/\bBarrierCount\s*\(\s*\d+\s*\)\s*;/g,'').trim();
 const allBarriers=parseBarriers(retainedBarriers+'\n'+barrierFile(nav)),targets=graph.hubs.map(h=>({name:h.name,start:h.position,end:h.position,padding:h.radius+.3,flags:h.flags,generated:owned(h)}));
 for(const c of graph.connections){const a=graph.hubNames.get(key(c.start)),b=graph.hubNames.get(key(c.end));targets.push({name:c.name,start:a.position,end:b.position,padding:Math.max(a.radius,b.radius)+.3,flags:c.flags,generated:owned(c)});}
 const suppressed=[],conflicts=[];
 for(const bar of allBarriers)for(const target of targets)if(owned(bar)!==target.generated&&(bar.flags&target.flags)&&barrierTouches(bar,target.start,target.end,target.padding)){(owned(bar)?suppressed:conflicts).push(bar.name);break;}
 const omitted=new Set(suppressed),kept=allBarriers.filter(b=>!omitted.has(b.name));
 const barriers=`BarrierCount(${kept.length});\n\n`+kept.map(b=>b.record.text).join('\n\n')+'\n';
 const stacked=[];for(const a of graph.hubs.filter(owned))for(const b of graph.hubs.filter(h=>!owned(h)))if((a.flags&b.flags&3)&&Math.abs(a.position[1]-b.position[1])>=1.8&&Math.hypot(a.position[0]-b.position[0],a.position[2]-b.position[2])<a.radius+b.radius)stacked.push({existing:b.name,generated:a.name});
 const warnings=[];if(suppressed.length)warnings.push(`${suppressed.length} generated barriers were omitted to preserve existing planning corridors.`);if(conflicts.length)warnings.push(`${conflicts.length} existing barriers intersect generated planning; existing barriers were retained.`);if(stacked.length)warnings.push(`${stacked.length} existing/generated hub overlaps occur at different heights; review these locations.`);
 const requests=[];for(const req of source.requests||[]){if(!validFilename(req.filename)||!/\.req$/i.test(req.filename))throw Error('Invalid level request filename.');const text=mergeLevelRequest(req.text,source.worldName);if(text!==null){if(requests.some(r=>key(r.filename)===key(req.filename)))throw Error('Selected folders contain different matching requests with the same filename: '+req.filename);requests.push({filename:req.filename,text});}}
 if(!requests.length)warnings.push(`No matching level .req was selected. Add "congraph" "${source.worldName}" before the existing world request in your project.`);
 const existingHubs=graph.hubs.filter(h=>!owned(h)).length,existingConnections=graph.connections.filter(c=>!owned(c)).length;
 if(existingHubs&&nav.hubs.length)warnings.push('Existing and generated planning are retained as separate graphs; add connections between them in ZeroEditor where needed.');
 const strip=({record,...value})=>value,rawHubs=graph.hubs.map(h=>({...strip(h),...nav.hubs.find(n=>n.name===h.name),position:h.position,radius:h.radius})),rawConnections=graph.connections.map(strip),rawBarriers=kept.map(b=>({...strip(b),...nav.barriers.find(n=>n.name===b.name),corners:b.corners})),byName=new Map(rawHubs.map(h=>[key(h.name),h])),adjacency=new Map(rawHubs.map(h=>[h.name,[]]));
 for(const c of rawConnections){adjacency.get(c.start).push(c.end);adjacency.get(c.end).push(c.start);}const components=[],seen=new Set();
 for(const h of rawHubs)if(!seen.has(h.name)){const component=[],pending=[h.name];seen.add(h.name);while(pending.length){const name=pending.pop();component.push(name);for(const next of adjacency.get(name))if(!seen.has(next)){seen.add(next);pending.push(next);}}const index=components.length;components.push({id:index,hubs:component});for(const name of component)byName.get(key(name)).component=index;}
 const merged={...nav,hubs:rawHubs,connections:rawConnections,barriers:rawBarriers,components,warnings:[...nav.warnings,...warnings],stats:{...nav.stats,existingHubs,existingConnections}};
 return {worldName:source.worldName,planningFilename:source.planningFilename,barrierFilename:source.barrierFilename,planning,barriers,requests,navigation:merged,diagnostics:{worldName:source.worldName,hubs:rawHubs.length,connections:rawConnections.length,barriers:kept.length,existingHubs,existingConnections,suppressedGeneratedBarriers:suppressed,existingBarrierConflicts:conflicts,stackedHubPairs:stacked,warnings}};
}
