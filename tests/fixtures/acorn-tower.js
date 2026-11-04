import {makePart} from '../../src/core/model.js';

// User-authored shape parameters; no stock game geometry is included.
export function acornTowerFixture(){
 const group={assemblyId:'acorn-tower',assemblyName:'Acorn Tower'};
 return {format:'open-building-studio',version:1,name:'Acorn Tower',parts:[
  makePart('waist',{...group,id:'acorn-1-base',name:'Base',position:[-2,-.09420169109033694,5.75],scale:[8.954302432552376,8.954302432552376,8.954302432552376]}),
  makePart('round',{...group,id:'acorn-2-round',name:'Round tower',position:[-2,8.86010074146204,6.0525],scale:[5.559917313492232,3.138428376721,5.559917313492232]}),
  makePart('cor-bulb-cap',{...group,id:'acorn-0-cap',name:'Acorn cap',position:[-2,11.99852911818304,6.0525],scale:[2.5937424601,4.594972986357217,2.5937424601]})
 ]};
}
