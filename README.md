# Kolors · Gestor de pedidos

Sistema multiusuario para el taller: pedidos de camisa, sublimación, eco solvente
(pendones), pérdidas/pruebas, clientes y estadísticas. Los datos se guardan en
**Supabase** (base de datos en la nube), así que varias personas pueden usarlo al
mismo tiempo desde distintos dispositivos y todos ven lo mismo en tiempo real.

---

## Puesta en marcha (una sola vez)

Sigue estos pasos en orden. Solo hay que hacerlos la primera vez.

### 1. Crear el proyecto en Supabase
1. Entra a https://supabase.com y crea una cuenta gratis.
2. Botón **New project**. Ponle nombre (ej. `kolors`), elige una contraseña para la
   base de datos (guárdala) y la región más cercana. Espera ~2 minutos a que se cree.

### 2. Crear las tablas
1. En el panel del proyecto, menú lateral: **SQL Editor** → **New query**.
2. Abre el archivo `supabase/schema.sql` de este proyecto, copia **todo** su
   contenido, pégalo en el editor y presiona **Run**.
3. Debe decir "Success". Esto crea todas las tablas y la seguridad.

> **¿Ya tenías la base de datos creada de antes?** No repitas el paso: corre solo
> los archivos `supabase/migracion-*.sql` que todavía no hayas ejecutado (uno por
> función nueva), igual que en el SQL Editor. Son seguros de correr una sola vez.

