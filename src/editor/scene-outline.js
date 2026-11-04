import {matchesSearch} from './editor-interactions.js';
import {assemblyLabel} from '../core/assemblies.js';

// Scene organization is a view of the existing parts, not a second object model.
export function createSceneOutline(host,{select,rename,frame,toggleVisibility,showAll}){
 const expanded=new Set();let parts=[],selected=new Set(),hidden=new Set();
 host.innerHTML='<div class="scene-heading"><h2>Scene</h2><span class="scene-count"></span></div><input class="scene-search" type="search" aria-label="Find in scene" placeholder="Find in scene…"><div class="scene-actions"><button data-action="expand">Expand all</button><button data-action="collapse">Collapse all</button><button data-action="frame">Frame selected</button></div><button class="scene-show-all" data-action="show-all">Show all</button><div class="scene-nodes" aria-label="Scene objects"></div><p class="scene-help">Click an object group to select it; expand it to select individual parts. Shift-click to select several.</p>';
 const search=host.querySelector('input'),list=host.querySelector('.scene-nodes');
 const groups=()=>{const result=new Map();for(const p of parts)if(p.assemblyId){if(!result.has(p.assemblyId))result.set(p.assemblyId,[]);result.get(p.assemblyId).push(p);}return result;};
 search.oninput=draw;
 const revealButton=document.createElement('button');revealButton.type='button';revealButton.dataset.action='reveal';revealButton.textContent='Highlight selected';revealButton.title='Find the current selection in the scene explorer';host.querySelector('[data-action=frame]').after(revealButton);
 revealButton.onclick=revealSelection;
 function revealSelection(){
  if(!selected.size)return;
  search.value='';
  const all=groups(),keys=new Set();
  for(const p of parts.filter(p=>selected.has(p.id))){
   if(p.assemblyId&&all.get(p.assemblyId).every(q=>selected.has(q.id)))keys.add(p.assemblyId);
   else{if(p.assemblyId)expanded.add(p.assemblyId);keys.add(p.id);}
  }
  draw();
  const rows=[...list.querySelectorAll('.scene-row')].filter(row=>keys.has(row.dataset.key));
  for(const row of rows)row.classList.add('scene-revealed');
  const target=rows[0];if(!target)return;
  target.scrollIntoView({block:'nearest',inline:'nearest'});
  target.querySelector('.scene-select')?.focus({preventScroll:true});
 }
 host.querySelector('[data-action=expand]').onclick=()=>{for(const id of groups().keys())expanded.add(id);draw();};
 host.querySelector('[data-action=collapse]').onclick=()=>{expanded.clear();draw();};
 host.querySelector('[data-action=frame]').onclick=frame;host.querySelector('[data-action=show-all]').onclick=showAll;
 function button(label,className,action){const b=document.createElement('button');b.type='button';b.className=className;b.textContent=label;b.onclick=action;return b;}
 function copyBadge(host,copied){if(!copied)return;const badge=document.createElement('span');badge.className='scene-copy-badge';badge.textContent='COPY';badge.title='Shares exported resources with its copies. Shape, scale or material edits make this object unique.';host.append(badge);}
 function eye(ids,name){const off=ids.every(id=>hidden.has(id)),b=button('','scene-eye',()=>toggleVisibility(ids));b.title=(off?'Show ':'Hide ')+name+' (viewport only)';b.setAttribute('aria-label',(off?'Show ':'Hide ')+name);b.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>'+(off?'<path d="m3 3 18 18"/>':'')+'</svg>';return b;}
 function partRow(p,nested=false,groupName=''){
  const row=document.createElement('div');row.className='scene-row'+(nested?' scene-child':'');
  const b=button('','scene-select',e=>select(p.id,e.shiftKey,true));b.title=p.name+' · '+(p.interior?'Interior':p.route?'Stair route':'Part');b.setAttribute('aria-pressed',String(selected.has(p.id)));
  const icon=document.createElement('span');icon.className='scene-icon';icon.textContent=p.interior?'▦':p.route?'▤':'◆';icon.style.color=p.color;icon.setAttribute('aria-hidden','true');const label=document.createElement('span');label.className='scene-name';label.textContent=groupName&&p.name.startsWith(groupName+' • ')?p.name.slice(groupName.length+3):p.name;b.setAttribute('aria-label',p.name);b.append(icon,label);copyBadge(b,p.instanceCopy);b.disabled=hidden.has(p.id);row.classList.toggle('scene-hidden',hidden.has(p.id));row.append(b,eye([p.id],p.name));return row;
 }
 function draw(){
  const scroll=list.scrollTop,focused=document.activeElement,focusKey=focused?.closest('.scene-row')?.dataset.key,focusClass=focused?.className;
  host.querySelector('[data-action=show-all]').hidden=!hidden.size;host.querySelector('[data-action=show-all]').textContent='Show all · '+parts.filter(p=>hidden.has(p.id)).length+' hidden';list.replaceChildren();const all=groups(),query=search.value.trim().toLowerCase(),done=new Set();
  host.querySelector('.scene-count').textContent=all.size+' object group'+(all.size===1?'':'s')+' · '+parts.length+' parts';host.querySelector('[data-action=frame]').disabled=!selected.size;revealButton.disabled=!selected.size;
  for(const p of [...parts].reverse().sort((a,b)=>Number(!!b.assemblyId)-Number(!!a.assemblyId))){
   if(!p.assemblyId){if(!query||matchesSearch(query,[p.name])){const row=partRow(p);row.dataset.key=p.id;list.append(row);}continue;}
   const id=p.assemblyId;if(done.has(id))continue;done.add(id);const members=all.get(id),name=assemblyLabel(members),matchesGroup=matchesSearch(query,[name]),visible=members.filter(q=>matchesGroup||matchesSearch(query,[q.name]));if(!visible.length)continue;
   const group=document.createElement('div');group.className='scene-group';const row=document.createElement('div');row.className='scene-row scene-group-row';row.dataset.key=id;const open=query?true:expanded.has(id);
   const toggle=button(open?'▾':'▸','scene-toggle',()=>{expanded.has(id)?expanded.delete(id):expanded.add(id);draw();});toggle.setAttribute('aria-label',(open?'Collapse ':'Expand ')+name);toggle.setAttribute('aria-expanded',String(open));
   const chosen=members.filter(q=>selected.has(q.id)).length;const pick=button('','scene-select',e=>select(members[0].id,e.shiftKey,false));pick.setAttribute('aria-label','Select object group '+name);pick.setAttribute('aria-pressed',String(chosen===members.length));if(chosen&&chosen<members.length)row.classList.add('partial');
   const icon=document.createElement('span');icon.className='scene-icon';icon.textContent='▣';icon.setAttribute('aria-hidden','true');const label=document.createElement('span');label.className='scene-name';label.textContent=name;const count=document.createElement('small');count.textContent=members.length;pick.append(icon,label);copyBadge(pick,members.every(p=>p.instanceCopy));pick.append(count);pick.title=name+' · '+members.length+' parts';
   const edit=button('✎','scene-rename',()=>{const input=document.createElement('input');input.value=name;input.maxLength=80;input.setAttribute('aria-label','Object group name');let finished=false;const finish=save=>{if(finished)return;finished=true;if(save&&input.value.trim())rename(id,input.value.trim());draw();};input.onkeydown=e=>{e.stopPropagation();if(e.key==='Enter'){e.preventDefault();finish(true);}if(e.key==='Escape')finish(false);};input.onblur=()=>finish(true);pick.replaceWith(input);input.focus();input.select();});edit.setAttribute('aria-label','Rename object group '+name);
   pick.disabled=members.every(p=>hidden.has(p.id));row.classList.toggle('scene-hidden',pick.disabled);row.append(toggle,pick,edit,eye(members.map(p=>p.id),name));group.append(row);if(open){const children=document.createElement('div');children.className='scene-children';for(const q of [...visible].reverse()){const child=partRow(q,true,name);child.dataset.key=q.id;children.append(child);}group.append(children);}list.append(group);
  }
  if(!list.children.length){const empty=document.createElement('p');empty.className='muted small'+(parts.length?'':' scene-empty-hint');empty.textContent=parts.length?'No matching objects.':'Your scene is empty. Add a part to get started.';list.append(empty);if(!parts.length){const draft=document.createElement('p');draft.className='muted small flora-draft-hint';draft.textContent='Plant in progress. Finish plant to add it to the scene.';list.append(draft);}}
  list.scrollTop=scroll;
  if(focusKey){const row=[...list.querySelectorAll('.scene-row')].find(r=>r.dataset.key===focusKey);[...row?.querySelectorAll('button')||[]].find(b=>b.className===focusClass)?.focus({preventScroll:true});}
 }
 return {update(next,ids,hiddenIds){parts=next;selected=ids;hidden=hiddenIds;draw();}};
}
