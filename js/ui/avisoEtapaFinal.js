import { state } from "../state.js";
import { escapeHtml } from "../utils.js";
import { getUsuarioActual } from "../auth.js";

// ============================================================
// AVISO: UNA TARJETA LLEGÓ A LA ÚLTIMA ETAPA
//
// Cuando cualquier pedido llega a la última columna de un tablero (la de
// "Entregado", o como se llame ahora), a TODOS los que tengan la app abierta
// les salta esta ventanita. Se cierra con la ✕ (o con "Entendido"): no se
// cierra sola ni al hacer clic fuera, para que nadie se la pierda.
//
// El aviso se detecta de dos maneras, para que no se escape ninguno:
//   1. Comparando los datos antes/después de cada refresco. Funciona siempre,
//      incluso si el aviso instantáneo se perdió en el camino.
//   2. Con un aviso instantáneo (broadcast) que manda quien movió la tarjeta:
//      llega al momento y además nos dice quién fue.
// El mismo movimiento no se muestra dos veces (se recuerda un rato).
// ============================================================

// Los tableros con etapas. Sublimación y Pérdidas no tienen columnas/fases, así
// que ahí no hay "última etapa" que avisar.
const SECCIONES = [
  {
    clave: "camisas",
    icono: "👕",
    nombre: "Tablero de camisas",
    tab: "tablero",
    lista: () => state.pedidos,
    fases: () => state.fasesCamisas,
    cliente: (p) => (p.cliente ? p.cliente.nombre : ""),
  },
  {
    clave: "eco",
    icono: "🏳️",
    nombre: "Eco Solvente",
    tab: "ecosolvente",
    lista: () => state.ecoSolvente,
    fases: () => state.fasesEco,
    cliente: (e) => e.cliente,
  },
];

const VENTANA_DUPLICADO_MS = 2 * 60 * 1000; // no repetir el mismo aviso antes de 2 min
const VENTANA_AUTOR_MS = 60 * 1000; // cuánto se recuerda quién movió cada tarjeta
const MAX_EVENTOS = 10;

let estadosPrevios = null; // Map "seccion:id" -> estado. null = todavía sin foto inicial
const autores = new Map(); // id -> { usuario, ts }
const yaAvisados = new Map(); // "id:fase" -> ts
let eventos = [];

function el(id) {
  return document.getElementById(id);
}

// Al entrar o salir de una sesión se empieza de cero: así no salta un aviso por
// cada pedido que ya estaba entregado desde antes.
export function reiniciarAvisoEtapaFinal() {
  estadosPrevios = null;
  autores.clear();
  yaAvisados.clear();
  eventos = [];
  const overlay = el("modalAvisoEtapaOverlay");
  if (overlay) overlay.classList.remove("active");
}

export function registrarAutorEtapaFinal(id, usuario) {
  if (!id || !usuario) return;
  autores.set(id, { usuario, ts: Date.now() });
}

function autorDe(id) {
  const a = autores.get(id);
  if (!a) return "";
  if (Date.now() - a.ts > VENTANA_AUTOR_MS) {
    autores.delete(id);
    return "";
  }
  return a.usuario;
}

function textoAutor(autor) {
  if (!autor) return "";
  const yo = getUsuarioActual();
  if (yo && autor === yo.nombre) return "Lo moviste tú";
  return `Lo movió ${autor}`;
}

// Muestra el aviso (o lo agrega a la lista si la ventana ya está abierta).
export function notificarEtapaFinal(ev) {
  if (!ev || !ev.id || !ev.fase) return;
  const clave = ev.id + ":" + ev.fase;
  const ahora = Date.now();
  const previo = yaAvisados.get(clave);

  if (previo && ahora - previo < VENTANA_DUPLICADO_MS) {
    // Ya se avisó de este movimiento. Si recién ahora sabemos quién fue, se
    // completa el texto del aviso que ya está en pantalla.
    const autor = ev.autor || autorDe(ev.id);
    const anterior = eventos.find((e) => e.id === ev.id && e.fase === ev.fase);
    if (anterior && !anterior.autor && autor) {
      anterior.autor = autor;
      pintarLista();
    }
    return;
  }

  yaAvisados.set(clave, ahora);
  eventos.unshift({
    id: ev.id,
    cliente: ev.cliente || "Sin nombre",
    seccion: ev.seccion || "",
    icono: ev.icono || "✅",
    fase: ev.fase,
    autor: ev.autor || autorDe(ev.id),
    hora: ahora,
  });
  eventos = eventos.slice(0, MAX_EVENTOS);
  abrir();
}

// Compara la foto anterior con la de ahora y avisa de lo que acaba de llegar a
// la última etapa. Se llama después de cada refresco de datos.
export function revisarEtapaFinal() {
  const previos = estadosPrevios;
  const actuales = new Map();
  const nuevos = [];

  SECCIONES.forEach((sec) => {
    const fases = sec.fases();
    if (!fases || !fases.length) return;
    const ultima = fases[fases.length - 1];
    sec.lista().forEach((item) => {
      const clave = sec.clave + ":" + item.id;
      actuales.set(clave, item.estado);
      if (!previos) return; // primera vez: solo se toma la foto
      const antes = previos.get(clave);
      if (antes === undefined) return; // pedido recién creado: no es un "pase de etapa"
      if (item.estado !== ultima.id || antes === ultima.id) return;
      nuevos.push({
        id: item.id,
        cliente: sec.cliente(item),
        seccion: sec.nombre,
        icono: sec.icono,
        fase: ultima.nombre,
      });
    });
  });

  estadosPrevios = actuales;
  nuevos.forEach(notificarEtapaFinal);
}

// ============================================================
// LA VENTANITA
// ============================================================
function horaCorta(ts) {
  return new Date(ts).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" });
}

function pintarLista() {
  const cont = el("avisoEtapaLista");
  if (!cont) return;
  const titulo = el("avisoEtapaTitulo");
  if (titulo) {
    titulo.textContent =
      eventos.length > 1
        ? `🎉 ${eventos.length} pedidos llegaron a la última etapa`
        : "🎉 Un pedido llegó a la última etapa";
  }
  cont.innerHTML = eventos
    .map((ev) => {
      const quien = textoAutor(ev.autor);
      return `<div class="aviso-etapa-item">
        <span class="ic">${ev.icono}</span>
        <div class="info">
          <div class="cli">${escapeHtml(ev.cliente)}</div>
          <div class="sub">${escapeHtml(ev.seccion)} · pasó a <b>${escapeHtml(ev.fase)}</b></div>
          ${quien ? `<div class="quien">${escapeHtml(quien)}</div>` : ""}
        </div>
        <span class="hora">${horaCorta(ev.hora)}</span>
      </div>`;
    })
    .join("");
}

function abrir() {
  const overlay = el("modalAvisoEtapaOverlay");
  if (!overlay) return;
  pintarLista();
  overlay.classList.add("active");
}

function cerrar() {
  const overlay = el("modalAvisoEtapaOverlay");
  if (overlay) overlay.classList.remove("active");
  eventos = [];
}

const btnCerrar = el("btnCerrarAvisoEtapa");
if (btnCerrar) btnCerrar.addEventListener("click", cerrar);
const btnEntendido = el("btnEntendidoAvisoEtapa");
if (btnEntendido) btnEntendido.addEventListener("click", cerrar);
