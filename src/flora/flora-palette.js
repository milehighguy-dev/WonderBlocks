import {bindPaletteSearch,matchesSearch} from '../editor/editor-interactions.js';
import {PROCEDURAL_FLORA} from './procedural-flora.js';
export {PROCEDURAL_FLORA} from './procedural-flora.js';
import {FLORA_PALETTE_CATEGORIES} from './flora-part-names.js';
import {KASHYYYK_LEAF_PATCH} from './kashyyyk-foliage.js';
import {ENDOR_REDWOOD_SPRAY,ENDOR_REDWOOD_FOLIAGE} from './endor-foliage.js';
import {SWBF_BILLBOARD_PARTS} from './flora-billboards.js';
import {FLORA_TREE_PRESETS} from './flora-tree-presets.js';
import {FELUCIA_FLORA_PARTS} from './felucia-flora.js';
import {KAPOK_BUTTRESS,KAPOK_BOLE} from './kapok-buttress.js';
import {ASPEN_FLORA_PARTS} from './aspen-foliage.js';
import {CURLED_FERN} from './curled-fern.js';
import {CORAL_PARTS} from './reef-flora.js';
import {WILLOW_SPRAY} from './wetland-foliage.js';
import {TEMP_BASE_PARTS} from './temp-bases.js';
export const FLORA_ASSETS=[...PROCEDURAL_FLORA,KASHYYYK_LEAF_PATCH,...SWBF_BILLBOARD_PARTS,ENDOR_REDWOOD_SPRAY,ENDOR_REDWOOD_FOLIAGE,...FELUCIA_FLORA_PARTS,KAPOK_BUTTRESS,KAPOK_BOLE,...ASPEN_FLORA_PARTS,CURLED_FERN,...CORAL_PARTS,WILLOW_SPRAY,...TEMP_BASE_PARTS,...FLORA_TREE_PRESETS];
const trunkCollection=new Set(['flora-basic-trunk','flora-crown-base',...TEMP_BASE_PARTS.map(part=>part.id)]);
export const FLORA_PALETTE_ASSETS=FLORA_ASSETS.filter(part=>!part.paletteHidden&&(floraPaletteCategory(part)!=='Bases'||trunkCollection.has(part.id)));
const assetLookup=new Map(FLORA_ASSETS.map(a=>[a.id,a]));
export const floraAsset=id=>assetLookup.get(id);
export const floraIconUrl=part=>part.iconUrl;
export function floraPlacementCategory(part){if(part.floraPreset)return 'Whole plants';if(part.profile)return 'Joint parts';if(part.assembly||part.placement?.root)return 'Body presets';return 'Surface parts';}
export function floraPaletteCategory(part){return part.paletteCategory||(part.category==='Leaves'?'Leaves':part.category==='Trunks'||part.assembly?'Flora':'Details');}
export const FLORA_DRAG_TYPE='application/x-wonderblocks-flora';
export function createFloraPalette(onSelect,{onDragStart=()=>{},onDragEnd=()=>{},initialCategory='Bases'}={}){
 const el=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e;};
 const panel=el('section');panel.className='flora-palette';panel.setAttribute('aria-label','Flora parts');
 panel.append(el('h2','Flora parts'));
 const hint=el('p');hint.className='muted small';panel.append(hint);
 const search=el('input');search.type='search';search.placeholder='Find flora parts…';search.setAttribute('aria-label','Find flora parts');panel.append(search);
 const tabs=el('div');tabs.className='flora-palette-tabs';panel.append(tabs);
 const count=el('p');count.className='muted small';panel.append(count);
 const grid=el('div');grid.className='part-grid flora-part-grid';panel.append(grid);let category=FLORA_PALETTE_CATEGORIES.includes(initialCategory)?initialCategory:'Bases';
 const hints={'Tree presets':'Choose a tree, then click the ground. Each tree is a separate editable plant.',Bases:'Choose a base, then click the ground to start a plant. Dragging works too.',Flora:'Choose a part, then click bark or a stalk to attach it. Standalone plants can go on the ground.',Branches:'Choose a branch, then click a joint. Surface twigs attach to bark.',Leaves:'Choose foliage, then click bark or a plant vessel to attach it.',Coral:'Choose a coral growth piece, then click a plant surface to attach it, or the ground to start one.',Details:'Choose a detail, then click bark or a joint to attach it.'};
 const buttons=[];for(const name of FLORA_PALETTE_CATEGORIES){const b=el('button',name);b.onclick=()=>{category=name;search.value='';draw();};buttons.push(b);tabs.append(b);}
 function draw(){const query=(search.value||'').trim().toLowerCase().replaceAll('_',' ');for(const b of buttons){b.className=!query&&b.textContent===category?'active':'';b.setAttribute('aria-pressed',String(!query&&b.textContent===category));}hint.textContent=query?'Search results from every category.':hints[category];const parts=FLORA_PALETTE_ASSETS.filter(p=>query?matchesSearch(query,[p.name,p.sourceName,p.id,floraPaletteCategory(p)]):floraPaletteCategory(p)===category).sort((a,b)=>{const rank=p=>(category==='Flora'||category==='Branches')&&!query?+(floraPlacementCategory(p)==='Surface parts'):0;return rank(a)-rank(b);});count.textContent=parts.length+(parts.length===1?' part · ':' parts · ')+FLORA_PALETTE_ASSETS.length+' in catalogue';grid.replaceChildren();for(const part of parts){const b=el('button'),placement=floraPlacementCategory(part);b.className='part-card';b.title=part.name+' · '+floraPaletteCategory(part)+' · '+(placement==='Whole plants'?'Place a new editable plant':placement==='Surface parts'?'Place on bark':'Attach to a joint or place as a new plant');b.setAttribute('data-flora-placement',placement);b.setAttribute('data-flora-category',floraPaletteCategory(part));b.setAttribute('data-flora-part',part.id);const img=el('img');img.className='part-preview';img.src=floraIconUrl(part);img.alt='';img.loading='lazy';img.decoding='async';b.append(img,el('span',part.name));if(category==='Flora'||category==='Branches'||query){const attachment=el('small',placement==='Whole plants'?'Whole plant':placement==='Surface parts'?'On bark':'On joint');attachment.className='flora-part-attachment';b.append(attachment);}b.draggable=true;img.draggable=false;b.ondragstart=e=>{e.dataTransfer?.setData(FLORA_DRAG_TYPE,part.id);if(e.dataTransfer)e.dataTransfer.effectAllowed='copy';onDragStart(part.id);};b.ondragend=()=>onDragEnd();b.onclick=()=>onSelect(part.id);grid.append(b);}if(!parts.length)grid.append(el('p','No matching flora parts.'));}
 if(search.addEventListener)bindPaletteSearch(search,()=>[...grid.children].filter(card=>card.draggable));
 panel.focusSearch=()=>{search.focus?.();search.select?.();};panel.revealPart=id=>{const part=floraAsset(id);if(!part)return;category=floraPaletteCategory(part);search.value=part.name;draw();};search.oninput=draw;draw();return panel;
}
