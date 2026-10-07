/**
 * El día del negocio es el de Puerto Rico.
 *
 * EL BUG QUE ESTE MÓDULO EXISTE PARA CERRAR
 *   `new Date().toISOString().slice(0, 10)` es el modismo de siempre para sacar
 *   un YYYY-MM-DD, y está mal: `toISOString()` convierte a **UTC**. Puerto Rico
 *   va en UTC-4 todo el año, así que a partir de las 8 pm el modismo devuelve la
 *   fecha de MAÑANA. Medido, con el reloj puesto a propósito:
 *
 *       19:30 en PR  →  toISOString(): 2026-10-25   en PR: 2026-10-25
 *       20:30 en PR  →  toISOString(): 2026-10-26   en PR: 2026-10-25   ← tarde
 *       23:30 en PR  →  toISOString(): 2026-10-26   en PR: 2026-10-25   ← tarde
 *
 *   Cuatro horas al día, todos los días. En un restaurante cae en la hora pico
 *   de la cena; en servicios, en el vencimiento que se propone al cerrar una
 *   cotización de noche; en el dealer, en la fecha de una gestión del turno
 *   tarde. En los tres es la misma línea.
 *
 * QUÉ ES UN DÍA Y QUÉ ES UN INSTANTE, que es la distinción que se descuida
 *   · DÍA DE CALENDARIO — un vencimiento, la fecha de una cita, «las horas de
 *     hoy». No tiene hora. Es lo que este módulo resuelve.
 *   · INSTANTE — cuándo pasó algo: el inicio y el fin de una cita, un sello de
 *     auditoría. Para eso `new Date()` y `toISOString()` a secas siguen siendo
 *     lo correcto, y la base lo guarda en UTC. NO se toca.
 *
 *   El barrido que acompaña a este paquete (`nyro-barrido-fechas`) persigue solo
 *   `toISOString().slice(…)` —el día— y deja en paz al instante, por esto mismo.
 *
 * POR QUÉ ESTÁ AQUÍ Y NO EN CADA APP
 *   Porque ya estaba en tres. Idéntico en restaurante y en dealer, y copiado a
 *   servicios el 2026-09-25 al arreglar este mismo bug allí. Es el patrón que se
 *   come a esta línea: alguien lo resuelve bien EN SU APP en vez de en el
 *   paquete, y los otros nunca se enteran. Aquí se resuelve una vez.
 */

/** La zona del negocio. UTC-4 todo el año: Puerto Rico no tiene horario de verano. */
export const PR_TZ = 'America/Puerto_Rico';

// `formatToParts` en vez de confiar en que un locale devuelva YYYY-MM-DD: el
// formato de 'en-CA' es el correcto hoy, pero no es algo que la plataforma
// prometa, y aquí un formato distinto se convierte en una fecha mal guardada.
//
// La `timeZone` explícita es LA LÍNEA QUE SOSTIENE TODO EL MÓDULO. Sin ella el
// día pasa a ser el del reloj del dispositivo —que en un local puede estar en
// cualquier cosa— y el bug vuelve entero. Hay una prueba dedicada a que quitarla
// se ponga en rojo, porque es el olvido más probable de este archivo.
const partes = new Intl.DateTimeFormat('en-CA', {
  timeZone: PR_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Un instante → el día de Puerto Rico al que pertenece, como YYYY-MM-DD. */
export function aISOenPR(d: Date = new Date()): string {
  const p = Object.fromEntries(
    partes.formatToParts(d).map(({ type, value }) => [type, value]),
  );
  return `${p['year']}-${p['month']}-${p['day']}`;
}

/** El día de HOY para el negocio, YYYY-MM-DD. Reemplaza a `new Date().toISOString().slice(0, 10)`. */
export function hoyPR(): string {
  return aISOenPR();
}

/**
 * La forma de un YYYY-MM-DD. Tres grupos de dígitos separados por guiones.
 *
 * ES UNA COMPROBACIÓN DE FORMA Y NO DE CALENDARIO, y la distinción es el centro
 * del asunto: `2026-13-45` PASA a propósito. No es una fecha, pero sí es algo que
 * `Date.UTC` sabe normalizar, y esa normalización es justo lo que se quiere —
 * sumar 40 días a fin de mes tiene que rodar al mes siguiente—. Lo que se corta
 * es lo que NO son tres números: ahí no hay nada que normalizar.
 *
 * `\d+` y no `\d{4}-\d{2}-\d{2}` para no rechazar `2026-1-5`, que es
 * inequívoco y que `Date.UTC` resuelve igual. El rigor que hace falta aquí es el
 * de distinguir una fecha de una cadena cualquiera, no el de imponer el relleno.
 */
const FORMA = /^\d+-\d+-\d+$/;

/**
 * Suma (o resta) días a un YYYY-MM-DD. Se NIEGA con lo que no sea una fecha.
 *
 * La cuenta va en UTC a propósito: sobre una fecha suelta, sin hora, no hay zona
 * que aplicar, y hacerla con un `Date` local puede saltarse un día en los bordes
 * de horario de verano de quien esté mirando.
 *
 * POR QUÉ LANZA, desde la v0.2.0. Hasta la v0.1.0 devolvía `"NaN-NaN-NaN"` con
 * una entrada mala. Eso es inventarse una fecha: un string con forma de fecha que
 * no es una fecha sigue viaje hasta una columna `date` y el fallo aparece tres
 * capas más allá, sin nada que lo ate al sitio donde se coló. Mejor romper donde
 * se metió la basura.
 *
 * Lo encontró la sesión de ERP Retail al adoptar el paquete, y escribieron la
 * guarda en su propio repo antes que migrar a ciegas — «migrar a ciegas habría
 * sido cambiar duplicación por una REGRESIÓN, que es peor negocio». Tenían razón
 * en eso y en que el sitio del arreglo era este, no el suyo.
 *
 * Al traerla se le cerró un agujero que su versión tenía. La suya comprobaba
 * `Number.isFinite` sobre cada trozo, y `Number('')` es 0:
 *
 *     "--"        ->  [0, 0, 0]   pasaba, y salía una fecha del año 0
 *     "2026--25"  ->  idem
 *     " - - "     ->  idem
 *
 * Por eso aquí la comprobación es de FORMA sobre el string, antes de convertir
 * nada: el hueco entre dos guiones no es un número, aunque `Number` diga que sí.
 */
export function masDias(iso: string, dias: number): string {
  if (typeof iso !== 'string' || !FORMA.test(iso)) {
    throw new TypeError(
      `masDias esperaba un YYYY-MM-DD y recibió ${JSON.stringify(iso)}`,
    );
  }
  const cachos = iso.split('-').map(Number);
  // Los `?? NaN` siguen por `noUncheckedIndexedAccess`: el compilador no sabe que
  // la regex ya garantizó que son tres. Inalcanzables, pero no cuesta nada.
  const y = cachos[0] ?? NaN;
  const m = cachos[1] ?? NaN;
  const d = cachos[2] ?? NaN;
  const t = new Date(Date.UTC(y, m - 1, d + dias));
  const p = (n: number) => String(n).padStart(2, '0');
  return `${t.getUTCFullYear()}-${p(t.getUTCMonth() + 1)}-${p(t.getUTCDate())}`;
}
