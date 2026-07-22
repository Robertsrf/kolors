import { state, GENEROS, tallasPorGenero, historialPagosPedido } from "../state.js";
import { money, escapeHtml, toInputDate, fechaInputToISO, renderHistorialAbonos } from "../utils.js";
import { crearPedido, actualizarPedido } from "../api.js";
import { render } from "../render.js";

const modalOverlay = document.getElementById("modalOverlay");
const modalTitulo = document.getElementById("modalTitulo");
const formPedido = document.getElementById("formPedido");
const itemsContainer = document.getElementById("itemsContainer");

let itemCounter = 0;

function actualizarResumen() {
  let cant = 0,
    total = 0;
  itemsContainer.querySelectorAll(".item-line").forEach((row) => {
    const c = Number(row.querySelector(".in-cant").value) || 0;
    const pr = Number(row.querySelector(".in-precio").value) || 0;
    cant += c;
    total += c * pr;
  });
  document.getElementById("resumenCantidad").textContent = cant;
  document.getElementById("resumenTotal").textContent = money(total);
}

function agregarLineaItem(item) {
  itemCounter++;
  const uid = "line_" + itemCounter;
  const genero = item ? item.genero : GENEROS[0];
  const talla = item ? item.talla : "";
  const descripcion = item ? item.descripcion : "";
  const cantidad = item ? item.cantidad : 1;
  const precio = item ? item.precioUnitario : 0;

  const row = document.createElement("div");
  row.className = "item-line";
  row.dataset.uid = uid;
  row.dataset.itemId = item && item.id ? item.id : "ITEM-" + Date.now() + "-" + itemCounter;

  row.innerHTML = `
    <div>
      <label>Género</label>
      <select class="in-genero">
        ${GENEROS.map((g) => `<option value="${g}" ${g === genero ? "selected" : ""}>${g}</option>`).join("")}
      </select>
    </div>
    <div>
      <label>Talla</label>
      <select class="in-talla"></select>
    </div>
    <div>
      <label>Descripción</label>
      <input type="text" class="in-desc" value="${escapeHtml(descripcion)}" placeholder="Diseño, tela...">
    </div>
    <div>
      <label>Cantidad</label>
      <input type="number" class="in-cant" min="1" step="1" value="${cantidad}">
    </div>
    <div>
      <label>Precio unit.</label>
      <input type="number" class="in-precio" min="0" step="0.01" value="${precio}">
    </div>
    <div>
      <button type="button" class="neu-btn icon danger in-quitar" title="Quitar línea">🗑️</button>
    </div>
  `;
  itemsContainer.appendChild(row);

  const selGenero = row.querySelector(".in-genero");
  const selTalla = row.querySelector(".in-talla");

  function poblarTallas(preseleccion) {
    const tallas = tallasPorGenero(selGenero.value);
    selTalla.innerHTML = tallas.map((t) => `<option value="${t}" ${t === preseleccion ? "selected" : ""}>${t}</option>`).join("");
  }
  poblarTallas(talla);

  selGenero.addEventListener("change", () => poblarTallas());
  row.querySelector(".in-cant").addEventListener("input", actualizarResumen);
  row.querySelector(".in-precio").addEventListener("input", actualizarResumen);
  row.querySelector(".in-quitar").addEventListener("click", () => {
    if (itemsContainer.children.length <= 1) {
      alert("El pedido debe tener al menos una línea.");
      return;
    }
    row.remove();
    actualizarResumen();
  });
}

export function abrirModalNuevoPedido() {
  formPedido.reset();
  document.getElementById("pedidoId").value = "";
  modalTitulo.textContent = "Nuevo pedido";
  itemsContainer.innerHTML = "";
  document.getElementById("historialAbonosPedido").innerHTML = "";
  agregarLineaItem();
  actualizarResumen();
  modalOverlay.classList.add("active");
}

