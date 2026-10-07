/**
 * @nyro-ai/core — la capa de librería de los ERPs de Nyro.
 *
 * Lo que entra aquí: lógica de negocio SIN interfaz, que ya esté demostrada
 * idéntica en más de un vertical. Ni antes (un paquete para un solo consumidor
 * es una indirección), ni después (a la tercera copia ya ha habido un bug).
 *
 * LO QUE NO ENTRA, y conviene que esté escrito:
 *   · Nada de interfaz. Tokens, preset de Tailwind, primitivas y hooks de React
 *     viven en `@nyro-ai/ui`, que es un paquete aparte y anterior a este.
 *   · Nada de backend. El FastAPI compartido es `nyro-api-base` (Python).
 *   · El espinazo SQL. Ese es el repo `nyro-core`, que los verticales
 *     sincronizan con `sync-core.sh` — otro repo y otro mecanismo. Ojo con el
 *     nombre: este paquete vive en `nyro-core-js` precisamente para no chocar.
 *   · Lo que se LLAMA igual en varios verticales pero NO es el mismo código.
 *     Medido el 2026-09-25 sobre los cuatro: `negocios.ts`, `nyroCore.ts`,
 *     `sesion.ts`, `api.ts`, `mfa.ts`, `theme.ts` y `versionCheck.ts` comparten
 *     nombre y difieren por dentro. Subir cualquiera sin unificarlo primero
 *     sería elegir a ciegas la versión de un vertical y rompérsela a los otros.
 *   · Las reglas de UNA COLUMNA de UN vertical. «Mayor que cero» para un cobro,
 *     «cero sí, negativo no» para un precio: eso vive al lado de la migración
 *     que lo declara, no aquí.
 *
 * Por eso la v0.1.0 llevó solo fechas: era lo único probado idéntico.
 *
 * `dinero` entró en la v0.3.0, y CORRIGIENDO AQUELLA MEDICIÓN. Estaba en la
 * lista de «mismo nombre, código distinto», y al abrirlo de verdad resultó que
 * retail y restaurante lo tienen BYTE A BYTE IGUAL en todo lo que comparten —
 * retail solo añade `centsATexto`—. El que divergía era servicios, con otra
 * implementación entera. Contar ficheros por su nombre dijo «los tres difieren»;
 * leerlos dijo «dos son el mismo y uno no». La lección es la de siempre, una
 * vuelta más: tampoco basta con comparar, hay que mirar QUÉ comparten.
 */
export { PR_TZ, aISOenPR, hoyPR, masDias } from './fechas.js';
export { montoValido, montoACents, centsATexto } from './dinero.js';

/** La versión del paquete. El CI comprueba que cuadre con el tag. */
export const VERSION = '0.3.1';
