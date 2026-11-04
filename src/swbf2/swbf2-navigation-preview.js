// A portable, read-only view of the generated source data. No application
// storage, external libraries, game files or network access are needed.
export function navigationPreview(project,navigation){
 const data=JSON.stringify({project:project.name,parts:project.parts.map(p=>({id:p.id,name:p.name})),navigation}).replaceAll('<','\\u003c').replaceAll('\u2028','\\u2028').replaceAll('\u2029','\\u2029');
 return HEADER+'<script id="navigation-data" type="application/json">'+data+'</script>'+VIEWER;
}

const HEADER=String.raw`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Wonderblocks · AI navigation estimate</title>
<style>
:root{font:15px/1.5 system-ui,sans-serif;color:#e6eef3;background:#101a23;color-scheme:dark}
*{box-sizing:border-box}body{margin:0}main{display:grid;grid-template-columns:260px 1fr;min-height:100vh}
aside{padding:24px;background:#192733;border-right:1px solid #354757}h1{font-size:21px;line-height:1.25;margin:0 0 12px}p{margin:12px 0}.muted{color:#b3c4d0;font-size:13px}
label.field{display:block;margin:14px 0}label.field span{display:block;margin-bottom:5px}input,select,button{font:inherit;color:inherit;background:#223746;border:1px solid #5e7789;border-radius:5px;padding:7px;max-width:100%}input[type=number],select{width:100%}input[type=checkbox]{accent-color:#74d6ae}button{cursor:pointer}button:hover{background:#355166}label.check{display:flex;align-items:center;gap:8px;margin:9px 0}.legend{display:flex;gap:8px;align-items:center;font-size:13px}.swatch{width:18px;height:4px;background:#efac76}.swatch.hub{height:10px;width:10px;border-radius:50%;background:#7dd6b6}.counts{font-variant-numeric:tabular-nums;color:#bce4ef}ul{padding-left:18px;font-size:13px}li{margin:8px 0}
.stage{display:flex;flex-direction:column;min-width:0;height:100vh}canvas{display:block;width:100%;height:100%;min-height:220px;touch-action:none;background:#101a23;cursor:grab}canvas:active{cursor:grabbing}.drawing{position:relative;flex:1;min-height:0}.hint{position:absolute;left:18px;top:12px;color:#b3c4d0;font-size:13px;pointer-events:none}.empty{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none}.empty[hidden]{display:none}footer{min-height:55px;padding:12px 18px;border-top:1px solid #354757;font-size:13px;white-space:pre-line}.height-fields{display:grid;grid-template-columns:1fr 1fr;gap:12px}
@media(max-width:700px){main{grid-template-columns:1fr}aside{border-right:0;border-bottom:1px solid #354757;padding:18px}.stage{height:70vh}.controls{display:grid;grid-template-columns:1fr 1fr;gap:0 16px}.height-fields{grid-column:1/-1}}
</style></head><body><main><aside>
<h1 id="project"></h1><p class="muted">Automatically estimated AI planning. Read-only preview; gameplay still needs testing.</p>
<p class="counts" id="counts" role="status"></p>
<div class="controls">
<label class="field"><span>View</span><select id="view"><option value="top">Top · X/Z</option><option value="front">Front · X/Y</option><option value="side">Side · Z/Y</option></select></label>
<label class="field"><span>Connected group</span><select id="group"><option value="all">All groups</option></select></label>
<div class="height-fields"><label class="field"><span>Minimum height</span><input id="lower" type="number" step="1"></label><label class="field"><span>Maximum height</span><input id="upper" type="number" step="1"></label></div>
<div><label class="check"><input id="hubs" type="checkbox" checked>Hubs</label><label class="check"><input id="links" type="checkbox" checked>Connections</label><label class="check"><input id="barriers" type="checkbox" checked>AI barriers</label></div>
<div><p><button id="fit" type="button">Fit view</button></p><p><button id="reset" type="button">Show all heights</button></p></div>
</div>
<p class="legend"><span class="swatch hub"></span>Hub colour follows height</p><p class="legend"><span class="swatch"></span>Wall, railing or exposed edge</p>
<p class="muted">Native barriers have no height limit. Height filters affect planning; all barrier footprints remain visible. Front and side views show each barrier's source height.</p>
<details><summary>Export notes</summary><ul id="notes"></ul></details>
</aside><section class="stage"><div class="drawing"><canvas id="map" aria-label="Generated AI planning hubs, connections and obstacle footprints">Open source/ai-navigation.json to inspect navigation coordinates.</canvas><div class="hint">Drag to pan · Scroll to zoom · Point at a hub or barrier for its source</div><p class="empty" id="empty" hidden>No walking surfaces were found.</p></div><footer id="selection">Select a height range or connected group to inspect the estimate.</footer></section></main>
`;

