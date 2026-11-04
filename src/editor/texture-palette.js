import {SURFACES,surfacePixels} from '../materials/surfaces.js';
import {TEXTURE_CATEGORIES,texturesForCategory} from '../materials/texture-categories.js';
import {LIBRARY_WARNINGS} from '../materials/texture-library.js';
import {bindPaletteSearch,matchesSearch} from './editor-interactions.js';

const previews=new Map();
function texturePreview(id){
 if(!previews.has(id)){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(surfacePixels(id)),128,128),0,0);
  previews.set(id,canvas.toDataURL());
 }
 return previews.get(id);
}
export function createTexturePalette({onSelect,previewUrl=texturePreview}){
 const el=(tag,cls,text)=>{const node=document.createElement(tag);node.className=cls;if(text)node.textContent=text;return node;};
 const panel=el('section','texture-palette');panel.setAttribute('aria-label','Textures');
 const search=el('input','texture-search');search.type='search';search.placeholder='Find a texture…';search.setAttribute('aria-label','Find a texture');
 const clear=el('button','texture-remove','Remove texture');clear.type='button';clear.disabled=true;clear.title='Remove the texture and keep the current color';clear.onclick=()=>onSelect('plain');
 const gallery=el('div','texture-category-grid');gallery.setAttribute('aria-label','Texture categories');
 const header=el('div','texture-browse-header'),back=el('button','texture-back','← Categories'),heading=el('strong','texture-heading');
 back.type='button';back.title='Show all texture categories';header.append(back,heading);
 const count=el('p','muted small');count.setAttribute('role','status');
 const grid=el('div','texture-presets');grid.setAttribute('aria-label','Texture choices');
 const footer=el('div','texture-folder'),openFolder=el('button','texture-folder-open','Open textures folder');openFolder.type='button';openFolder.title='Open the texture library in File Explorer to add your own textures';
 const folderHelp=el('p','muted small','Add tiling images to a category folder, or create a new folder for a category. Save your project, then refresh the editor to see your additions.'),folderStatus=el('p','muted small');folderStatus.setAttribute('role','status');
 openFolder.onclick=async()=>{openFolder.disabled=true;folderStatus.textContent='';try{const response=await fetch('/api/open-textures-folder',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});if(!response.ok){const detail=await response.json().catch(()=>null);throw Error(detail?.error||'Could not open the textures folder. Restart Wonderblocks and try again.');}folderStatus.textContent='Textures folder opened.';}catch(error){folderStatus.textContent=error.message;}finally{openFolder.disabled=false;}};
 footer.append(openFolder,folderHelp,folderStatus);panel.append(search,clear,gallery,header,count,grid,footer);
 if(LIBRARY_WARNINGS.length){const issues=el('details','texture-library-issues');issues.append(el('summary','',LIBRARY_WARNINGS.length+' texture library '+(LIBRARY_WARNINGS.length===1?'issue':'issues')));for(const warning of LIBRARY_WARNINGS)issues.append(el('p','muted small',warning));footer.append(issues);}
 let category=null,selected='plain';
 const image=id=>{const img=el('img','');img.src=previewUrl(id);img.alt='';img.loading='lazy';img.decoding='async';return img;};
 for(const item of TEXTURE_CATEGORIES){
  const button=el('button','texture-category-card');button.type='button';button.dataset.textureCategory=item.id;
  button.title='Show '+item.name+' textures';button.setAttribute('aria-label',item.name+' textures');
  const preview=el('div','texture-category-preview');preview.setAttribute('aria-hidden','true');
  for(let i=0;i<4;i++)preview.append(image(item.preview[i%item.preview.length]));
  button.append(preview,el('span','',item.name),el('small','',texturesForCategory(item.id).length+' textures'));
  button.onclick=()=>{category=item.id;search.value='';draw();back.focus?.({preventScroll:true});};gallery.append(button);
 }
 function syncSelected(){clear.disabled=selected==='plain';for(const button of grid.children){const active=button.dataset.surface===selected;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));}}
 function draw(){
  const query=search.value?.trim()||'',browsing=!!category||!!query;gallery.hidden=browsing;header.hidden=count.hidden=grid.hidden=!browsing;
  if(!browsing){grid.replaceChildren();return;}
  const current=TEXTURE_CATEGORIES.find(c=>c.id===category);
  heading.textContent=query?'Search results':current.name;
  const parts=query?SURFACES.filter(p=>p.id!=='plain'&&matchesSearch(query,[p.name,p.id,...TEXTURE_CATEGORIES.filter(c=>c.ids.has(p.id)).map(c=>c.name)])):texturesForCategory(category);
  count.textContent=parts.length+' textures';grid.replaceChildren();
  for(const part of parts){const button=el('button','texture-card');button.type='button';button.disabled=!!part.unavailable;button.dataset.surface=part.id;button.title=part.unavailable?'Cannot read this image. Restore or replace its file, then reload the editor.':'Apply '+part.name;button.setAttribute('aria-label','Apply '+part.name);button.append(image(part.id),el('span','',part.name));button.onclick=()=>onSelect(part.id);grid.append(button);}
  syncSelected();
 }
 back.onclick=()=>{category=null;search.value='';draw();gallery.children[0]?.focus?.({preventScroll:true});};
 search.oninput=draw;bindPaletteSearch(search,()=>[...(grid.hidden?gallery:grid).children]);draw();
 return {panel,setSelected(id){selected=id||'plain';syncSelected();}};
}
