import {yavinRainwell} from '../../examples/generators/yavin-rainwell-demo.js';
import {vesperRift} from '../../examples/generators/vesper-rift-demo.js';
import {cinderlock} from '../../examples/generators/cinderlock-demo.js';
import {relayDistrict} from '../../examples/generators/relay-district-demo.js';
import {yavinBlocking} from '../../examples/generators/yavin-demo.js';
import {mosEisleyReview} from '../../examples/generators/mos-eisley-demo.js';
import {swbfTreesDemo} from '../../examples/generators/swbf-trees-demo.js';
import {aureliaGate} from '../../examples/generators/aurelia-demo.js';
import {coruscantResidential} from '../../examples/generators/coruscant-residential-demo.js';
import {levantine} from '../../examples/generators/levantine-demo.js';
import {asterfall} from '../../examples/generators/asterfall-demo.js';
import {classicalTemple} from '../../examples/generators/demos.js';
import {newYorkBlock} from '../../examples/generators/new-york-demo.js';
import {castleCompound} from '../../examples/generators/compound-demo.js';

// One catalogue controls both the example dropdown and direct scene URLs.
export const EXAMPLE_SCENES=[
 {id:'yavin-rainwell',group:'Gameplay maps',name:'Yavin · Temple of the Rainwell',load:yavinRainwell},
 {id:'vesper-rift',group:'Gameplay maps',name:'Vesper Rift · City of the Hollow Moon',load:vesperRift},
 {id:'cinderlock',group:'Gameplay maps',name:'Cinderlock · Foundry Crossfire',load:cinderlock},
 {id:'relay-district',group:'Gameplay maps',name:'Relay District · vertical traversal arena',load:relayDistrict},
 {id:'yavin',group:'Building kits',name:'Yavin · blocking workshop',load:yavinBlocking},
 {id:'mos-eisley',group:'Building kits',name:'Mos Eisley · building collection',load:mosEisleyReview},
 {id:'swbf-trees',group:'Organic shapes',name:'SWBF2 · Yavin, Dagobah & Endor trees',load:swbfTreesDemo},
 {id:'aurelia',group:'Coruscant',name:'Aurelia Gate · reactor harbor',load:aureliaGate},
 {id:'coruscant-residential',group:'Coruscant',name:'Meridian residential district',load:coruscantResidential},
 {id:'levantine',group:'Architecture',name:'Levantine vine passage',load:levantine},
 {id:'asterfall',group:'Architecture',name:'Asterfall · City of the Tide Engine',load:asterfall},
 {id:'classical-temple',group:'Architecture',name:'Classical temple',load:classicalTemple},
 {id:'empire-state',group:'Architecture',name:'Empire State block',load:newYorkBlock},
 {id:'castle-compound',group:'Architecture',name:'Castle compound',load:castleCompound}
];
