import {
  state,
  historialPagosEco,
  m2Eco,
  baseEco,
  costoClearEco,
  costoTransferEco,
  totalExtrasEco,
  totalEco,
} from "../state.js";
import { money, fmt, toInputDate, fechaInputToISO, renderHistorialAbonos } from "../utils.js";
import { crearEco, actualizarEco } from "../api.js";
import { render } from "../render.js";

const modalEcoOverlay = document.getElementById("modalEcoOverlay");
const modalEcoTitulo = document.getElementById("modalEcoTitulo");
const formEco = document.getElementById("formEco");

const campoRemate = document.getElementById("ecoRemate");
const campoRemateCosto = document.getElementById("ecoRemateCosto");
const campoLlevaDiseno = document.getElementById("ecoLlevaDiseno");
const campoDisenoCosto = document.getElementById("ecoDisenoCosto");
const campoLlevaEstructura = document.getElementById("ecoLlevaEstructura");
const campoEstructuraCosto = document.getElementById("ecoEstructuraCosto");
const campoLlevaCuadroMadera = document.getElementById("ecoLlevaCuadroMadera");
const campoCuadroMaderaCosto = document.getElementById("ecoCuadroMaderaCosto");
const campoClearModo = document.getElementById("ecoClearModo");
const campoClearCosto = document.getElementById("ecoClearCosto");
const campoClearPrecioM2 = document.getElementById("ecoClearPrecioM2");
const campoTransferModo = document.getElementById("ecoTransferModo");
const campoTransferCosto = document.getElementById("ecoTransferCosto");
const campoTransferPrecioM2 = document.getElementById("ecoTransferPrecioM2");

function leerFormComoEco() {
  return {
    material: document.getElementById("ecoMaterial").value,
    ancho: Number(document.getElementById("ecoAncho").value) || 0,
    alto: Number(document.getElementById("ecoAlto").value) || 0,
    precioM2: Number(document.getElementById("ecoPrecioM2").value) || 0,
    remate: campoRemate.value,
    remateCosto: Number(campoRemateCosto.value) || 0,
    llevaDiseno: campoLlevaDiseno.checked,
    disenoCosto: Number(campoDisenoCosto.value) || 0,
    llevaEstructura: campoLlevaEstructura.checked,
    estructuraCosto: Number(campoEstructuraCosto.value) || 0,
    llevaCuadroMadera: campoLlevaCuadroMadera.checked,
    cuadroMaderaCosto: Number(campoCuadroMaderaCosto.value) || 0,
    clearModo: campoClearModo.value,
    clearCosto: Number(campoClearCosto.value) || 0,
    clearPrecioM2: Number(campoClearPrecioM2.value) || 0,
    transferModo: campoTransferModo.value,
    transferCosto: Number(campoTransferCosto.value) || 0,
    transferPrecioM2: Number(campoTransferPrecioM2.value) || 0,
  };
}

function actualizarUIExtras() {
  campoRemateCosto.disabled = campoRemate.value === "ninguno";
  campoDisenoCosto.disabled = !campoLlevaDiseno.checked;
  campoEstructuraCosto.disabled = !campoLlevaEstructura.checked;
  campoCuadroMaderaCosto.disabled = !campoLlevaCuadroMadera.checked;
  if (!campoLlevaCuadroMadera.checked) campoCuadroMaderaCosto.value = 0;
  campoClearCosto.disabled = campoClearModo.value !== "fijo";
  campoClearPrecioM2.disabled = campoClearModo.value !== "m2";
  campoTransferCosto.disabled = campoTransferModo.value !== "fijo";
  campoTransferPrecioM2.disabled = campoTransferModo.value !== "m2";
  if (campoRemate.value === "ninguno") campoRemateCosto.value = 0;
  if (!campoLlevaDiseno.checked) campoDisenoCosto.value = 0;
  if (!campoLlevaEstructura.checked) campoEstructuraCosto.value = 0;
  if (campoClearModo.value !== "fijo") campoClearCosto.value = 0;
  if (campoClearModo.value !== "m2") campoClearPrecioM2.value = 0;
  if (campoTransferModo.value !== "fijo") campoTransferCosto.value = 0;
  if (campoTransferModo.value !== "m2") campoTransferPrecioM2.value = 0;
  actualizarResumenEco();
}

function actualizarResumenEco() {
  const borrador = leerFormComoEco();
  document.getElementById("resumenM2Eco").textContent = fmt(m2Eco(borrador));
  document.getElementById("resumenBaseEco").textContent = money(baseEco(borrador));
  document.getElementById("resumenClearCosto").textContent = money(costoClearEco(borrador));
  document.getElementById("resumenTransferCosto").textContent = money(costoTransferEco(borrador));
  document.getElementById("resumenExtrasEco").textContent = money(totalExtrasEco(borrador));
  document.getElementById("resumenTotalEco").textContent = money(totalEco(borrador));
}

[campoRemate, campoClearModo, campoTransferModo].forEach((el) => el.addEventListener("change", actualizarUIExtras));
[campoLlevaDiseno, campoLlevaEstructura, campoLlevaCuadroMadera].forEach((el) => el.addEventListener("change", actualizarUIExtras));
formEco.addEventListener("input", actualizarResumenEco);

