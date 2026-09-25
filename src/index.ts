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
 *     Medido el 2026-09-25 sobre los cuatro: `dinero.ts`, `negocios.ts`,
 *     `nyroCore.ts`, `sesion.ts`, `api.ts`, `mfa.ts`, `theme.ts` y
 *     `versionCheck.ts` comparten nombre y difieren por dentro. Subir cualquiera
 *     de ellos aquí sin unificarlo primero sería elegir a ciegas la versión de
 *     un vertical y rompérsela a los otros tres.
 *
 * Por eso la v0.1.0 lleva solo fechas: es lo único que estaba probado idéntico.
 */
export { PR_TZ, aISOenPR, hoyPR, masDias } from './fechas.js';

/** La versión del paquete. El CI comprueba que cuadre con el tag. */
export const VERSION = '0.1.0';
