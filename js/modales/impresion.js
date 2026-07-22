import { state, impresionCobraDinero, historialPagosImpresion } from "../state.js";
import { money, fmt, toInputDate, fechaInputToISO, renderHistorialAbonos } from "../utils.js";
import { crearImpresion, actualizarImpresion } from "../api.js";
import { render } from "../render.js";

const modalImpresionOverlay = document.getElementById("modalImpresionOverlay");
const modalImpresionTitulo = document.getElementById("modalImpresionTitulo");
const formImpresion = document.getElementById("formImpresion");

function actualizarTipoImpresionUI() {
  const tipo = document.getElementById("impresionTipo").value;
  const cobra = impresionCobraDinero(tipo);
  const precioInput = document.getElementById("impresionPrecioM2");
  const abonoInput = document.getElementById("impresionAbono");
  precioInput.disabled = !cobra;
  abonoInput.disabled = !cobra;
  document.getElementById("notaImpresionSinCobro").style.display = cobra ? "none" : "";
  if (!cobra) {
    precioInput.value = 0;
    abonoInput.value = 0;
  }
  actualizarResumenImpresion();
}
document.getElementById("impresionTipo").addEventListener("change", actualizarTipoImpresionUI);

function actualizarResumenImpresion() {
  const ancho = Number(document.getElementById("impresionAncho").value) || 0;
  const alto = Number(document.getElementById("impresionAlto").value) || 0;
  const tipo = document.getElementById("impresionTipo").value;
  const cobra = impresionCobraDinero(tipo);
  const precioM2 = cobra ? Number(document.getElementById("impresionPrecioM2").value) || 0 : 0;
  const m2 = ancho * alto;
  document.getElementById("resumenM2").textContent = fmt(m2);
  document.getElementById("resumenTotalImpresion").textContent = cobra ? money(m2 * precioM2) : "No se cobra aparte";
}
formImpresion.addEventListener("input", actualizarResumenImpresion);

export function abrirModalNuevaImpresion() {
  formImpresion.reset();
  document.getElementById("impresionId").value = "";
  document.getElementById("impresionFecha").value = toInputDate();
  document.getElementById("impresionFechaEntrega").value = "";
  document.getElementById("impresionAvisoDias").value = "";
  document.getElementById("impresionTipo").value = "otros";
  document.getElementById("impresionAbono").value = 0;
  document.getElementById("historialAbonosImpresion").innerHTML = "";
  modalImpresionTitulo.textContent = "Nueva impresión";
  actualizarTipoImpresionUI();
  modalImpresionOverlay.classList.add("active");
}

export function abrirModalEditarImpresion(id) {
  const imp = state.impresiones.find((x) => x.id === id);
  if (!imp) return;
  formImpresion.reset();
  document.getElementById("impresionId").value = imp.id;
  document.getElementById("impresionCliente").value = imp.cliente;
  document.getElementById("impresionFecha").value = toInputDate(imp.fechaInicio || imp.fecha);
  document.getElementById("impresionFechaEntrega").value = imp.fechaEntrega ? toInputDate(imp.fechaEntrega) : "";
  document.getElementById("impresionAvisoDias").value = imp.avisoDias == null ? "" : imp.avisoDias;
  document.getElementById("impresionTipo").value = imp.tipo || "otros";
  document.getElementById("impresionAbono").value = imp.abono || 0;
  document.getElementById("impresionAncho").value = imp.ancho;
  document.getElementById("impresionAlto").value = imp.alto;
  document.getElementById("impresionPrecioM2").value = imp.precioM2;
  document.getElementById("impresionDescripcion").value = imp.descripcion || "";
  modalImpresionTitulo.textContent = "Editar impresión";
  actualizarTipoImpresionUI();
  renderHistorialAbonos("historialAbonosImpresion", historialPagosImpresion(imp));
  modalImpresionOverlay.classList.add("active");
}

function cerrarModalImpresion() {
  modalImpresionOverlay.classList.remove("active");
}

formImpresion.addEventListener("submit", async function (e) {
  e.preventDefault();

  const cliente = document.getElementById("impresionCliente").value.trim();
  if (!cliente) {
    alert("El nombre del cliente es obligatorio.");
    return;
  }
  const fechaInput = document.getElementById("impresionFecha").value;
  if (!fechaInput) {
    alert("La fecha de la impresión es obligatoria.");
    return;
  }
  const tipo = document.getElementById("impresionTipo").value;
  const cobra = impresionCobraDinero(tipo);
  const ancho = Number(document.getElementById("impresionAncho").value);
  const alto = Number(document.getElementById("impresionAlto").value);
  const precioM2 = cobra ? Number(document.getElementById("impresionPrecioM2").value) : 0;
  if (!ancho || ancho <= 0 || !alto || alto <= 0 || isNaN(precioM2) || precioM2 < 0) {
    alert("Revisa ancho y alto (mayores a 0) y el precio por m² (no puede ser negativo).");
    return;
  }
  const descripcion = document.getElementById("impresionDescripcion").value.trim();
  const totalImp = ancho * alto * precioM2;
  let abono = cobra ? Number(document.getElementById("impresionAbono").value) || 0 : 0;

  const idExistente = document.getElementById("impresionId").value;
  const impExistente = idExistente ? state.impresiones.find((x) => x.id === idExistente) : null;
  const otrosAbonos = impExistente ? impExistente.pagos.reduce((s, pg) => s + Number(pg.monto), 0) : 0;
  if (abono + otrosAbonos > totalImp) {
    if (!confirm(`El total abonado (${money(abono + otrosAbonos)}) supera el total de la impresión (${money(totalImp)}). ¿Deseas continuar de todas formas?`)) {
      return;
    }
  }

  const fechaISO = fechaInputToISO(fechaInput);
  const fechaEntregaInput = document.getElementById("impresionFechaEntrega").value;
  const avisoRaw = document.getElementById("impresionAvisoDias").value;
  const datos = {
    cliente,
    fecha: fechaISO,
    fechaInicio: fechaISO,
    fechaEntrega: fechaEntregaInput ? fechaInputToISO(fechaEntregaInput) : null,
    avisoDias: avisoRaw === "" ? null : Number(avisoRaw),
    tipo,
    ancho,
    alto,
    precioM2,
    descripcion,
    abono,
  };

  if (impExistente) {
    await actualizarImpresion(impExistente.id, datos);
  } else {
    await crearImpresion(datos);
  }

  cerrarModalImpresion();
  render();
});

document.getElementById("btnNuevaImpresion").addEventListener("click", abrirModalNuevaImpresion);
document.getElementById("btnCerrarModalImpresion").addEventListener("click", cerrarModalImpresion);
document.getElementById("btnCancelarModalImpresion").addEventListener("click", cerrarModalImpresion);
modalImpresionOverlay.addEventListener("click", (e) => {
  if (e.target === modalImpresionOverlay) cerrarModalImpresion();
});
