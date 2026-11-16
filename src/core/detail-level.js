// Export-only construction settings. Saved definitions and attachment positions
// stay identical; builders choose their own lower-detail representation.
export const LOW_DETAIL_RULES=Object.freeze({
 'stair-route':'route-ramps',platform:'preserve-deck-and-joins',flora:'flora-field',
 interior:'rooms-and-ramps',round:'radial-primitive',pillar:'radial-primitive',
 dome:'radial-primitive',cone:'radial-primitive',orb:'radial-primitive',capsule:'radial-primitive',
 'ring-body':'ring-shell',rock:'rock-strata',metaballs:'metaball-field',
 ring:'radial-primitive',bell:'radial-primitive',waist:'radial-primitive',
 onion:'radial-primitive',saucer:'radial-primitive',pagoda:'radial-primitive',
 archbody:'arch-profile','flat-arch':'arch-profile',antenna:'radial-primitive',
 flag:'radial-primitive',gear:'radial-primitive',pipe:'radial-primitive',
 highway:'highway-curves',
});
const classical=new Set('doric ionic corinthian doric-smooth ionic-smooth corinthian-smooth column-drum temple-base architrave triglyph cornice temple-roof-complete temple-entablature temple-roof-half temple-door acroterion'.split(' '));
export function lowDetailRule(part){
 if(part.type==='character-reference')return null;
 if(part.route)return part.type==='wall-route'?'wall-construction':'route-ramps';
 if(part.platform)return 'preserve-deck-and-joins';
 if(part.interior)return 'rooms-and-ramps';
 if(LOW_DETAIL_RULES[part.type])return LOW_DETAIL_RULES[part.type];
 if(classical.has(part.type))return 'classical-profiles';
 if(part.type.startsWith('jp-'))return 'japanese-profiles';
 if(part.type.startsWith('cor-'))return 'coruscant-profiles';
 if(part.type.startsWith('ny-'))return 'city-profiles';
 // These imported architectural pieces are already small, atlas-unwrapped
 // meshes. Preserve their faces rather than remeshing their UV charts.
 if(part.type.startsWith('mos-'))return 'stock-profile-preserved';
 return 'shape-construction';
}
export function lowerDetailDefinition(part){
 if(!part.route)return part;
 const copy={...part,route:structuredClone(part.route)};
 for(const segment of copy.route.segments)if(segment.kind==='stairs')segment.kind='ramp';
 return copy;
}
