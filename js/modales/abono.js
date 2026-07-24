import { state, saldoPendiente, saldoImpresion, saldoEco } from "../state.js";
import { money, toInputDate, fechaLegible, fechaInputToISO } from "../utils.js";
import { agregarPago } from "../api.js";
import { render } from "../render.js";

const modalAbonoOverlay = document.getElementById("modalAbonoOverlay");
const formAbono = document.getElementById("formAbono");

export function abrirModalAbono(tipo, id) {
  const contexto = document.getElementById("abonoContexto");
  if (tipo === "pedido") {
    const p = state.pedidos.find((x) => x.id === id);
    if (!p) return;
    contexto.textContent = `${p.cliente.nombre} · Pedido de camisas · Saldo pendiente: ${money(saldoPendiente(p))}`;
  } else if (tipo === "impresion") {
    const imp = state.impresiones.find((x) => x.id === id);
    if (!imp) return;
    contexto.textContent = `${imp.cliente} · Sublimación del ${fechaLegible(imp.fecha)} · Saldo pendiente: ${money(saldoImpresion(imp))}`;
  } else {
    const eco = state.ecoSolvente.find((x) => x.id === id);
    if (!eco) return;
    contexto.textContent = `${eco.cliente} · Eco solvente del ${fechaLegible(eco.fecha)} · Saldo pendiente: ${money(saldoEco(eco))}`;
  }
  document.getElementById("abonoTipo").value = tipo;
  document.getElementById("abonoTargetId").value = id;
  document.getElementById("abonoFecha").value = toInputDate();
  document.getElementById("abonoMonto").value = "";
  modalAbonoOverlay.classList.add("active");
}

function cerrarModalAbono() {
  modalAbonoOverlay.classList.remove("active");
}

formAbono.addEventListener("submit", async function (e) {
  e.preventDefault();
  const tipo = document.getElementById("abonoTipo").value;
  const id = document.getElementById("abonoTargetId").value;
  const fechaInput = document.getElementById("abonoFecha").value;
  const monto = Number(document.getElementById("abonoMonto").value);

  if (!fechaInput || !monto || monto <= 0) {
    alert("Ingresa una fecha y un monto válido mayor a 0.");
    return;
  }

  await agregarPago(tipo, id, fechaInputToISO(fechaInput), monto);
  cerrarModalAbono();
  render();
});

document.getElementById("btnCerrarModalAbono").addEventListener("click", cerrarModalAbono);
document.getElementById("btnCancelarModalAbono").addEventListener("click", cerrarModalAbono);
// Solo se cierra con la X o Cancelar (no al hacer clic afuera).