> **⚠️ Importante para que todos vean los cambios al instante:** corre
> `supabase/migracion-realtime.sql`. Revisa tabla por tabla que esté publicada en
> tiempo real y activa las que falten (es la causa más común de "hice un cambio y
> los demás no lo ven hasta recargar"). Se puede correr las veces que quieras.

### 3. Crear las 4 cuentas (una por rol / código)
El acceso es por **código de 4 dígitos** (sin usuario). Cada código está ligado a
una cuenta de Supabase con un correo fijo. La contraseña de cada cuenta es
**el código seguido de `kolors`** (ej: código `4729` → contraseña `4729kolors`).

1. Menú lateral: **Authentication** → **Users** → **Add user** → **Create new user**.
2. Marca **"Auto Confirm User"** (para que pueda entrar de una vez).
3. Crea estas 5 cuentas con EXACTAMENTE estos correos y estas contraseñas:

   | Persona / rol                 | Email (fijo)          | Contraseña (código + `kolors`) |
   |-------------------------------|-----------------------|--------------------------------|
   | Admin general (tú)            | `admin@kolors.app`    | `<código admin>kolors`         |
   | Jefe (solo lectura)           | `jefe@kolors.app`     | `<código jefe>kolors`          |
   | Dariana (acceso completo)     | `dariana@kolors.app`  | `<código dariana>kolors`       |
   | María (edita el día a día)    | `maria@kolors.app`    | `<código maría>kolors`         |
   | Mía (edita el día a día)      | `mia@kolors.app`      | `<código mía>kolors`           |

   > Los correos son internos, no tienen que existir de verdad. Lo único que la
   > gente escribe al entrar es su código de 4 dígitos.

**¿Cómo cambio un código más adelante?** En Authentication → Users, abre esa
cuenta, **Reset password** y pon la nueva contraseña = nuevo código + `kolors`.

**¿Los roles?** El jefe (`jefe@kolors.app`) queda como **solo lectura** hasta a
nivel de base de datos: aunque quisiera, no puede modificar nada. María y Mía
editan el trabajo diario (pedidos, clientes, etc.), pero no ven el log ni fijan
las metas. **Admin y Dariana tienen acceso completo**, incluidos el log, las
metas y los botones de "Importar" y "Borrar todo".

### 4. Pegar las credenciales en la app
1. En Supabase: **Project Settings** (engranaje) → **API**.
2. Copia el **Project URL** y la clave **anon public**.
3. Abre el archivo `js/config.js` de este proyecto y reemplaza los dos valores:
   ```js
   export const SUPABASE_URL = "https://xxxxx.supabase.co";      // tu Project URL
   export const SUPABASE_ANON_KEY = "eyJhbGc...";                 // tu anon public key
   ```
   > La `anon key` es segura de dejar en el código: la seguridad real la dan las
   > cuentas de usuario y las políticas del paso 2. Nadie sin cuenta puede ver ni
   > cambiar datos.

### 5. Publicar la app en internet
Como es solo HTML/CSS/JS (sin compilar), se puede publicar como sitio estático gratis.
La forma más simple:

**Opción A – GitHub Pages**
1. Sube toda esta carpeta a un repositorio de GitHub.
2. En el repo: **Settings** → **Pages** → Source: `main` / carpeta `/root` → **Save**.
3. En 1-2 minutos te da una URL tipo `https://tuusuario.github.io/kolors/`.
   Comparte esa URL con tu equipo.

**Opción B – Netlify** (arrastrar y soltar)
1. Entra a https://app.netlify.com/drop y arrastra la carpeta completa.
2. Te da una URL al instante.

### 6. (Opcional) Pasar tus datos viejos
Si ya venías usando la versión anterior (el archivo único), en esa versión usa
**⚙️ Datos → Exportar JSON** para bajar un respaldo. Luego, ya en la versión nueva
y con sesión iniciada, ve a **⚙️ Datos → Importar respaldo antiguo**, elige ese
archivo y se subirá todo a Supabase.

---

## Cómo se usa

- **Entrar**: cada persona abre la URL y escribe su **código de 4 dígitos**. Según
  el código entra con su rol (admin, editor o solo lectura).
- **📋 Tablero**: pedidos de camisa por fase (Pedido → Impresión → Sublimación →
  Costura → Entregado). Filtro de "Deben / Pagados".
- **📸 Sesiones fotográficas**: al lado del tablero. Un calendario del mes muestra
  lo agendado (toca un día para ver solo ese día, o para agendar ahí mismo) y al
  lado va la lista con el detalle. De cada sesión se registra: nombre y apellido,
  teléfono, día, valor de la sesión, si es **en el estudio o al aire libre**,
  descripción, y si lleva **fotos impresas**: cuántas y a qué precio cada una, por
  tamaño (4×6", 5×7", 8×10", 11×14", 16×20" y 20×24"). Es la única sección que el
  **jefe sí puede modificar**. Mientras estás aquí, el panel de herramientas de la
  izquierda desaparece: no tiene que ver con esta área. Necesita correr una vez
  `supabase/migracion-sesiones-foto.sql`.
- **🖨️ Sublimación**: impresiones para sublimar. El tipo "camisa" o "taller" solo
  registra m² (no cobra aparte); "otros" sí cobra.
- **🏳️ Eco Solvente**: pendones y demás trabajos. Según el **tipo de trabajo**:
  - *Impresión*: por m² (ancho × alto) más extras opcionales con su costo: remate
    (palos/tubos), diseño, estructura, clear, transfer y PVC (estos se pueden
    cobrar fijo o por m²).
  - *Stickers* y *Vinil Tornasol*: se escriben los m² directo (+ diseño opcional).
  - *Papel Bond*: cantidad de impresiones × costo por impresión (+ diseño opcional).
  - *DTF*: cantidad de unidades × precio por unidad (+ diseño opcional). Una unidad
    de DTF mide siempre 1 m × 57 cm (0,57 m²).
- **🗑️ Pérdidas**: material perdido y pruebas de impresión (m² y su costo).
- **📇 Clientes**: cuánto debe cada cliente, desglosado por camisas, sublimación y
  eco solvente.
- **📊 Estadísticas**: gráficos y totales de todo, incluido el bloque de
  **sesiones fotográficas y fotos impresas** (cuántas sesiones, en estudio o al
  aire libre, cuántas fotos se imprimieron de cada tamaño y cuánto se cobró).
- **🎯 Metas** (panel): objetivos por semana y por mes (los fijan admin y jefe).
  Cuenta lo que llega a la fase final, en la semana y el mes en curso.
- **🏁 Historial de metas**: cómo terminó cada semana y cada mes ya cerrado —
  resumen (cuántos períodos al 100%, cumplimiento promedio, racha, mejor período),
  un gráfico por meta (barras de lo logrado + línea de la meta, con ✅ en los
  períodos cumplidos) y el detalle período por período. Las metas de un período
  cerrado se congelan, así que cambiarlas hoy no reescribe el pasado.
- **📋 Mis listas** (panel): listas de control **personales**. Cada quien crea las
  suyas con un título ("Camisas de hoy") y va apuntando lo que trabaja ("5 camisas
  talla L"); se tacha con un toque y una barra muestra cuánto llevas. Son privadas:
  solo las ve quien las creó, ni siquiera el administrador. Se guardan solas y te
  siguen aunque entres desde otro dispositivo. Necesita correr una vez
  `supabase/migracion-listas-personales.sql`.
- **💲 Precios** (botón flotante): tu tarifario de referencia.

Cualquier cambio que haga una persona aparece automáticamente en las pantallas de
las demás sin recargar.

### Que todo llegue solo (sin recargar la página)

- **🎉 Aviso de "última etapa"**: cuando una tarjeta llega a la **última columna**
  de un tablero (Camisas o Eco Solvente) —la de Entregado, o como la hayas
  renombrado— a **todos** los que tengan la app abierta les salta una ventanita
  con el cliente, la sección y quién la movió. Se cierra con la **✕** (o con
  "Entendido"); no se cierra sola ni al hacer clic por fuera. Si caen varias
  seguidas, se van juntando en la misma lista. *Sublimación y Pérdidas no tienen
  columnas/etapas, así que ahí no hay aviso.*
- **Indicador de conexión** (arriba a la derecha, junto a tu nombre):
  - 🟢 **En vivo**: los cambios de los demás llegan al momento.
  - 🟡 **Reconectando…**: se cayó el canal en vivo (wifi, pestaña dormida...);
    mientras tanto la app se refresca sola cada 15 segundos y sigue reintentando.
  - 🔴 **Sin conexión**: no hay internet o el servidor no responde.
  - Haciendo **clic en el indicador** se actualiza todo al instante.
- Además, la app se refresca sola al **volver a la pestaña**, al **recuperar
  internet** y cada minuto por si acaso. Los mensajes del chat, las notas y el log
  entran en ese mismo repaso: ya no hace falta recargar para verlos.
- Si aun así notas que los cambios tardan, corre en Supabase
  `supabase/migracion-realtime.sql` (ver el paso 2 de la puesta en marcha).

---

## Estructura del código

```
index.html            Estructura de la página (secciones y ventanas)
css/styles.css        Todos los estilos
js/
  config.js           Credenciales de Supabase (las llenas tú)
  supabaseClient.js   Conexión a Supabase
  auth.js             Login / cerrar sesión
  utils.js            Formato de dinero, fechas, helpers
  state.js            Datos en memoria + cálculos (totales, saldos...)
  metasCalc.js        Metas: períodos, lo producido en cada uno y su comparación
  api.js              Leer/guardar en Supabase + tiempo real
  sync.js             Mantiene la app al día: tiempo real, reconexión y repaso
  render.js           Redibuja la pantalla
  main.js             Arranque general y pestañas
  ui/                 Cada pantalla (tablero, sublimación, eco solvente, etc.)
  modales/            Cada ventana de formulario
supabase/schema.sql   Script para crear la base de datos
legacy-localstorage.html   Versión anterior de un solo archivo (respaldo)
```
