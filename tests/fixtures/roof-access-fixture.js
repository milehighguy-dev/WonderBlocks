// Test-only inputs for geometry and connection regressions.
import {storeysFixture} from './storeys-fixture.js';
import {validateInterior} from '../../src/interiors/interior.js';
export function roofAccessFixture(){const project=storeysFixture(),p=project.parts[0].interior;project.parts[0].name='Gallery • interior stairs and roof terrace';p.stairs.push({id:'roof-stair',from:p.storeys.at(-1).id,to:'roof',x:3,z:-1.5,run:5.04,width:1.6,direction:'south',roofGuards:true});validateInterior(p);return project;}
