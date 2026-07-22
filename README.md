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

### 3. Crear las 4 cuentas (una por rol / código)
El acceso es por **código de 4 dígitos** (sin usuario). Cada código está ligado a
una cuenta de Supabase con un correo fijo. La contraseña de cada cuenta es
**el código seguido de `kolors`** (ej: código `4729` → contraseña `4729kolors`).

1. Menú lateral: **Authentication** → **Users** → **Add user** → **Create new user**.
2. Marca **"Auto Confirm User"** (para que pueda entrar de una vez).
3. Crea estas 4 cuentas con EXACTAMENTE estos correos y estas contraseñas:

   | Persona / rol                 | Email (fijo)          | Contraseña (código + `kolors`) |
   |-------------------------------|-----------------------|--------------------------------|
   | Admin general (tú)            | `admin@kolors.app`    | `<código admin>kolors`         |
   | Jefe (solo lectura)           | `jefe@kolors.app`     | `<código jefe>kolors`          |
   | María (edita todo)            | `maria@kolors.app`    | `<código maría>kolors`         |
   | Mía (edita todo)              | `mia@kolors.app`      | `<código mía>kolors`           |

   > Los correos son internos, no tienen que existir de verdad. Lo único que la
   > gente escribe al entrar es su código de 4 dígitos.

**¿Cómo cambio un código más adelante?** En Authentication → Users, abre esa
cuenta, **Reset password** y pon la nueva contraseña = nuevo código + `kolors`.

**¿Los roles?** El jefe (`jefe@kolors.app`) queda como **solo lectura** hasta a
nivel de base de datos: aunque quisiera, no puede modificar nada. Admin, María y
Mía pueden editar todo. Solo el admin ve los botones de "Importar" y "Borrar todo".

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
- **🖨️ Sublimación**: impresiones para sublimar. El tipo "camisa" o "taller" solo
  registra m² (no cobra aparte); "otros" sí cobra.
- **🏳️ Eco Solvente**: pendones. Impresión por m² más extras opcionales con su
  costo: remate (palos/tubos), diseño, estructura, clear y transfer (estos dos se
  pueden cobrar fijo o por m²).
- **🗑️ Pérdidas**: material perdido y pruebas de impresión (m² y su costo).
- **📇 Clientes**: cuánto debe cada cliente, desglosado por camisas, sublimación y
  eco solvente.
- **📊 Estadísticas**: gráficos y totales de todo.
- **💲 Precios** (botón flotante): tu tarifario de referencia.

Cualquier cambio que haga una persona aparece automáticamente en las pantallas de
las demás sin recargar.

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
  api.js              Leer/guardar en Supabase + tiempo real
  render.js           Redibuja la pantalla
  main.js             Arranque general y pestañas
  ui/                 Cada pantalla (tablero, sublimación, eco solvente, etc.)
  modales/            Cada ventana de formulario
supabase/schema.sql   Script para crear la base de datos
legacy-localstorage.html   Versión anterior de un solo archivo (respaldo)
```