const VIEWER=String.raw`<script>
'use strict';
const data=JSON.parse(document.getElementById('navigation-data').textContent),nav=data.navigation;
const el=id=>document.getElementById(id),canvas=el('map'),ctx=canvas.getContext('2d'),partNames=new Map(data.parts.map(p=>[p.id,p.name])),hubByName=new Map(nav.hubs.map(h=>[h.name,h]));
const heights=nav.hubs.map(h=>h.position[1]),minimum=heights.length?Math.floor(Math.min(...heights)):0,maximum=heights.length?Math.ceil(Math.max(...heights)):0;
let center=[0,0],scale=10,drag=null,visibleHubs=[],visibleLinks=[],width=0,height=0,hover=null;
el('project').textContent=data.project;el('lower').value=minimum;el('upper').value=maximum;el('empty').hidden=!!nav.hubs.length;
nav.components.forEach((group,i)=>el('group').add(new Option('Group '+(i+1)+' · '+group.hubs.length+' hubs',String(i))));
const notes=nav.warnings.length?nav.warnings:['No coverage warnings were reported.'];
for(const note of notes){const li=document.createElement('li');li.textContent=note;el('notes').append(li);}
function projection(point){return el('view').value==='top'?[point[0],-point[2]]:el('view').value==='front'?[point[0],point[1]]:[point[2],point[1]];}
function barrierPoints(bar){return bar.corners.map(p=>projection([p[0],bar.surfaceHeight,p[2]]));}
function screen(p){return [(p[0]-center[0])*scale+width/2,height/2-(p[1]-center[1])*scale];}
function world(p){return [(p[0]-width/2)/scale+center[0],(height/2-p[1])/scale+center[1]];}
function colour(h){const t=maximum===minimum?0.5:(h.position[1]-minimum)/(maximum-minimum);return 'hsl('+(170-130*t)+' 65% 65%)';}
function filter(){const group=el('group').value,selected=group==='all'?null:new Set(nav.components[Number(group)].hubs),lo=Number(el('lower').value),hi=Number(el('upper').value);visibleHubs=nav.hubs.filter(h=>(!selected||selected.has(h.name))&&h.position[1]>=lo-.00001&&h.position[1]<=hi+.00001);const names=new Set(visibleHubs.map(h=>h.name));visibleLinks=nav.connections.filter(c=>names.has(c.start)&&names.has(c.end));el('counts').textContent=visibleHubs.length+' / '+nav.hubs.length+' hubs · '+visibleLinks.length+' connections · '+nav.barriers.length+' barriers';canvas.dataset.hubs=String(visibleHubs.length);canvas.dataset.links=String(visibleLinks.length);canvas.dataset.barriers=el('barriers').checked?String(nav.barriers.length):'0';}
function fit(){const points=visibleHubs.map(h=>projection(h.position));if(!points.length&&el('barriers').checked)for(const bar of nav.barriers)points.push(...barrierPoints(bar));if(!points.length){center=[0,0];scale=10;return;}const x=points.map(p=>p[0]),y=points.map(p=>p[1]),lo=[Math.min(...x),Math.min(...y)],hi=[Math.max(...x),Math.max(...y)];center=lo.map((v,i)=>(v+hi[i])/2);scale=Math.min(Math.max(1,width-90)/Math.max(2,hi[0]-lo[0]+4),Math.max(1,height-90)/Math.max(2,hi[1]-lo[1]+4));}
function path(points,close=false){ctx.beginPath();points.forEach((p,i)=>{const q=screen(p);i?ctx.lineTo(...q):ctx.moveTo(...q);});if(close)ctx.closePath();}
function draw(){ctx.clearRect(0,0,width,height);const meterStep=10**Math.ceil(Math.log10(60/scale)),left=world([0,height]),right=world([width,0]);ctx.strokeStyle='#223543';ctx.lineWidth=1;ctx.fillStyle='#7894a7';ctx.font='11px system-ui';for(let x=Math.ceil(left[0]/meterStep)*meterStep;x<=right[0];x+=meterStep){path([[x,left[1]],[x,right[1]]]);ctx.stroke();const q=screen([x,0]);ctx.fillText(Math.round(x)+'m',q[0]+3,height-8);}for(let y=Math.ceil(left[1]/meterStep)*meterStep;y<=right[1];y+=meterStep){path([[left[0],y],[right[0],y]]);ctx.stroke();}
 if(el('barriers').checked)for(const bar of nav.barriers){path(barrierPoints(bar),true);ctx.fillStyle=hover===bar?'#efac7670':'#efac7630';ctx.strokeStyle=hover===bar?'#ffd4a9':'#b67847';ctx.lineWidth=hover===bar?2:1;ctx.fill();ctx.stroke();}
 if(el('links').checked)for(const c of visibleLinks){const a=hubByName.get(c.start),b=hubByName.get(c.end);path([projection(a.position),projection(b.position)]);ctx.strokeStyle='#75cbb0';ctx.lineWidth=1.5;ctx.stroke();}
 if(el('hubs').checked)for(const h of visibleHubs){const p=screen(projection(h.position));ctx.beginPath();ctx.arc(...p,el('view').value==='top'?Math.max(3,Math.min(20,h.radius*scale)):3,0,Math.PI*2);ctx.fillStyle=colour(h);ctx.globalAlpha=h.radius? .2:1;ctx.fill();ctx.globalAlpha=1;ctx.strokeStyle=colour(h);ctx.lineWidth=hover===h?3:1.2;ctx.stroke();ctx.beginPath();ctx.arc(...p,hover===h?5:2.5,0,Math.PI*2);ctx.fill();}
}
function resize(){const rect=canvas.getBoundingClientRect(),ratio=Math.min(2,devicePixelRatio||1);width=rect.width;height=rect.height;canvas.width=Math.max(1,Math.round(width*ratio));canvas.height=Math.max(1,Math.round(height*ratio));ctx.setTransform(ratio,0,0,ratio,0,0);}
function details(item){if(!item)return 'Point at a hub or barrier for its source.';if(item.position)return item.name+' · height '+item.position[1].toFixed(2)+'m · radius '+item.radius.toFixed(2)+'m'+(item.layered?' · point hub for stacked floors':item.radius===0?' · point hub for limited clearance':'')+'\n'+item.partIds.map(id=>partNames.get(id)||id).join(', ');const range=item.sourceHeightRange,heights=range&&Math.abs(range[1]-range[0])>.01?range[0].toFixed(2)+'–'+range[1].toFixed(2):item.surfaceHeight.toFixed(2);return item.name+' · '+(item.sourceKinds??[item.kind]).join(' + ')+' · source height '+heights+'m\n'+(item.sourcePartIds??[item.sourcePartId]).map(id=>partNames.get(id)||id).join(', ');}
function pick(point){let nearest=null,best=12;if(el('hubs').checked)for(const h of visibleHubs){const p=screen(projection(h.position)),distance=Math.hypot(p[0]-point[0],p[1]-point[1]);if(distance<best){best=distance;nearest=h;}}if(nearest)return nearest;if(!el('barriers').checked)return null;for(const bar of nav.barriers){const points=barrierPoints(bar).map(screen);for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((point[0]-a[0])*dx+(point[1]-a[1])*dy)/(dx*dx+dy*dy||1))),distance=Math.hypot(point[0]-a[0]-t*dx,point[1]-a[1]-t*dy);if(distance<best){best=distance;nearest=bar;}}}return nearest;}
canvas.addEventListener('pointerdown',event=>{drag=[event.clientX,event.clientY,...center];canvas.setPointerCapture(event.pointerId);});
canvas.addEventListener('pointerup',()=>{drag=null;});canvas.addEventListener('pointercancel',()=>{drag=null;});
canvas.addEventListener('pointermove',event=>{if(drag){center=[drag[2]-(event.clientX-drag[0])/scale,drag[3]+(event.clientY-drag[1])/scale];draw();return;}const rect=canvas.getBoundingClientRect();hover=pick([event.clientX-rect.left,event.clientY-rect.top]);el('selection').textContent=details(hover);draw();});
canvas.addEventListener('pointerleave',()=>{hover=null;draw();});
canvas.addEventListener('wheel',event=>{event.preventDefault();const rect=canvas.getBoundingClientRect(),point=[event.clientX-rect.left,event.clientY-rect.top],before=world(point);scale=Math.max(.05,Math.min(2000,scale*Math.exp(-Math.max(-100,Math.min(100,event.deltaY))*.002)));const after=world(point);center=center.map((v,i)=>v+before[i]-after[i]);draw();},{passive:false});
for(const id of ['view','group','lower','upper','hubs','links','barriers'])el(id).addEventListener('change',()=>{hover=null;filter();if(id==='view')fit();draw();});
el('fit').onclick=()=>{fit();draw();};el('reset').onclick=()=>{el('lower').value=minimum;el('upper').value=maximum;el('group').value='all';filter();fit();draw();};
window.addEventListener('resize',()=>{resize();fit();draw();});filter();resize();fit();draw();
</script></body></html>`;
