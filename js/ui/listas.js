// Mis listas: el bloc de control personal de cada quien.
//
// A diferencia de las notas compartidas, estas listas son privadas: la base de
// datos solo devuelve las del usuario que tiene la sesión abierta. Sirven para
// ir apuntando el trabajo del día ("5 camisas L", "planchar las de Ana") y
// tacharlo conforme se va haciendo.
import { state } from "../state.js";
import { cargarListas, crearLista, guardarLista, borrarLista } from "../api.js";
import { escapeHtml } from "../utils.js";

const overlay = document.getElementById("modalListasOverlay");
const vistaIndice = document.getElementById("listasVistaIndice");
const vistaDetalle = document.getElementById("listasVistaDetalle");
const indiceEl = document.getElementById("listasIndice");
const formNuevaLista = document.getElementById("formNuevaLista");
const inputNuevaLista = document.getElementById("listaNuevaTitulo");
const formNuevoItem = document.getElementById("formNuevoItem");
const inputNuevoItem = document.getElementById("itemNuevoTexto");
const tituloInput = document.getElementById("listaTituloInput");
const itemsEl = document.getElementById("listaItems");
const progresoEl = document.getElementById("listaProgreso");
const estadoEl = document.getElementById("listasEstado");

let listaAbiertaId = null;
let guardarTimer = null;
// Lista con cambios que todavía no llegaron a la base de datos.
let pendienteId = null;
let cargado = false;

function nuevoItemId() {
  return "it-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function listaPorId(id) {
  return state.listas.find((l) => l.id === id) || null;
}
function listaAbierta() {
  return listaPorId(listaAbiertaId);
}

// ============================================================
// GUARDADO (con espera, para no escribir en cada tecla)
// ============================================================
function programarGuardado(id) {
  pendienteId = id;
  estadoEl.textContent = "Escribiendo…";
  if (guardarTimer) clearTimeout(guardarTimer);
  guardarTimer = setTimeout(guardarPendiente, 600);
}

async function guardarPendiente() {
  if (guardarTimer) {
    clearTimeout(guardarTimer);
    guardarTimer = null;
  }
  const id = pendienteId;
  if (!id) return;
  pendienteId = null;
  const lista = listaPorId(id);
  if (!lista) return;
  try {
    await guardarLista(id, { titulo: lista.titulo, items: lista.items });
    estadoEl.textContent = "Guardado ✓";
  } catch (e) {
    estadoEl.textContent = "Error al guardar: " + e.message;
  }
}

// ============================================================
// PINTADO
// ============================================================
function renderIndice() {
  if (!state.listas.length) {
    indiceEl.innerHTML = `<div class="listas-vacio">Todavía no tienes listas.<br>Crea una arriba para empezar a llevar tu control.</div>`;
    return;
  }
  indiceEl.innerHTML = state.listas
    .map((l) => {
      const total = l.items.length;
      const hechos = l.items.filter((it) => it.hecho).length;
      const completa = total > 0 && hechos === total;
      return `<button type="button" class="lista-card${completa ? " completa" : ""}" data-id="${l.id}">
        <span class="titulo">${escapeHtml(l.titulo || "Sin título")}</span>
        <span class="cuenta">${hechos}/${total}${completa ? " ✓" : ""}</span>
      </button>`;
    })
    .join("");
}

function renderDetalle() {
  const lista = listaAbierta();
  if (!lista) return;
  // No pisar el título mientras se está escribiendo.
  if (document.activeElement !== tituloInput) tituloInput.value = lista.titulo;

  const total = lista.items.length;
  const hechos = lista.items.filter((it) => it.hecho).length;
  progresoEl.innerHTML = `<i style="width:${total ? (hechos / total) * 100 : 0}%"></i>`;

  if (!total) {
    itemsEl.innerHTML = `<div class="listas-vacio">Lista vacía. Escribe arriba lo que vas a trabajar.</div>`;
    return;
  }
  itemsEl.innerHTML = lista.items
    .map(
      (it) => `<div class="lista-item${it.hecho ? " hecho" : ""}" data-id="${it.id}">
        <button type="button" class="marca" data-accion="marcar" title="${it.hecho ? "Desmarcar" : "Marcar como hecho"}">
          <span class="caja">${it.hecho ? "✓" : ""}</span>
          <span class="texto">${escapeHtml(it.texto)}</span>
        </button>
        <button type="button" class="neu-btn icon small quitar" data-accion="quitar" title="Quitar">✕</button>
      </div>`
    )
    .join("");
}

function mostrarIndice() {
  listaAbiertaId = null;
  vistaDetalle.classList.add("oculta");
  vistaIndice.classList.remove("oculta");
  renderIndice();
}