export function abrirModalNuevoEco() {
  formEco.reset();
  document.getElementById("ecoId").value = "";
  document.getElementById("ecoFecha").value = toInputDate();
  document.getElementById("ecoFechaEntrega").value = "";
  document.getElementById("ecoAvisoDias").value = "";
  document.getElementById("ecoMaterial").value = "banner";
  campoRemate.value = "ninguno";
  campoClearModo.value = "ninguno";
  campoTransferModo.value = "ninguno";
  document.getElementById("historialAbonosEco").innerHTML = "";
  modalEcoTitulo.textContent = "Nuevo pedido eco solvente";
  actualizarUIExtras();
  modalEcoOverlay.classList.add("active");
}

export function abrirModalEditarEco(id) {
  const eco = state.ecoSolvente.find((x) => x.id === id);
  if (!eco) return;
  formEco.reset();
  document.getElementById("ecoId").value = eco.id;
  document.getElementById("ecoCliente").value = eco.cliente;
  document.getElementById("ecoFecha").value = toInputDate(eco.fechaInicio || eco.fecha);
  document.getElementById("ecoFechaEntrega").value = eco.fechaEntrega ? toInputDate(eco.fechaEntrega) : "";
  document.getElementById("ecoAvisoDias").value = eco.avisoDias == null ? "" : eco.avisoDias;
  document.getElementById("ecoMaterial").value = eco.material || "banner";
  document.getElementById("ecoAbono").value = eco.abono || 0;
  document.getElementById("ecoAncho").value = eco.ancho;
  document.getElementById("ecoAlto").value = eco.alto;
  document.getElementById("ecoPrecioM2").value = eco.precioM2;
  document.getElementById("ecoDescripcion").value = eco.descripcion || "";
  campoRemate.value = eco.remate || "ninguno";
  campoRemateCosto.value = eco.remateCosto || 0;
  campoLlevaDiseno.checked = !!eco.llevaDiseno;
  campoDisenoCosto.value = eco.disenoCosto || 0;
  campoLlevaEstructura.checked = !!eco.llevaEstructura;
  campoEstructuraCosto.value = eco.estructuraCosto || 0;
  campoLlevaCuadroMadera.checked = !!eco.llevaCuadroMadera;
  campoCuadroMaderaCosto.value = eco.cuadroMaderaCosto || 0;
  campoClearModo.value = eco.clearModo || "ninguno";
  campoClearCosto.value = eco.clearCosto || 0;
  campoClearPrecioM2.value = eco.clearPrecioM2 || 0;
  campoTransferModo.value = eco.transferModo || "ninguno";
  campoTransferCosto.value = eco.transferCosto || 0;
  campoTransferPrecioM2.value = eco.transferPrecioM2 || 0;
  modalEcoTitulo.textContent = "Editar pedido eco solvente";
  actualizarUIExtras();
  renderHistorialAbonos("historialAbonosEco", historialPagosEco(eco));
  modalEcoOverlay.classList.add("active");
}

function cerrarModalEco() {
  modalEcoOverlay.classList.remove("active");
}

formEco.addEventListener("submit", async function (e) {
  e.preventDefault();

  const cliente = document.getElementById("ecoCliente").value.trim();
  if (!cliente) {
    alert("El nombre del cliente es obligatorio.");
    return;
  }
  const fechaInput = document.getElementById("ecoFecha").value;
  if (!fechaInput) {
    alert("La fecha del pedido es obligatoria.");
    return;
  }
  const ancho = Number(document.getElementById("ecoAncho").value);
  const alto = Number(document.getElementById("ecoAlto").value);
  const precioM2 = Number(document.getElementById("ecoPrecioM2").value);
  if (!ancho || ancho <= 0 || !alto || alto <= 0 || isNaN(precioM2) || precioM2 < 0) {
    alert("Revisa ancho y alto (mayores a 0) y el precio de impresión por m² (no puede ser negativo).");
    return;
  }

  const borrador = leerFormComoEco();
  const descripcion = document.getElementById("ecoDescripcion").value.trim();
  const fechaEntregaInput = document.getElementById("ecoFechaEntrega").value;
  const avisoRaw = document.getElementById("ecoAvisoDias").value;
  const totalPedido = totalEco(borrador);
  let abono = Number(document.getElementById("ecoAbono").value) || 0;

  const idExistente = document.getElementById("ecoId").value;
  const ecoExistente = idExistente ? state.ecoSolvente.find((x) => x.id === idExistente) : null;
  const otrosAbonos = ecoExistente ? ecoExistente.pagos.reduce((s, pg) => s + Number(pg.monto), 0) : 0;
  if (abono + otrosAbonos > totalPedido) {
    if (!confirm(`El total abonado (${money(abono + otrosAbonos)}) supera el total del pedido (${money(totalPedido)}). ¿Deseas continuar de todas formas?`)) {
      return;
    }
  }

  const datos = {
    cliente,
    fecha: fechaInputToISO(fechaInput),
    fechaInicio: fechaInputToISO(fechaInput),
    fechaEntrega: fechaEntregaInput ? fechaInputToISO(fechaEntregaInput) : null,
    avisoDias: avisoRaw === "" ? null : Number(avisoRaw),
    descripcion,
    abono,
    ...borrador,
  };

  if (ecoExistente) {
    await actualizarEco(ecoExistente.id, datos);
  } else {
    await crearEco(datos);
  }

  cerrarModalEco();
  render();
});

document.getElementById("btnNuevoEco").addEventListener("click", abrirModalNuevoEco);
document.getElementById("btnCerrarModalEco").addEventListener("click", cerrarModalEco);
document.getElementById("btnCancelarModalEco").addEventListener("click", cerrarModalEco);
modalEcoOverlay.addEventListener("click", (e) => {
  if (e.target === modalEcoOverlay) cerrarModalEco();
});
