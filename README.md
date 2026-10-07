# @nyro-ai/core

La capa de librería de los ERPs de Nyro: **lógica de negocio sin interfaz**,
compartida por los cuatro verticales (servicios, retail, dealer, restaurante).

```bash
npm i "git+https://github.com/Nyro-AI/nyro-core-js.git#v0.3.1"
```

```ts
import { hoyPR, masDias, montoACents } from '@nyro-ai/core';

const vence = masDias(hoyPR(), 30);   // el vencimiento a 30 días, en el día de PR
const cents = montoACents('12,50');   // 1250 — la coma, que es como se teclea aquí
```

## Dónde encaja, porque los nombres se parecen

| | qué es | dónde |
|---|---|---|
| **`@nyro-ai/core`** | librería TS: lógica de negocio | este repo, `nyro-core-js` |
| `@nyro-ai/ui` | tokens, preset de Tailwind, primitivas React | `nyro-ui` |
| `nyro-api-base` | el FastAPI compartido (Python) | `nyro-api-base` |
| `nyro-core` | el **espinazo SQL**, vía `sync-core.sh` | `nyro-core` |

El repo se llama `nyro-core-js` y no `nyro-core` porque ese nombre ya lo tiene el
espinazo SQL, que es otra cosa y otro mecanismo.

## Qué entra aquí, y qué no

Entra lo que esté **demostrado idéntico en más de un vertical**. Ni antes —un
paquete con un solo consumidor es una indirección—, ni después: a la tercera
copia ya ha habido un bug.

**No entra** lo que se *llama* igual en varios verticales pero no *es* el mismo
código. Medido el 2026-09-25 sobre los cuatro, comparando sin comentarios:

```
fechas.ts          en 4   idéntico en dealer y restaurante      ← entra
useDialogA11y.ts   en 2   idéntico, pero es un re-export de @nyro-ai/ui
api.ts             en 2   mismo nombre, código distinto
dinero.ts          en 2   mismo nombre, código distinto
negocios.ts        en 3   mismo nombre, código distinto
nyroCore.ts        en 3   mismo nombre, código distinto
sesion.ts          en 2   mismo nombre, código distinto
mfa.ts, theme.ts, versionCheck.ts, nyroToken.ts, nyroSession.ts, supabase.ts
```

Subir cualquiera de esos sin unificarlo antes sería elegir a ciegas la versión de
un vertical y rompérsela a los otros tres. Por eso la v0.1.0 lleva **solo
fechas**: es lo único que estaba probado idéntico.

`dinero.ts` es el siguiente candidato obvio —el IVU y los centavos son lo más
caro de tener duplicado— pero hay que **unificarlo primero**, comparando las dos
versiones, no copiar una.

## `fechas` — el día del negocio es el de Puerto Rico

```ts
PR_TZ                       // 'America/Puerto_Rico'
hoyPR(): string             // el día de HOY del negocio, YYYY-MM-DD
aISOenPR(d?: Date): string  // un instante → el día de PR al que pertenece
masDias(iso, n): string     // suma/resta días a un YYYY-MM-DD; LANZA si no es una fecha
```

### v0.2.0 — `masDias` se niega con lo que no es una fecha

**Cambio de comportamiento.** Hasta la v0.1.0 devolvía `"NaN-NaN-NaN"`:

```ts
masDias('basura', 1)
// v0.1.0 →  "NaN-NaN-NaN"
// v0.2.0 →  TypeError: masDias esperaba un YYYY-MM-DD y recibió "basura"
```

Devolver `"NaN-NaN-NaN"` es inventarse una fecha: ese string sigue viaje hasta una
columna `date` y el fallo aparece tres capas más allá, sin nada que lo ate al
sitio donde se coló.

Lo encontró la sesión de **ERP Retail** al adoptar el paquete, y escribió la
guarda en su propio repo antes que migrar a ciegas. Al traerla aquí se le cerró un
agujero: su versión comprobaba `Number.isFinite` sobre cada trozo, y `Number('')`
es `0`, así que `"--"`, `"2026--25"` y `" - - "` pasaban y salía una fecha del año
cero. Aquí la comprobación es de **forma sobre el string**, antes de convertir nada.

**Es de forma y no de calendario**, y la distinción importa: `2026-13-45` **pasa a
propósito** y se normaliza a `2027-02-14`, porque sumar 40 días a fin de mes tiene
que rodar al mes siguiente. Lo que se corta es lo que no son tres números.

Si algo vuestro dependía del `"NaN-NaN-NaN"`, miradlo antes de subir.

**El bug que cierra.** `new Date().toISOString().slice(0, 10)` convierte a UTC.
PR va en UTC-4 todo el año, así que a partir de las 8 pm devuelve el día de
mañana:

```
19:30 en PR  →  toISOString(): 2026-10-25   en PR: 2026-10-25
20:30 en PR  →  toISOString(): 2026-10-26   en PR: 2026-10-25   ← un día tarde
```