export function abrirModalEditarPedido(id) {
  const p = state.pedidos.find((x) => x.id === id);
  if (!p) return;
  formPedido.reset();
  document.getElementById("pedidoId").value = p.id;
  document.getElementById("clienteNombre").value = p.cliente.nombre;
  document.getElementById("clienteTelefono").value = p.cliente.telefono || "";
  document.getElementById("clienteNotas").value = p.cliente.notas || "";
  document.getElementById("pedidoDescripcion").value = p.descripcion || "";
  document.getElementById("pedidoFechaInicio").value = toInputDate(p.fechaInicio || p.fechas.pedido);
  document.getElementById("pedidoFechaEntrega").value = p.fechaEntrega ? toInputDate(p.fechaEntrega) : "";
  document.getElementById("pedidoAvisoDias").value = p.avisoDias == null ? "" : p.avisoDias;
  document.getElementById("clienteAbono").value = p.abono;
  modalTitulo.textContent = "Editar pedido";

  itemsContainer.innerHTML = "";
  p.items.forEach((it) => agregarLineaItem(it));
  actualizarResumen();
  renderHistorialAbonos("historialAbonosPedido", historialPagosPedido(p));
  modalOverlay.classList.add("active");
}

function cerrarModal() {
  modalOverlay.classList.remove("active");
}

itemsContainer.addEventListener("input", actualizarResumen);

formPedido.addEventListener("submit", async function (e) {
  e.preventDefault();

  const nombre = document.getElementById("clienteNombre").value.trim();
  if (!nombre) {
    alert("El nombre del cliente es obligatorio.");
    return;
  }

  const items = [];
  let invalido = false;
  itemsContainer.querySelectorAll(".item-line").forEach((row) => {
    const cantidad = Number(row.querySelector(".in-cant").value);
    const precioUnitario = Number(row.querySelector(".in-precio").value);
    if (!cantidad || cantidad < 1 || precioUnitario < 0 || isNaN(precioUnitario)) {
      invalido = true;
    }
    items.push({
      id: row.dataset.itemId,
      genero: row.querySelector(".in-genero").value,
      talla: row.querySelector(".in-talla").value,
      descripcion: row.querySelector(".in-desc").value.trim(),
      cantidad,
      precioUnitario,
    });
  });

  if (items.length === 0) {
    alert("Agrega al menos una línea de camisa.");
    return;
  }
  if (invalido) {
    alert("Revisa las líneas: la cantidad debe ser mayor a 0 y el precio no puede ser negativo.");
    return;
  }

  const totalLineas = items.reduce((s, it) => s + it.cantidad * it.precioUnitario, 0);
  let abono = Number(document.getElementById("clienteAbono").value) || 0;
  const idExistente = document.getElementById("pedidoId").value;
  const pedidoExistente = idExistente ? state.pedidos.find((x) => x.id === idExistente) : null;
  const otrosAbonos = pedidoExistente ? pedidoExistente.pagos.reduce((s, pg) => s + Number(pg.monto), 0) : 0;
  if (abono + otrosAbonos > totalLineas) {
    if (!confirm(`El total abonado (${money(abono + otrosAbonos)}) supera el total del pedido (${money(totalLineas)}). ¿Deseas continuar de todas formas?`)) {
      return;
    }
  }

  const descripcion = document.getElementById("pedidoDescripcion").value.trim();
  const cliente = {
    nombre,
    telefono: document.getElementById("clienteTelefono").value.trim(),
    notas: document.getElementById("clienteNotas").value.trim(),
  };
  const fechaInicioInput = document.getElementById("pedidoFechaInicio").value;
  const fechaEntregaInput = document.getElementById("pedidoFechaEntrega").value;
  const avisoRaw = document.getElementById("pedidoAvisoDias").value;
  const extra = {
    fechaInicio: fechaInicioInput ? fechaInputToISO(fechaInicioInput) : null,
    fechaEntrega: fechaEntregaInput ? fechaInputToISO(fechaEntregaInput) : null,
    avisoDias: avisoRaw === "" ? null : Number(avisoRaw),
  };

  if (pedidoExistente) {
    await actualizarPedido(pedidoExistente.id, { cliente, descripcion, abono, items, ...extra });
  } else {
    await crearPedido({ cliente, descripcion, abono, items, ...extra });
  }

  cerrarModal();
  render();
});

document.getElementById("btnNuevoPedido").addEventListener("click", abrirModalNuevoPedido);
document.getElementById("btnCerrarModal").addEventListener("click", cerrarModal);
document.getElementById("btnCancelarModal").addEventListener("click", cerrarModal);
document.getElementById("btnAgregarLinea").addEventListener("click", () => {
  agregarLineaItem();
  actualizarResumen();
});
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) cerrarModal();
});
