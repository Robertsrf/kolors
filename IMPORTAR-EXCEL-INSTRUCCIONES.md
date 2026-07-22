# Instrucciones para convertir mi Excel en un JSON para el sistema "Kolors"

Eres un asistente que va a **leer un archivo Excel** (que adjunto en este mismo chat)
y convertirlo en un **archivo JSON** con un formato EXACTO, para poder importarlo a mi
sistema de gestión de pedidos de un taller de estampado (camisas, sublimación, eco
solvente / pendones, y pérdidas).

Lee **todas las filas** del Excel (no te detengas ni resumas de más). Al final,
entrégame el JSON completo en un bloque de código Y también como archivo `.json`
descargable llamado `kolors_import.json`.

---

## 1. Qué debes producir

⚠️ **IMPORTANTE:** genera un **archivo `.json` SEPARADO por cada tipo de dato** que
encuentres en el Excel (no los mezcles en uno solo). Cada archivo es un objeto con
**una sola clave**:

| Si el Excel tiene...        | Genera el archivo         | Con esta forma                          |
|-----------------------------|---------------------------|-----------------------------------------|
| Trabajos de SUBLIMACIÓN     | `kolors_sublimacion.json` | `{ "impresiones": [ ... ] }`            |
| Pedidos de ECO SOLVENTE     | `kolors_ecosolvente.json` | `{ "ecoSolvente": [ ... ] }`            |
| Pedidos de CAMISAS          | `kolors_camisas.json`     | `{ "pedidos": [ ... ] }`                |
| Material perdido / pruebas  | `kolors_perdidas.json`    | `{ "perdidas": [ ... ] }`               |

Solo genera los archivos de los tipos que realmente existan en el Excel. Lo más
probable es que solo necesites **sublimación** y **eco solvente** (esos se importan
por separado). Si el Excel también trae camisas o pérdidas, genera sus archivos aparte.

**Regla de oro:** los nombres de los campos (las "keys") deben ir **exactamente**
como se muestran abajo, respetando mayúsculas/minúsculas. Si un dato del Excel no
tiene dónde encajar, **NO inventes campos nuevos**: mételo dentro de `descripcion`
o simplemente ignóralo.

---

## 2. Estructura de cada tipo

### 2.1. `pedidos` (CAMISAS)

```json
{
  "cliente": { "nombre": "Juan Pérez", "telefono": "0412-1234567", "notas": "" },
  "descripcion": "Franelas negras estampado full color pecho",
  "estado": "Entregado",
  "fechas": {
    "pedido":      "2025-03-10T00:00:00.000Z",
    "impresion":   null,
    "sublimacion": null,
    "costura":     null,
    "entregado":   "2025-03-15T00:00:00.000Z"
  },
  "abono": 20,
  "creado": "2025-03-10T00:00:00.000Z",
  "items": [
    { "genero": "Unisex", "talla": "M", "descripcion": "Franela negra", "cantidad": 5, "precioUnitario": 8 }
  ],
  "pagos": []
}
```

Reglas:
- `cliente.nombre` es **obligatorio**. `telefono` y `notas` van `""` si no hay.
- `estado`: uno de exactamente estos: **`"Pedido"`**, **`"Impresión"`**, **`"Sublimación"`**, **`"Costura"`**, **`"Entregado"`**.
  - Si el pedido ya se entregó / está cerrado → `"Entregado"`.
  - Si no sabes en qué fase está → `"Pedido"`.
- `fechas`: siempre pon `pedido` (fecha del pedido). Las demás pueden ir `null`.
  Si el estado es `"Entregado"` y conoces la fecha de entrega, ponla en `entregado`.
- **El total del pedido NO es un campo**: se calcula solo como la suma de
  `cantidad × precioUnitario` de los `items`. Por eso:
  - Si el Excel tiene el detalle por talla/cantidad, crea un item por cada línea.
  - Si el Excel solo tiene un **total** y una **cantidad** (sin desglose), crea **un
    solo item**: `cantidad` = las camisas, `precioUnitario` = total ÷ cantidad.
  - Si solo hay un total y ni siquiera cantidad, usa `cantidad: 1` y `precioUnitario` = total.
