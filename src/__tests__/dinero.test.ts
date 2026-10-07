/**
 * Las pruebas del dinero se escriben desde LA REGLA, no desde el código.
 *
 * Y la regla aquí tiene dos mitades que se confunden con facilidad:
 *   · qué textos son ACEPTABLES  -> montoValido
 *   · qué textos traen un NÚMERO -> montoACents
 * El vacío separa las dos: es aceptable y no trae número. Si alguna vez una
 * prueba las usa indistintamente, es que se perdió la distinción.
 */
import { describe, expect, it } from 'vitest';

import { centsATexto, montoACents, montoValido } from '../dinero.js';

describe('lo que la gente teclea de verdad', () => {
  it.each([
    ['12.50', 1250],
    ['12,50', 1250],   // LA COMA. En PR se teclea sin pensarlo.
    ['.50', 50],
    [',50', 50],
    ['1', 100],
    ['1,2', 120],
    ['0', 0],
    ['0,00', 0],
    ['999999,99', 99999999],
    ['  12,50  ', 1250],   // se recorta
  ])('«%s» -> %i centavos', (texto, cents) => {
    expect(montoACents(texto)).toBe(cents);
    expect(montoValido(texto)).toBe(true);
  });
});

describe('donde no hay una lectura única, se para', () => {
  /**
   * Cada uno de estos tiene DOS lecturas posibles o ninguna. Convertirlos a
   * algo sería elegir por quien tecleó, y en un campo de dinero eso es cambiar
   * una cifra sin decírselo a nadie.
   */
  it.each([
    ['1,234', 'separador de miles o 1.23: no se adivina'],
    ['1,234.56', 'dos separadores'],
    ['1.2345', 'más de dos decimales no son centavos'],
    ['-5', 'el signo lo decide la columna, no el teclado'],
    ['1e3', 'nadie teclea notación exponencial en una caja'],
    ['1e999', 'ni eso'],
    ['$25', 'el símbolo no se teclea en el campo'],
    ['abc', 'no es un número'],
    ['NaN', 'escrito a mano'],
    ['Infinity', 'idem'],
  ])('«%s» no se guarda (%s)', (texto) => {
    expect(montoACents(texto)).toBeNull();
    expect(montoValido(texto)).toBe(false);
  });
});

describe('el separador sin decimales detrás sí se lee', () => {
  /**
   * `12,` es 12 y pico sin pico: alguien tecleó el separador y todavía no los
   * decimales. Leerlo como $12.00 es lo que quiso decir, y es lo que retail y
   * restaurante llevan haciendo. Lo escribí esperando que se negara y me
   * equivoqué yo, no el código.
   */
  it.each([['12,', 1200], ['12.', 1200], ['0,', 0]])('«%s» -> %i', (t, c) => {
    expect(montoACents(t)).toBe(c);
    expect(montoValido(t)).toBe(true);
  });
});

describe('el vacío: aceptable, pero sin número', () => {
  /**
   * ES LA DISTINCIÓN QUE MÁS CUESTA Y LA QUE MÁS IMPORTA. «Sin poner» no es
   * cero. En un precio de catálogo, `null` es «sin precio decidido» y `0` es
   * «gratis», y confundirlos hace que el próximo que cotice cobre de menos.
   */
  it.each(['', '   '])('«%s» es válido pero no trae número', (vacio) => {
    expect(montoValido(vacio)).toBe(true);
    expect(montoACents(vacio)).toBeNull();
  });

  it('y por eso montoValido y montoACents NO son la misma pregunta', () => {
    expect(montoValido('')).toBe(true);
    expect(montoValido('abc')).toBe(false);
    // Las dos dan null al convertir, pero solo una es aceptable.
    expect(montoACents('')).toBeNull();
    expect(montoACents('abc')).toBeNull();
  });
});

describe('centavos sin float en el camino', () => {
  it('el medio centavo NO llega aquí: lo para la regex', () => {
    // Importa decirlo porque el instinto es que `Math.round` esté para esto, y
    // no lo está. Tres decimales no son centavos y no se guardan.
    expect(montoACents('0.005')).toBeNull();
    expect(montoACents('0,005')).toBeNull();
  });

  it('lo que Math.round SÍ arregla es el error del binario', () => {
    // Number('8.2') * 100 = 819.9999999999999. Con `trunc` serían $8.19: un
    // centavo por línea, en silencio y en el lado malo.
    expect(Number('8.2') * 100).not.toBe(820);
    expect(montoACents('8,20')).toBe(820);
  });

  it.each([
    ['0,10', 10], ['0,20', 20], ['0,30', 30], ['0,70', 70],
    ['1,10', 110], ['2,30', 230], ['8,20', 820],
  ])('«%s» -> %i sin arrastrar el error del binario', (texto, cents) => {
    // 0.1*100 = 10.000000000000002 en coma flotante. Sin Math.round, varios de
    // estos se irían un centavo.
    expect(montoACents(texto)).toBe(cents);
  });
});

describe('centsATexto, para volver a teclear encima', () => {
  it.each([
    [1250, '12.50'],
    [50, '0.50'],
    [0, '0.00'],
    [99999999, '999999.99'],
  ])('%i -> «%s»', (cents, texto) => {
    expect(centsATexto(cents)).toBe(texto);
  });

  it.each([null, undefined])('%s -> cadena vacía, no «0.00»', (nada) => {
    // Precargar «0.00» donde no había precio es escribir «gratis» por el
    // usuario. Vacío es vacío.
    expect(centsATexto(nada)).toBe('');
  });

  it('ida y vuelta sobre lo que se teclea de verdad', () => {
    for (const t of ['12,50', '0,01', '999999,99', '1']) {
      const c = montoACents(t);
      expect(c).not.toBeNull();
      expect(montoACents(centsATexto(c))).toBe(c);
    }
  });

  it('NO lleva símbolo ni separador de miles: se vuelve a teclear encima', () => {
    expect(centsATexto(123456789)).toBe('1234567.89');
  });
});
