/**
 * Lo que una persona TECLEA en un campo de dinero, convertido a centavos.
 *
 * POR QUÉ ESTE MÓDULO EXISTE, en palabras de quien lo escribió primero
 * (restaurante, y retail lo portó tal cual): los campos de dinero estaban
 * controlados contra un número y se reformateaban en cada tecla —escribías «1»
 * y el campo saltaba solo a «1.00» antes de que pudieras poner el «.25», así
 * que teclear 1.25 de corrido era imposible—. La pantalla guarda el texto tal
 * cual y llama aquí al GUARDAR, que es el único momento en que hacen falta
 * centavos.
 *
 * LA REGLA QUE LO GOBIERNA TODO: lo que no se entiende NO SE GUARDA. Ni se
 * convierte a 0, ni a «sin precio», ni se manda a ver qué dice la base. Las
 * tres son formas de que un dedazo cambie dinero sin que nadie se entere — y
 * cada vertical se la encontró por su lado: en retail «un pago de $0 y nadie se
 * entera hasta el cuadre», en restaurante «le paga de menos a alguien y nadie
 * se entera hasta la nómina», en servicios «el servicio se queda sin precio y
 * el próximo que lo cotice cobra de menos».
 *
 * ── LA COMA SE ACEPTA, Y ES LA DECISIÓN QUE UNIFICA ESTE MÓDULO ─────────────
 *
 * En Puerto Rico se teclea «12,50» sin pensarlo: el teclado numérico escribe la
 * coma. Los tres verticales identificaron ese hecho y dos llegaron a una
 * conclusión y uno a la contraria:
 *
 *     retail y restaurante  ->  la aceptan y la convierten:  "12,50" = 1250
 *     servicios             ->  la rechazaba, y no se podía guardar
 *
 * Gana la de los dos, y no por mayoría: negarse a guardar lo que la persona
 * quiso decir sin ambigüedad no la protege de nada, solo le impide trabajar.
 * Lo que sí protege es que la regla de abajo no ADIVINE:
 *
 *     "1,234"     ->  se niega (¿1.23 o mil doscientos treinta y cuatro?)
 *     "1,234.56"  ->  se niega (dos separadores)
 *     "1.2345"    ->  se niega (más de dos decimales: eso no son centavos)
 *     "-5"        ->  se niega (el signo lo decide cada columna, no el teclado)
 *     "1e3"       ->  se niega (nadie teclea eso en una caja)
 *
 * Donde no hay una lectura única, no se elige una: se para.
 *
 * ── LO QUE NO ENTRA AQUÍ, y es a propósito ─────────────────────────────────
 *
 * Qué importes son VÁLIDOS para cada columna. «Mayor que cero» (un cobro),
 * «cero sí pero negativo no» (un precio de catálogo), «null significa sin
 * precio decidido y 0 significa gratis» — eso es la regla de una columna de un
 * vertical, no del dinero. Vive en cada repo, al lado de la migración que la
 * declara. Subirlo aquí sería imponerle a los cuatro las columnas de uno.
 *
 * Y tampoco entra el IVU. Esto convierte texto a centavos; el impuesto es otra
 * cosa y vive en la base de cada vertical.
 */

/**
 * Un monto tecleado: dígitos con coma o punto y como mucho dos decimales, o
 * «.50» sin el cero delante. Sin signo, sin exponente, sin separador de miles.
 */
const MONTO = /^(\d+([.,]\d{0,2})?|[.,]\d{1,2})$/;

/**
 * ¿Es tecleable como dinero?
 *
 * VACÍO ES VÁLIDO, y es importante: significa «sin poner», y cada pantalla
 * decide qué es eso. En el extra por hora es «sin extra»; en el precio de un
 * puesto es «sin precio», que no es lo mismo que gratis. Por eso esta función y
 * `montoACents` son un par: la primera dice si el texto es aceptable, la
 * segunda si hay un número que guardar. Vacío es «sí» a la primera y «no» a la
 * segunda, y esa diferencia es toda la gracia.
 */
export function montoValido(s: string): boolean {
  const v = (s ?? '').trim();
  return v === '' || MONTO.test(v);
}

/**
 * Lo tecleado → centavos enteros. `null` si no hay número que guardar.
 *
 * `null` tapa dos casos a propósito —vacío y basura— porque para quien GUARDA
 * son el mismo: no hay número. Para quien VALIDA no lo son, y para eso está
 * `montoValido`.
 *
 * `Math.round` y no `Math.trunc`: 0.005 son medio centavo y redondear es lo que
 * hace cualquier caja. A partir de aquí no hay un float en el camino del dinero.
 *
 * OJO AL ADAPTARLO: hay verticales que necesitan `undefined` y no `null` para
 * que la clave no se serialice y el campo no viaje (backends con
 * `exclude_unset`). Eso se envuelve en el vertical —`?? undefined` basta— y no
 * se cambia aquí: mandar `null` donde se esperaba «no lo toques» borra el valor
 * que había, que es justo el accidente que este módulo existe para evitar.
 */
export function montoACents(s: string): number | null {
  const v = (s ?? '').trim();
  if (v === '' || !MONTO.test(v)) return null;
  const n = parseFloat(v.replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

/**
 * Centavos → texto editable («48.00»). El inverso de `montoACents`, para
 * precargar un campo con el valor guardado sin formatearlo como moneda: esto no
 * lleva símbolo ni separador de miles a propósito, porque lo que devuelve se
 * vuelve a teclear encima.
 */
export function centsATexto(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return '';
  return (cents / 100).toFixed(2);
}