- `genero`: uno de exactamente: **`"Niño"`, `"Niña"`, `"Dama"`, `"Caballero"`, `"Unisex"`**.
  Si el Excel no dice género, usa `"Unisex"`.
- `talla`: texto libre (ej. "M", "L", "10"). Si no hay, usa `"-"`.
- `abono`: cuánto **ya pagó** el cliente (para reflejar la deuda). `pagos`: puedes
  dejarlo `[]` y meter todo lo pagado en `abono`. La deuda se calcula sola como
  `total − abono`.

### 2.2. `impresiones` (SUBLIMACIÓN)

```json
{
  "cliente": "María Gómez",
  "fecha": "2025-04-02T00:00:00.000Z",
  "tipo": "otros",
  "ancho": 1.0,
  "alto": 0.5,
  "precioM2": 12,
  "descripcion": "Sublimación taza personalizada",
  "abono": 0,
  "pagos": []
}
```

Reglas:
- `cliente` aquí es **texto directo** (no un objeto), obligatorio.
- `tipo`: **`"camisa"`**, **`"taller"`** o **`"otros"`**.
  - `"otros"` = se cobra aparte (usa `precioM2` real).
  - `"camisa"` / `"taller"` = solo se registra el m², **no se cobra** (pon `precioM2: 0`).
  - Si dudas, usa `"otros"`.
- El total = `ancho × alto × precioM2`. Si el Excel solo tiene un **precio total** y
  no las medidas: usa `ancho: 1`, `alto: 1`, `precioM2: <total>` (1 m² a ese precio)
  y aclara la medida real en `descripcion`.
- `abono` = lo ya pagado.

### 2.3. `ecoSolvente` (PENDONES / ECO SOLVENTE)

```json
{
  "cliente": "Bodegón El Sol",
  "fecha": "2025-05-01T00:00:00.000Z",
  "ancho": 3,
  "alto": 1,
  "precioM2": 10,
  "descripcion": "Pendón promoción apertura",
  "abono": 15,
  "estado": "Entregado",
  "fechas": {
    "pedido":    "2025-05-01T00:00:00.000Z",
    "diseno":    null,
    "impresion": null,
    "acabado":   null,
    "entregado": "2025-05-03T00:00:00.000Z"
  },
  "remate": "tubos",
  "remateCosto": 8,
  "llevaDiseno": true,
  "disenoCosto": 10,
  "llevaEstructura": false,
  "estructuraCosto": 0,
  "clearModo": "ninguno",
  "clearCosto": 0,
  "clearPrecioM2": 0,
  "transferModo": "ninguno",
  "transferCosto": 0,
  "transferPrecioM2": 0,
  "pagos": []
}
```

Reglas:
- El total = `ancho × alto × precioM2` (impresión) **más** los extras que apliquen:
  - `remate`: **`"ninguno"`, `"palos"`** o **`"tubos"`**; su costo en `remateCosto`.
  - `llevaDiseno` (true/false) + `disenoCosto`.
  - `llevaEstructura` (true/false) + `estructuraCosto`.
  - `clearModo`: **`"ninguno"`** (no lleva), **`"fijo"`** (usa `clearCosto`) o
    **`"m2"`** (usa `clearPrecioM2`, se multiplica por ancho×alto).
  - `transferModo`: igual que clear (`"ninguno"`/`"fijo"`/`"m2"`).
- Si un extra no aplica, deja sus valores por defecto (`"ninguno"`, `false`, `0`).
- `estado`: **`"Pedido"`, `"Diseño"`, `"Impresión"`, `"Acabado"`, `"Entregado"`**.
  Si no sabes, usa `"Pedido"` (o `"Entregado"` si ya se cerró).
- Si solo hay un precio total y no medidas, usa `ancho: 1`, `alto: 1`,
  `precioM2: <total de impresión>` y pon los extras aparte si los conoces.

### 2.4. `perdidas` (MATERIAL PERDIDO / PRUEBAS)

