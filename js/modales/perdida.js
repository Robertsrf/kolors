import { state } from "../state.js";
import { money, fmt, toInputDate, fechaInputToISO } from "../utils.js";
import { crearPerdida, actualizarPerdida } from "../api.js";
import { render } from "../render.js";

const modalPerdidaOverlay = document.getElementById("modalPerdidaOverlay");
const modalPerdidaTitulo = document.getElementById("modalPerdidaTitulo");
const formPerdida = document.getElementById("formPerdida");

function actualizarResumenPerdida() {
  const ancho = Number(document.getElementById("perdidaAncho").value) || 0;
  const alto = Number(document.getElementById("perdidaAlto").value) || 0;
  const precioM2 = Number(document.getElementById("perdidaPrecioM2").value) || 0;
  const m2 = ancho * alto;
  document.getElementById("resumenM2Perdida").textContent = fmt(m2);
  document.getElementById("resumenTotalPerdida").textContent = money(m2 * precioM2);
}
formPerdida.addEventListener("input", actualizarResumenPerdida);

export function abrirModalNuevaPerdida() {
  formPerdida.reset();
  document.getElementById("perdidaId").value = "";
  document.getElementById("perdidaFecha").value = toInputDate();
  document.getElementById("perdidaTipo").value = "perdida";
  modalPerdidaTitulo.textContent = "Nueva pérdida / prueba";
  actualizarResumenPerdida();
  modalPerdidaOverlay.classList.add("active");
}

export function abrirModalEditarPerdida(id) {
  const p = state.perdidas.find((x) => x.id === id);
  if (!p) return;
  formPerdida.reset();
  document.getElementById("perdidaId").value = p.id;
  document.getElementById("perdidaFecha").value = toInputDate(p.fecha);
  document.getElementById("perdidaTipo").value = p.tipo || "perdida";
  document.getElementById("perdidaAncho").value = p.ancho;
  document.getElementById("perdidaAlto").value = p.alto;
  document.getElementById("perdidaPrecioM2").value = p.precioM2;
  document.getElementById("perdidaDescripcion").value = p.descripcion || "";
  modalPerdidaTitulo.textContent = "Editar pérdida / prueba";
  actualizarResumenPerdida();
  modalPerdidaOverlay.classList.add("active");
}

function cerrarModalPerdida() {
  modalPerdidaOverlay.classList.remove("active");
}

formPerdida.addEventListener("submit", async function (e) {
  e.preventDefault();

  const fechaInput = document.getElementById("perdidaFecha").value;
  if (!fechaInput) {
    alert("La fecha es obligatoria.");
    return;
  }
  const tipo = document.getElementById("perdidaTipo").value;
  const ancho = Number(document.getElementById("perdidaAncho").value);
  const alto = Number(document.getElementById("perdidaAlto").value);
  const precioM2 = Number(document.getElementById("perdidaPrecioM2").value);
  if (!ancho || ancho <= 0 || !alto || alto <= 0 || isNaN(precioM2) || precioM2 < 0) {
    alert("Revisa ancho y alto (mayores a 0) y el precio por m² (no puede ser negativo).");
    return;
  }
  const descripcion = document.getElementById("perdidaDescripcion").value.trim();
  const fechaISO = fechaInputToISO(fechaInput);

  const idExistente = document.getElementById("perdidaId").value;
  const perdExistente = idExistente ? state.perdidas.find((x) => x.id === idExistente) : null;
  const datos = { fecha: fechaISO, tipo, ancho, alto, precioM2, descripcion };

  if (perdExistente) {
    await actualizarPerdida(perdExistente.id, datos);
  } else {
    await crearPerdida(datos);
  }

  cerrarModalPerdida();
  render();
});

document.getElementById("btnNuevaPerdida").addEventListener("click", abrirModalNuevaPerdida);
document.getElementById("btnCerrarModalPerdida").addEventListener("click", cerrarModalPerdida);
document.getElementById("btnCancelarModalPerdida").addEventListener("click", cerrarModalPerdida);
modalPerdidaOverlay.addEventListener("click", (e) => {
  if (e.target === modalPerdidaOverlay) cerrarModalPerdida();
});
