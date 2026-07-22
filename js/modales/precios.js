import { state } from "../state.js";
import { escapeHtml } from "../utils.js";
import { guardarPrecios } from "../api.js";

const modalPreciosOverlay = document.getElementById("modalPreciosOverlay");

function crearFilaPrecioEl(fila) {
  const row = document.createElement("div");
  row.className = "precios-fila";
  row.innerHTML = `
    <input type="text" class="precios-etiqueta-input" value="${escapeHtml(fila.etiqueta || "")}" placeholder="Ej. 1 camisa">
    <input type="number" min="0" step="0.01" class="precio-publico-input" value="${fila.publico || ""}" placeholder="0.00">
    <input type="number" min="0" step="0.01" class="precio-disenador-input" value="${fila.disenador || ""}" placeholder="0.00">
    <button type="button" class="neu-btn icon danger btn-quitar-fila" title="Quitar precio">🗑️</button>
  `;
  row.querySelector(".btn-quitar-fila").addEventListener("click", () => row.remove());
  return row;
}

function crearSeccionPrecioEl(seccion) {
  const bloque = document.createElement("div");
  bloque.className = "precios-seccion neu-inset";
  bloque.innerHTML = `
    <div class="precios-seccion-header">
      <input type="text" class="precios-seccion-titulo" value="${escapeHtml(seccion.titulo || "")}" placeholder="Nombre de la sección (ej. Impresiones, Extras...)">
      <button type="button" class="neu-btn icon danger btn-quitar-seccion" title="Eliminar sección">🗑️</button>
    </div>
    <div class="precios-fila precios-header">
      <span>Etiqueta</span><span>Público ($)</span><span>Diseñador ($)</span><span></span>
    </div>
    <div class="precios-filas-lista"></div>
    <button type="button" class="neu-btn small btn-agregar-fila">+ Agregar precio</button>
  `;
  const lista = bloque.querySelector(".precios-filas-lista");
  (seccion.filas || []).forEach((fila) => lista.appendChild(crearFilaPrecioEl(fila)));
  bloque.querySelector(".btn-agregar-fila").addEventListener("click", () => {
    lista.appendChild(crearFilaPrecioEl({ etiqueta: "", publico: 0, disenador: 0 }));
  });
  bloque.querySelector(".btn-quitar-seccion").addEventListener("click", () => {
    if (document.querySelectorAll("#preciosSecciones .precios-seccion").length <= 1) {
      alert("Debe quedar al menos una sección de precios.");
      return;
    }
    if (confirm("¿Eliminar esta sección de precios y todos sus valores?")) bloque.remove();
  });
  return bloque;
}

function abrirModalPrecios() {
  const cont = document.getElementById("preciosSecciones");
  cont.innerHTML = "";
  state.precios.secciones.forEach((sec) => cont.appendChild(crearSeccionPrecioEl(sec)));
  modalPreciosOverlay.classList.add("active");
}

function cerrarModalPrecios() {
  modalPreciosOverlay.classList.remove("active");
}

document.getElementById("btnAgregarSeccion").addEventListener("click", () => {
  document.getElementById("preciosSecciones").appendChild(
    crearSeccionPrecioEl({ titulo: "", filas: [{ etiqueta: "", publico: 0, disenador: 0 }] })
  );
});

document.getElementById("formPrecios").addEventListener("submit", async function (e) {
  e.preventDefault();
  const secciones = [];
  document.querySelectorAll("#preciosSecciones .precios-seccion").forEach((bloque) => {
    const titulo = bloque.querySelector(".precios-seccion-titulo").value.trim();
    const filas = [];
    bloque.querySelectorAll(".precios-filas-lista .precios-fila").forEach((row) => {
      const etiqueta = row.querySelector(".precios-etiqueta-input").value.trim();
      const publico = Number(row.querySelector(".precio-publico-input").value) || 0;
      const disenador = Number(row.querySelector(".precio-disenador-input").value) || 0;
      if (etiqueta || publico || disenador) filas.push({ etiqueta, publico, disenador });
    });
    secciones.push({ titulo: titulo || "Sin título", filas });
  });
  const precios = { secciones: secciones.length ? secciones : [{ titulo: "Precios", filas: [] }] };
  await guardarPrecios(precios);
  cerrarModalPrecios();
});

document.getElementById("btnPrecios").addEventListener("click", abrirModalPrecios);
document.getElementById("btnCerrarModalPrecios").addEventListener("click", cerrarModalPrecios);
document.getElementById("btnCancelarModalPrecios").addEventListener("click", cerrarModalPrecios);
modalPreciosOverlay.addEventListener("click", (e) => {
  if (e.target === modalPreciosOverlay) cerrarModalPrecios();
});
