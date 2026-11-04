import {DEFAULT_HALLWAY_HEIGHT} from './route-defaults.js';
// Distances inward from the widest wall, heights above the walking floor.
// Measured from cross-sections of the original visible mesh vertices.
export const HALLWAY_PRESETS=[
 {id:'yavin-temple',label:'Yavin temple passage',source:'BF1 yav2_bldg_arena_tunnel + door_ruin_8; BF2 great-temple interior',width:4,height:4,ceilingStart:2,profile:[[0,0],[.55,3.2],[.8,3.2],[.8,4]],wall:'yavin-stone',floor:'yavin-floor',ceiling:'yavin-wall'},
 {id:'death-star-prison',label:'Death Star prison corridor',source:'dea1_bldg_corridor_prison.msh',width:6,height:4.31,ceilingStart:3,profile:[[1,0],[.17,1.62],[0,2],[.15,2.34],[1,4.31]],wall:'swbf-prison-wall',floor:'swbf-prison-floor',ceiling:'swbf-prison-wall'},
 {id:'death-star-conference',label:'Death Star conference corridor',source:'dea1_bldg_conference_room_corridor.msh',width:8,height:5,ceilingStart:2,profile:[[1,0],[.5,.5],[0,1],[.5,5]],wall:'swbf-conference-wall',floor:'swbf-conference-floor',ceiling:'swbf-conference-ceiling'},
 {id:'hoth',label:'Hoth corridor',source:'hoth_bldg_corridor_cut.msh',width:6,height:5.78,ceilingStart:1,profile:[[.28,0],[.17,5.32],[1.72,5.78]],wall:'swbf-hoth-wall',floor:'swbf-hoth-floor',ceiling:'swbf-hoth-ceiling'},
 {id:'hoth-natural',label:'Hoth natural corridor',source:'HOTH_bldg_corridor_natural.msh',width:10.82,height:6.14,ceilingStart:4,profile:[[.74,0],[0,.84],[.14,1.59],[.56,2.73],[1.3,3.68],[1.76,4.54],[3.16,6.04],[3.84,6.14]],wall:'swbf-hoth-ceiling',floor:'swbf-hoth-floor',ceiling:'swbf-hoth-ceiling'},
 {id:'polis-massa',label:'Polis Massa hall',source:'pol1_bldg_hall_hanger.msh',width:4.77,height:5.46,ceilingStart:3,profile:[[.7,0],[.69,.75],[.37,1.01],[0,4.58],[1.13,5.46]],wall:'swbf-polis-wall',floor:'swbf-polis-floor',ceiling:'swbf-polis-wall'},
 {id:'rhen-var',label:'Rhen Var tunnel',source:'rhn1_prop_tunnel_straight_4.msh',width:9.45,height:5.81,ceilingStart:3,profile:[[.92,0],[0,1.11],[.2,2.10],[.42,3.16],[.84,4.08],[1.31,5.06],[2.1,5.81]],wall:'swbf-rhen-wall',floor:'swbf-rhen-wall',ceiling:'swbf-rhen-ceiling'}
];
export const hallwayPreset=id=>HALLWAY_PRESETS.find(p=>p.id===id);
export function selectHallwayPreset(segment,id){const p=hallwayPreset(id);if(!p)return false;segment.hallway={...segment.hallway,style:id,height:segment.hallway?.height??DEFAULT_HALLWAY_HEIGHT,thickness:segment.hallway?.thickness??.2,ceiling:segment.hallway?.ceiling??true,color:'#ffffff',surface:{preset:p.wall,scale:.3}};segment.componentFinishes={...segment.componentFinishes,deck:{color:'#ffffff',surface:{preset:p.floor,scale:.3}},walls:{color:'#ffffff',surface:{preset:p.wall,scale:.3}},ceiling:{color:'#ffffff',surface:{preset:p.ceiling,scale:.3}}};return true;}
