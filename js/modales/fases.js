import { state } from "../state.js";
import { guardarFasesTablero } from "../api.js";
import { render } from "../render.js";
import { escapeHtml } from "../utils.js";

const overlay = document.getElementById("modalFasesOverlay");
const titulo = document.getElementById("modalFasesTitulo");
const lista = document.getElementById("fasesLista");

let cual = "camisas";
let fasesEdit = [];

function nuevoId() {
  return "fase-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function pedidosEnFase(id) {
  if (cual === "eco") return state.ecoSolvente.filter((e) => (e.estado || "Pedido") === id).length;
  return state.pedidos.filter((p) => p.estado === id).length;
}

export function abrirModalFases(c) {
  cual = c === "eco" ? "eco" : "camisas";
  const orig = cual === "eco" ? state.fasesEco : state.fasesCamisas;
  fasesEdit = orig.map((f) => ({ ...f }));
  titulo.textContent = cual === "eco" ? "Secciones · Eco Solvente" : "Secciones · Camisas";
  renderLista();
  overlay.classList.add("active");
}

function cerrar() {
  overlay.classList.remove("active");
}

function renderLista() {
  lista.innerHTML = fasesEdit
    .map(
      (f, i) => `<div class="fase-row" data-i="${i}">
        <input type="color" class="fase-color" value="${f.color}" title="Color">
        <input type="text" class="fase-nombre" value="${escapeHtml(f.nombre)}" placeholder="Nombre de la sección">
        <button type="button" class="neu-btn icon fase-up" title="Subir" ${i === 0 ? "disabled" : ""}>↑</button>
        <button type="button" class="neu-btn icon fase-down" title="Bajar" ${i === fasesEdit.length - 1 ? "disabled" : ""}>↓</button>
        <button type="button" class="neu-btn icon danger fase-del" title="Eliminar">🗑️</button>
      </div>`
    )
    .join("");

  lista.querySelectorAll(".fase-row").forEach((row) => {
    const i = Number(row.dataset.i);
    row.querySelector(".fase-color").addEventListener("input", (e) => (fasesEdit[i].color = e.target.value));
    row.querySelector(".fase-nombre").addEventListener("input", (e) => (fasesEdit[i].nombre = e.target.value));
    row.querySelector(".fase-up").addEventListener("click", () => mover(i, -1));
    row.querySelector(".fase-down").addEventListener("click", () => mover(i, 1));
    row.querySelector(".fase-del").addEventListener("click", () => borrar(i));
  });
}

function mover(i, dir) {
  const j = i + dir;
  if (j < 0 || j >= fasesEdit.length) return;
  const tmp = fasesEdit[i];
  fasesEdit[i] = fasesEdit[j];
  fasesEdit[j] = tmp;
  renderLista();
}

function borrar(i) {
  const f = fasesEdit[i];
  const n = pedidosEnFase(f.id);
  if (n > 0) {
    alert(`No puedes borrar "${f.nombre}" porque tiene ${n} pedido(s) dentro. Muévelos a otra sección primero.`);
    return;
  }
  if (fasesEdit.length <= 2) {
    alert("El tablero debe tener al menos 2 secciones.");
    return;
  }
  fasesEdit.splice(i, 1);
  renderLista();
}

document.getElementById("btnAgregarFase").addEventListener("click", () => {
  fasesEdit.push({ id: nuevoId(), nombre: "Nueva sección", color: "#a78bfa" });
  renderLista();
});

document.getElementById("btnGuardarFases").addEventListener("click", async () => {
  const limpias = fasesEdit.map((f) => ({
    id: f.id,
    nombre: (f.nombre || "").trim() || "Sección",
    color: f.color || "#a78bfa",
  }));
  if (limpias.length < 2) {
    alert("El tablero debe tener al menos 2 secciones.");
    return;
  }
  try {
    await guardarFasesTablero(cual, limpias);
    cerrar();
    render();
  } catch (e) {
    alert("No se pudieron guardar las secciones: " + e.message);
  }
});

document.getElementById("btnCerrarModalFases").addEventListener("click", cerrar);
document.getElementById("btnCancelarModalFases").addEventListener("click", cerrar);

document.getElementById("btnFasesCamisas").addEventListener("click", () => abrirModalFases("camisas"));
document.getElementById("btnFasesEco").addEventListener("click", () => abrirModalFases("eco"));
