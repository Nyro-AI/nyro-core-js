/**
 * Las pruebas se escriben desde LA REGLA, no desde el código.
 *
 * La regla: el día del negocio es el de Puerto Rico, lo pida quien lo pida y
 * esté donde esté el reloj de la máquina.
 *
 * POR QUÉ CASI TODO VA CONTRA INSTANTES FIJOS. El bug solo se ve cuatro horas al
 * día. Una prueba que compare "hoy" contra "hoy" pasa las otras veinte sin poder
 * fallar — y una prueba que no puede fallar ocupa el sitio de la que hace falta.
 */
import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

import { aISOenPR, hoyPR, masDias, PR_TZ } from '../fechas.js';

// 3 de agosto 00:30 UTC = 2 de agosto, 8:30 pm en Ponce.
const INSTANTE = new Date('2026-08-03T00:30:00Z');

describe('aISOenPR', () => {
  it('mete un instante en el día de PR al que pertenece', () => {
    expect(aISOenPR(INSTANTE)).toBe('2026-08-02');
  });

  it('a las 04:00 UTC ya es el día siguiente en PR', () => {
    expect(aISOenPR(new Date('2026-08-03T04:00:00Z'))).toBe('2026-08-03');
  });

  it('y un segundo antes todavía no', () => {
    expect(aISOenPR(new Date('2026-08-03T03:59:59Z'))).toBe('2026-08-02');
  });

  it('de día no mueve nada', () => {
    expect(aISOenPR(new Date('2026-08-03T12:00:00Z'))).toBe('2026-08-03');
  });

  it('no coincide con el modismo viejo, que es el motivo de existir', () => {
    expect(INSTANTE.toISOString().slice(0, 10)).toBe('2026-08-03');
    expect(aISOenPR(INSTANTE)).toBe('2026-08-02');
  });
});

describe('masDias', () => {
  it('los 30 días del vencimiento, que es el uso real', () => {
    expect(masDias('2026-08-02', 30)).toBe('2026-09-01');
  });
  it('resta', () => expect(masDias('2026-08-02', -7)).toBe('2026-07-26'));
  it('cruza el mes', () => expect(masDias('2026-02-28', 1)).toBe('2026-03-01'));
  it('cruza el año', () => expect(masDias('2026-12-31', 1)).toBe('2027-01-01'));
  it('y el bisiesto', () => expect(masDias('2028-02-28', 1)).toBe('2028-02-29'));
  it('sumar cero no mueve nada', () => expect(masDias('2026-08-02', 0)).toBe('2026-08-02'));
});

describe('masDias se niega con lo que no es una fecha', () => {
  /**
   * DESDE LA v0.2.0, y es un cambio de comportamiento. Antes devolvía
   * "NaN-NaN-NaN", que es inventarse una fecha: el string sigue viaje hasta una
   * columna `date` y el fallo sale tres capas más allá. Lo encontró ERP Retail.
   */
  it.each([
    ['basura'],
    [''],
    ['2026-10'],          // falta un trozo
    ['2026-10-25-3'],     // sobra uno
    ['a-b-c'],
    ['2026/10/25'],       // otro separador
  ])('lanza con %j', (malo) => {
    expect(() => masDias(malo, 1)).toThrow(TypeError);
  });

  it.each([
    ['--'],
    ['2026--25'],
    [' - - '],
  ])('lanza con %j, que es el hueco que Number convierte en 0', (malo) => {
    // La guarda original de retail comprobaba Number.isFinite sobre cada trozo,
    // y `Number('')` es 0: estos tres pasaban y salía una fecha del año 0. Por
    // eso aquí la comprobación es de FORMA sobre el string, antes de convertir.
    expect(Number(malo.split('-')[1])).toBe(0);   // la trampa, a la vista
    expect(() => masDias(malo, 1)).toThrow(TypeError);
  });

  it('el mensaje dice qué recibió, para no tener que buscarlo', () => {
    expect(() => masDias('basura', 1)).toThrow(/"basura"/);
  });

  it('pero 2026-13-45 SÍ pasa: la comprobación es de forma, no de calendario', () => {
    // Y se normaliza, que es justo lo que se quiere: sumar días a fin de mes
    // tiene que rodar al siguiente.
    expect(masDias('2026-13-45', 0)).toBe('2027-02-14');
  });

  it('y 2026-1-5 también, sin el relleno', () => {
    expect(masDias('2026-1-5', 1)).toBe('2026-01-06');
  });
});

describe('el reloj del dispositivo no pone el día', () => {
  /**
   * LA ZONA SE PONE EN EL ENTORNO DE UN PROCESO HIJO, y esto es el corazón de la
   * prueba. Cambiar `process.env.TZ` dentro del proceso NO sirve: el
   * `Intl.DateTimeFormat` se construye al cargar el módulo y un formateador ya
   * construido ignora el cambio. Medido, con el `timeZone` quitado a propósito:
   *
   *     TZ en caliente   -> 2026-08-02 en las cuatro zonas   ✅ verde, roto
   *     TZ en el hijo    -> 2026-08-02 / 2026-08-03          ❌ rojo
   *
   * O sea que la versión "fácil" de esta prueba sale verde con el bug dentro.
   * Ese error estaba en el barrido original del dealer y está avisado en
   * Nyro-AI/gm-erp#178.
   */
  const ZONAS = ['UTC', 'America/Puerto_Rico', 'Asia/Tokyo', 'America/Los_Angeles'];

  const enZona = (TZ: string): string =>
    execFileSync(
      process.execPath,
      ['--input-type=module', '-e',
       `const { aISOenPR } = await import(${JSON.stringify(new URL('../fechas.ts', import.meta.url).href)});
        process.stdout.write(aISOenPR(new Date('2026-08-03T00:30:00Z')));`],
      { env: { ...process.env, TZ }, encoding: 'utf8' },
    );

  it.each(ZONAS)('con TZ=%s sigue dando el día de PR', (tz) => {
    expect(enZona(tz)).toBe('2026-08-02');
  });
});

describe('hoyPR', () => {
  it('devuelve un YYYY-MM-DD bien formado', () => {
    expect(hoyPR()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('es aISOenPR de ahora', () => {
    // Débil a propósito y aquí está dicho: `hoyPR()` no tiene valor esperado.
    // Lo que de verdad se comprueba de él es la zona, arriba.
    expect(hoyPR()).toBe(aISOenPR(new Date()));
  });

  it('suma de días sobre hoy sigue siendo un día válido', () => {
    expect(masDias(hoyPR(), 30)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('PR_TZ', () => {
  it('es la zona de Puerto Rico', () => expect(PR_TZ).toBe('America/Puerto_Rico'));
});
