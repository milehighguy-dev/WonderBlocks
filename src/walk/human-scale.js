import {MOS_EISLEY_PARTS} from '../parts/mos-eisley.js';
// One editor unit is one metre. These defaults affect new palette placements only.
// Explicitly reviewed defaults for the entire palette. Generic modelling units
// stay small; architecture starts at useful metre dimensions for a 2.08 m actor.
export const placementScales={
 'yavin-gallery':[1,1,1],
 // Stock Mos Eisley components are already authored in metres.
 ...Object.fromEntries(MOS_EISLEY_PARTS.map(p=>[p.id,[1,1,1]])),
 flora:[1,1,1],highway:[1,1,1],platform:[1,1,1],'wall-route':[1,1,1],
 ...Object.fromEntries(['cor-skyscraper-blade','cor-balcony','cor-shoulder','cor-swept-spire','cor-transfer-deck','cor-bulb-cap','cor-curved-strut','cor-half-round-roof','cor-roundtop-body'].map(id=>[id,[1,1,1]])),
 ...Object.fromEntries(['character-reference','interior','stair-route','block','metaballs','hex','round','ring-body','taper','slab','capsule','orb','bell','waist','ring','gear','crystal','pipe','doric','ionic','corinthian','doric-smooth','ionic-smooth','corinthian-smooth','column-drum','acroterion','jp-bracket','jp-shachi','jp-crest','jp-tiger','chimney','antenna'].map(id=>[id,[1,1,1]])),
 // Open passage frames have at least 2.4 m vertical clearance.
 archbody:[2,3.8,2],'flat-arch':[2,3.8,2],
 pillar:[.6,3,.6],buttress:[1.5,2.5,1.5],waterfall:[3,8,1],
 balcony:[2,2.4,2],awning:[2.5,4,2],flag:[1.5,2,1.5],
 // Roof components are sized for a small 6 m building; height above the floor
 // is still chosen by placement, not baked into the roof geometry.
 dome:[6,6,6],cone:[4,3,4],roof:[6,3,6],gable:[4.6,2.4,6],
 onion:[5,4,5],saucer:[4,4,4],pagoda:[4.3,3,4.3],pyramid:[6,3,6],fin:[2,2,2],crown:[6,3,6],
 'temple-base':[6,1.2,8],'architrave':[3,1,1],'triglyph':[3,1,1],'cornice':[3,1,1],
 'pediment':[3.6,2,1],'temple-roof':[3.6,2,9.6],
 'temple-roof-complete':[3.6,3.6,9.6],'temple-roof-half':[3.6,3.6,9.6],
 'temple-entablature':[3,1,3],'temple-door':[1.6,1.6,1],
 // Japanese storeys are 6 m square, 3 m tall; roofs share that footprint.
 'jp-base':[4,2.5,4],'jp-stone-wall':[3,2.5,2],'jp-stone-corner':[3,2.5,3],
 'jp-story':[3,2.5,3],'jp-entry-story':[3,2.55,3],'jp-dark-story':[3,2.5,3],
 'jp-gallery-wall':[1.5,2.04,1.4],'jp-wall':[2,2,1],'jp-timber-wall':[2,2,1],
 'jp-hip-roof':[3.4,2,3.4],'jp-tier-roof':[3.4,2,3.4],'jp-gable-roof':[3.4,2,3.4],
 'jp-half-roof':[3.4,2,3.4],'jp-irimoya':[3.4,2,3.4],'jp-swept-gable':[3.4,2,1],
 'jp-chidori':[1.5,1.5,1],'jp-karahafu':[1.5,1.5,1],'jp-eave':[2,2,3],
 'jp-ridge':[3.3,1.5,1.5],'jp-window':[1.2,1.5,1],'jp-katomado':[1.5,1.6,1],'jp-arrow':[1.5,2,1],
 'jp-gate':[1.5,1.8,1.5],'jp-torii':[1.5,1.5,1.5],'jp-gate-doors':[1.5,1.68,1],
 'jp-balcony':[3,2.7,3],'jp-railing':[1.5,2.2,1],'jp-wall-cap':[1.5,1,15],
 // City roofs fit roughly 6 m bodies; props retain human-scale detail sizes.
 'ny-mansard':[3,2,3],'ny-deco-crown':[3,2,3],'ny-terrace-crown':[3,2,3],
 'ny-cupola':[2,2,2],'ny-lantern':[3,3.2,3],'ny-barrel':[3,3,3],'ny-sawtooth':[3,2,3],
 'ny-pinnacles':[3,2,3],'ny-cornice':[3,1.5,3],'ny-parapet':[3,5.5,3],
 'ny-mast':[2,2,2],'ny-spire':[1.5,2,1.5],'ny-entry':[1.5,2,1],
 'ny-water-tank':[2,2,2],'ny-hvac':[1.5,1.5,1.5],'ny-fire-escape':[1.6,2.2,2],
 'ny-awning':[1.5,1.5,2],'ny-crosswalk':[2,1,3.4],'ny-lamp':[1.5,2,1.5],'ny-taxi':[2.6,2.5,3]
};
export function placementScale(type){return [...(placementScales[type]||[1,1,1])];}
export function resizeScene(parts,xz=1,y=1){for(const p of parts){p.position=p.position.map((v,i)=>v*(i===1?y:xz));if(p.route){const r=p.route;r.width*=xz;r.gap*=xz;r.thickness*=y;for(const s of r.segments){s.run*=xz;s.rise*=y;if(s.width)s.width*=xz;if(s.thickness)s.thickness*=y;if(s.treadDepth)s.treadDepth*=xz;}}else p.scale=p.scale.map((v,i)=>v*(i===1?y:xz));}return parts;}
export function humanRoutes(parts){for(const p of parts){if(!p.route)continue;for(const s of p.route.segments){if(s.kind==='stairs'&&s.rise){s.steps=Math.max(1,Math.ceil((s.rise-1e-8)/.2));s.treadDepth=s.run/s.steps;}if(s.railing&&s.railing.style!=='none')s.railing.height=1.1;}}return parts;}
export function facadeMetres(parts){for(const p of parts)if(['ny-deco','ny-brick','ny-glass'].includes(p.surface?.preset)){p.surface.scale=1;p.pattern={mode:'fixed',texture:[1/1.5,1/3,1/1.5]};}return parts;}
