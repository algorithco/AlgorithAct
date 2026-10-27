import { mkdir, writeFile } from 'node:fs/promises';
import { rig, skin, tallRig, tallSkin, motions, createDemoProject } from '../content/characters/hero/build';
import { parseProject } from '../src/model/validate';

await mkdir('public/content', { recursive: true });
const project = parseProject(createDemoProject((()=>{let i=0;return ()=>`fixture-${++i}`;})(),'2026-10-25T00:00:00.000Z'));
await writeFile('public/content/hero.json', JSON.stringify({ rig, skin }, null, 2)+'\n');
await writeFile('public/content/novcha.json', JSON.stringify({ rig:tallRig, skin:tallSkin }, null, 2)+'\n');
await writeFile('public/content/motions.json', JSON.stringify(motions, null, 2)+'\n');
await mkdir('tests/fixtures', { recursive: true });
await writeFile('tests/fixtures/project.v1.json', JSON.stringify(project, null, 2)+'\n');
console.log(`Content: 2 distinct rigs, ${rig.bones.length} bones each, ${skin.parts.length} parts each, ${motions.length} shared motions. Model v1 validated.`);