Cuatro horas al día, todos los días.

**Un día no es un instante.** Para sellar *cuándo pasó algo* —el inicio y el fin
de una cita, una auditoría— `new Date()` y `toISOString()` a secas siguen siendo
lo correcto, y la base lo guarda en UTC. Esto es solo para el **día de
calendario**: un vencimiento, la fecha de una cita, «las horas de hoy».

## `dinero` — lo tecleado, a centavos

```ts
montoValido(s): boolean            // ¿es tecleable como dinero? (vacío SÍ lo es)
montoACents(s): number | null      // centavos enteros, o null si no hay número
centsATexto(cents): string         // "48.00", para precargar un campo editable
```

Existe porque los campos de dinero se reformateaban en cada tecla: escribías «1»
y saltaban a «1.00» antes de que pudieras poner el «.25». La pantalla guarda el
texto tal cual y llama aquí **al guardar**.

**La regla: lo que no se entiende no se guarda.** Ni se convierte a 0, ni a «sin
precio», ni se manda a ver qué dice la base. Los tres verticales se encontraron
el mismo accidente por su lado — un pago de $0 que aparece en el cuadre, una
nómina que paga de menos, un servicio que se queda sin precio.

### La coma se acepta

En Puerto Rico se teclea `12,50` sin pensarlo. Retail y restaurante la aceptaban;
servicios la rechazaba y no dejaba guardar. **Gana aceptarla**: negarse a guardar
lo que la persona quiso decir sin ambigüedad no protege de nada.

Lo que sí protege es que no se **adivine**:

| se teclea | sale | por qué |
|---|---|---|
| `12,50` · `12.50` | 1250 | la misma cifra, los dos teclados |
| `.50` · `,50` | 50 | sin el cero delante |
| `12,` | 1200 | el separador sin decimales detrás todavía es 12 |
| `1,234` | **se niega** | ¿1.23 o mil doscientos? No se elige por nadie |
| `1.2345` | **se niega** | más de dos decimales no son centavos |
| `-5` | **se niega** | el signo lo decide la columna, no el teclado |
| `1e3` · `$25` · `abc` | **se niega** | |

**Vacío es válido y no trae número**, y esa distinción es toda la gracia:
`montoValido('')` es `true`, `montoACents('')` es `null`. «Sin poner» no es cero
— en un precio de catálogo, `null` es «sin precio decidido» y `0` es «gratis».

### Si tu backend usa `exclude_unset`

`montoACents` devuelve `null`. Si necesitas que la clave **no viaje** (para que
el backend deje el valor como estaba), envuélvelo en tu repo:

```ts
const centavosDe = (t: string) => montoACents(t) ?? undefined;
```

No se cambia aquí: mandar `null` donde se esperaba «no lo toques» **borra** el
valor que había, que es justo el accidente que este módulo evita.

### Lo que NO entra

Qué importes son válidos para **cada columna** — «mayor que cero» para un cobro,
«cero sí pero negativo no» para un precio. Eso es la regla de una columna de un
vertical y vive al lado de su migración. Y el IVU tampoco: esto convierte texto a
centavos, el impuesto es otra cosa.

## El barrido

El helper probado no basta: lo que se rompe es la pantalla nueva que no lo usa.

```bash
npx nyro-barrido-fechas            # revisa ./src
npx nyro-barrido-fechas web/src
```

Recorre el directorio y falla si encuentra `toISOString().slice(…)` fuera de un
comentario. Persigue solo el **día** —el `.slice()` es lo que lo delata—, no el
instante, para que no dé rojo sobre código bueno.

Excepciones en un `nyro-fechas.json` junto al `package.json`, con la cuenta
**exacta**:

```json
{ "src/demo/mockData.ts": 1 }
```

Exacta y no "al menos", para que un modismo nuevo en un archivo ya exceptuado
también salte; y si un archivo deja de necesitar la excepción, el barrido falla
para que la lista no se pudra.

En el CI del vertical:

```yaml
- run: npx nyro-barrido-fechas src
  working-directory: web
```

## Desarrollo

```bash
npm install
npm test          # incluye la prueba en 4 zonas horarias de verdad
npm run build     # genera dist/ — es lo que instalan los verticales
```

La prueba de zonas lanza **procesos hijo** con `TZ` en su entorno. Hacerlo
cambiando `process.env.TZ` dentro del mismo proceso no sirve: el
`Intl.DateTimeFormat` se construye al cargar el módulo y un formateador ya
construido ignora el cambio, así que la prueba sale verde con el helper roto.
Está medido, y avisado en `Nyro-AI/gm-erp#178`.

## Publicar una versión

`package.json` y `VERSION` de `src/index.ts` tienen que decir lo mismo — la
compuerta y el CI lo comprueban. Después, el tag:

```bash
git tag v0.1.0 && git push origin v0.1.0
```

El CI vuelve a comprobar que el tag cuadra con las dos. Los verticales apuntan al
tag, nunca a una rama.
