#!/usr/bin/env node
/**
 * El barrido: impide que `toISOString().slice(0, 10)` vuelva a entrar en una app.
 *
 *     npx nyro-barrido-fechas            # revisa ./src
 *     npx nyro-barrido-fechas web/src
 *
 * POR QUÉ HACE FALTA AUNQUE EL HELPER ESTÉ PROBADO. Las pruebas de este paquete
 * demuestran que `hoyPR()` y `aISOenPR()` hacen lo correcto. Lo que no pueden
 * demostrar es que la pantalla nueva de la semana que viene LOS USE. Sin este
 * barrido, el paquete sigue verde mientras la app saca el día en UTC otra vez —
 * que es exactamente como llegó el bug la primera vez, con el helper ya escrito
 * y funcionando en dos repos.
 *
 * SOLO PERSIGUE EL DÍA, NO EL INSTANTE. `toISOString()` a secas es correcto para
 * sellar cuándo pasó algo, y la base lo guarda en UTC. Lo que delata que se está
 * sacando un DÍA DE CALENDARIO es el `.slice(…)` encima. Por eso el patrón lleva
 * el corte dentro: perseguir `toISOString` a pelo daría rojo sobre código bueno,
 * y un barrido que da rojo sobre código bueno se acaba desactivando.
 *
 * LOS COMENTARIOS NO CUENTAN. Media docena de comentarios de este mismo arreglo
 * —empezando por la cabecera de `fechas.ts`— NOMBRAN el modismo para explicar
 * qué estaba mal. Contarlos convertiría el barrido en un colador que nadie mira.
 *
 * EXCEPCIONES. Un `nyro-fechas.json` junto al package.json de la app, con la
 * cuenta EXACTA por archivo:
 *
 *     { "src/demo/mockData.ts": 1 }
 *
 * Exacta y no "al menos", para que un modismo nuevo en un archivo ya exceptuado
 * también se ponga rojo. Y si un archivo deja de necesitar la excepción, esto
 * falla para que la lista no se pudra.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const MODISMO = /toISOString\(\)\s*\.\s*(slice|split|substring)/g;

const sinComentarios = (txt) => txt
  .replace(/\/\*[\s\S]*?\*\//g, '')                  // bloques /* … */
  .split('\n')
  .filter((l) => !/^\s*(\/\/|\*)/.test(l))           // líneas // y  *
  .join('\n');

const dir = resolve(process.argv[2] ?? 'src');
if (!existsSync(dir)) {
  console.error(`nyro-barrido-fechas: no existe ${dir}`);
  process.exit(2);
}
const base = resolve(dir, '..');

let EXCEPCIONES = {};
for (const cand of [join(base, 'nyro-fechas.json'), join(process.cwd(), 'nyro-fechas.json')]) {
  if (existsSync(cand)) { EXCEPCIONES = JSON.parse(readFileSync(cand, 'utf8')); break; }
}

const fuentes = [];
(function recorrer(d) {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const ruta = join(d, e.name);
    if (e.isDirectory()) recorrer(ruta);
    else if (/\.(ts|tsx|js|jsx|mjs)$/.test(e.name)) fuentes.push(ruta);
  }
})(dir);

const encontrados = {};
for (const ruta of fuentes) {
  const n = (sinComentarios(readFileSync(ruta, 'utf8')).match(MODISMO) || []).length;
  if (n) encontrados[relative(base, ruta).split('\\').join('/')] = n;
}

const nuevos = Object.entries(encontrados)
  .filter(([f, n]) => (EXCEPCIONES[f] ?? 0) !== n)
  .map(([f, n]) => `  ${f} — ${n} (se esperaban ${EXCEPCIONES[f] ?? 0})`);
const caducadas = Object.keys(EXCEPCIONES).filter((f) => !(f in encontrados));

if (!nuevos.length && !caducadas.length) {
  console.log(`✅ nyro-barrido-fechas: ${fuentes.length} archivos, ninguno saca el día con toISOString()`);
  process.exit(0);
}

console.error(`❌ nyro-barrido-fechas (${fuentes.length} archivos revisados)\n`);
if (nuevos.length) {
  console.error('El día de calendario sale en UTC. En Puerto Rico eso es un día tarde');
  console.error('a partir de las 8 pm. Usa `hoyPR()` / `masDias()` de @nyro-ai/core:\n');
  console.error(nuevos.join('\n'));
  console.error('\nSi es un instante y no un día, quita el .slice(). Si es a propósito,');
  console.error('añádelo a nyro-fechas.json con su cuenta.\n');
}
if (caducadas.length) {
  console.error('Excepciones que ya no hacen falta (bórralas de nyro-fechas.json):');
  console.error(caducadas.map((f) => `  ${f}`).join('\n'));
}
process.exit(1);
