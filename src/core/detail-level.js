// Export-only construction settings. Saved definitions and attachment positions
// stay identical; builders choose their own lower-detail representation.
export const LOW_DETAIL_RULES=Object.freeze({
 'stair-route':'route-ramps',platform:'preserve-deck-and-joins',flora:'flora-field',
 interior:'rooms-and-ramps',round:'radial-primitive',pillar:'radial-primitive',
 dome:'radial-primitive',cone:'radial-primitive',orb:'radial-primitive',capsule:'radial-primitive',
});
export function lowerDetailDefinition(part){
 if(!part.route)return part;
 const copy={...part,route:structuredClone(part.route)};
 for(const segment of copy.route.segments)if(segment.kind==='stairs')segment.kind='ramp';
 return copy;
}