function abrirLista(id) {
  listaAbiertaId = id;
  estadoEl.textContent = "";
  vistaIndice.classList.add("oculta");
  vistaDetalle.classList.remove("oculta");
  renderDetalle();
  inputNuevoItem.focus();
}

// ============================================================
// ACCIONES
// ============================================================
indiceEl.addEventListener("click", (e) => {
  const card = e.target.closest(".lista-card");
  if (card) abrirLista(card.dataset.id);
});

formNuevaLista.addEventListener("submit", async (e) => {
  e.preventDefault();
  const titulo = inputNuevaLista.value.trim();
  if (!titulo) return;
  inputNuevaLista.value = "";
  try {
    const lista = await crearLista(titulo);
    renderIndice();
    abrirLista(lista.id);
  } catch (err) {
    estadoEl.textContent = "";
    alert("No se pudo crear la lista.\n\nDetalle: " + err.message);
  }
});

formNuevoItem.addEventListener("submit", (e) => {
  e.preventDefault();
  const lista = listaAbierta();
  const texto = inputNuevoItem.value.trim();
  if (!lista || !texto) return;
  lista.items.push({ id: nuevoItemId(), texto, hecho: false });
  inputNuevoItem.value = "";
  renderDetalle();
  programarGuardado(lista.id);
  // El foco se queda en el campo: así se apuntan varias cosas seguidas.
  inputNuevoItem.focus();
});

itemsEl.addEventListener("click", (e) => {
  const boton = e.target.closest("[data-accion]");
  if (!boton) return;
  const lista = listaAbierta();
  if (!lista) return;
  const id = boton.closest(".lista-item").dataset.id;
  const item = lista.items.find((it) => it.id === id);
  if (!item) return;

  if (boton.dataset.accion === "marcar") {
    item.hecho = !item.hecho;
  } else {
    lista.items = lista.items.filter((it) => it.id !== id);
  }
  renderDetalle();
  programarGuardado(lista.id);
});

tituloInput.addEventListener("input", () => {
  const lista = listaAbierta();
  if (!lista) return;
  lista.titulo = tituloInput.value;
  programarGuardado(lista.id);
});

document.getElementById("btnLimpiarTachados").addEventListener("click", () => {
  const lista = listaAbierta();
  if (!lista) return;
  const tachados = lista.items.filter((it) => it.hecho).length;
  if (!tachados) return;
  if (!confirm(`¿Quitar ${tachados} elemento${tachados === 1 ? "" : "s"} ya tachado${tachados === 1 ? "" : "s"} de esta lista?`)) return;
  lista.items = lista.items.filter((it) => !it.hecho);
  renderDetalle();
  programarGuardado(lista.id);
});

document.getElementById("btnBorrarLista").addEventListener("click", async () => {
  const lista = listaAbierta();
  if (!lista) return;
  if (!confirm(`¿Borrar la lista "${lista.titulo || "Sin título"}" con todo lo que tiene dentro?`)) return;
  // Lo pendiente ya no importa: la lista se va completa.
  if (guardarTimer) clearTimeout(guardarTimer);
  guardarTimer = null;
  pendienteId = null;
  try {
    await borrarLista(lista.id);
    mostrarIndice();
  } catch (err) {
    alert("No se pudo borrar la lista.\n\nDetalle: " + err.message);
  }
});

document.getElementById("btnVolverListas").addEventListener("click", async () => {
  await guardarPendiente();
  mostrarIndice();
});

// ============================================================
// ABRIR / CERRAR EL PANEL
// ============================================================
function abrirPanel() {
  overlay.classList.add("active");
  estadoEl.textContent = "";
  if (listaAbiertaId && listaAbierta()) renderDetalle();
  else mostrarIndice();
  if (!cargado) initListas();
}
async function cerrarPanel() {
  overlay.classList.remove("active");
  // Sin esto, cerrar justo después de tachar algo perdía el último cambio.
  await guardarPendiente();
}

document.getElementById("btnListas").addEventListener("click", abrirPanel);
document.getElementById("btnCerrarListas").addEventListener("click", cerrarPanel);
overlay.addEventListener("click", (e) => {
  if (e.target === overlay) cerrarPanel();
});

/** Carga las listas del usuario que acaba de entrar. */
export async function initListas() {
  // Al cambiar de cuenta no debe quedar nada de la anterior.
  state.listas = [];
  listaAbiertaId = null;
  cargado = false;
  try {
    await cargarListas();
    cargado = true;
  } catch (e) {
    indiceEl.innerHTML = `<div class="listas-vacio">No se pudieron cargar tus listas.<br>¿Corriste la migración <b>migracion-listas-personales.sql</b>?</div>`;
    return;
  }
  if (overlay.classList.contains("active")) mostrarIndice();
}