```json
{
  "fecha": "2025-06-10T00:00:00.000Z",
  "tipo": "prueba",
  "ancho": 0.3,
  "alto": 0.3,
  "precioM2": 8,
  "descripcion": "Prueba de color en vinil",
  "creado": "2025-06-10T00:00:00.000Z"
}
```

Reglas:
- `tipo`: **`"perdida"`** (material dañado/desperdiciado) o **`"prueba"`** (prueba de impresión).
- El total perdido = `ancho × alto × precioM2`.

---

## 3. Reglas de conversión (IMPORTANTE)

- **Fechas:** conviértelas a formato ISO 8601 (`"AAAA-MM-DDT00:00:00.000Z"`).
  ⚠️ Mi Excel usa formato **día/mes/año** (ej. `05/03/2025` = 5 de marzo, NO 3 de mayo).
  Interpreta día primero. Si una fila no tiene fecha, usa la fecha del pedido/creación
  más razonable, o la de hoy como último recurso.
- **Dinero:** siempre números, sin símbolos. Quita `$`, `Bs`, espacios y separadores de
  miles. Usa **punto** como decimal (`1234.50`, no `1.234,50`).
- **Cliente sin nombre:** si una fila no tiene cliente, ponle `"Sin nombre"` (no la descartes)
  salvo que esté completamente vacía.
- **Deudas:** el sistema calcula la deuda como `total − abono`. Entonces:
  - Si el Excel tiene columnas tipo "Total" y "Abonado/Pagado" → el total va en los
    `items`/`precioM2` y lo pagado va en `abono`.
  - Si dice "Debe X" y "Total Y" → `abono = Y − X`.
  - Si está todo pagado → `abono` = total. Si no pagó nada → `abono = 0`.

---

## 4. Cómo decidir a qué lista va cada fila

Usa la columna de tipo de trabajo del Excel si existe. Si no, guíate así:
- Camisas / franelas / chemises / textil estampado → **`pedidos`**.
- Sublimación (tazas, textil sublimado, gorras sublimadas, etc.) → **`impresiones`**.
- Pendones / banners / vinil / gran formato / eco solvente → **`ecoSolvente`**.
- Material dañado o pruebas → **`perdidas`**.

Si una fila es ambigua, elige la opción más probable y **anota la duda en `descripcion`**.
Si TODO el Excel es de un solo tipo y no estás seguro de cuál, **pregúntame antes de generar**.

---

## 5. Qué ignorar y dónde poner los detalles

- **Ignora** columnas que no encajan en ningún campo (códigos internos, colores de
  celda, columnas de control, totales duplicados, etc.).
- **Aprovecha** todo lo descriptivo (diseño, tela, color, medida, referencia, notas)
  metiéndolo en `descripcion` para no perder información.
- No dupliques clientes: el sistema los agrupa solo por nombre, así que escribe el
  nombre igual siempre que sea la misma persona (respeta mayúsculas/acentos de forma
  consistente).

---

## 6. Antes de entregar, valida

- Que sea **JSON válido** (comillas dobles, sin comas finales, números sin comillas).
- Que cada `estado`, `tipo`, `genero`, `remate`, `clearModo`, `transferModo` use
  **solo** uno de los valores permitidos de arriba.
- Que todos los montos y medidas sean **números**, no texto.

Y dame un **resumen final** en español:
- Cuántos registros de cada tipo generaste (pedidos / impresiones / ecoSolvente / perdidas).
- Suma total facturada y suma total de deuda pendiente.
- Filas que ignoraste o dudas que tuviste, y por qué.

---

## 7. Cómo lo voy a usar (contexto, no hace falta que hagas nada)

Cargaré cada archivo en mi sistema, en la pestaña **⚙️ Datos**, con su botón dedicado:
- `kolors_sublimacion.json` → botón **"Importar solo Sublimación"**.
- `kolors_ecosolvente.json` → botón **"Importar solo Eco Solvente"**.
- `kolors_camisas.json` y `kolors_perdidas.json` (si existen) → botón **"Importar respaldo completo"**.

Cada importación **suma** a lo que ya exista, así que hay que importar cada archivo
**una sola vez**.
