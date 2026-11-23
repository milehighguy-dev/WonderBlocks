import fs from 'node:fs';
import path from 'node:path';
import {SWBF2_VALIDATION_SCRIPT} from '../src/swbf2/swbf2-validation.js';
for(const name of ['oak','pine','mangrove'])fs.writeFileSync(path.join(process.argv[2],'plants',name,'validate-swbf2.ps1'),SWBF2_VALIDATION_SCRIPT);
