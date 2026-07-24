export const MONEDA = "$";

const fmtMoneda = new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function fmt(n) {
  return fmtMoneda.format(n || 0);
}

export function money(n) {
  return MONEDA + fmtMoneda.format(n || 0);
}

export function redondear2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function sumPagos(pagos) {
  return redondear2((pagos || []).reduce((s, x) => s + Number(x.monto || 0), 0));
}

export function fechaLegible(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("es-VE", { day: "numeric", month: "short", year: "numeric" });
}

export function haceDias(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const dias = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (dias <= 0) return "hoy";
  if (dias === 1) return "hace 1 día";
  return `hace ${dias} días`;
}

export function toInputDate(iso) {
  const d = iso ? new Date(iso) : new Date();
  return d.toISOString().slice(0, 10);
}

export function fechaInputToISO(fechaInput) {
  return new Date(fechaInput + "T00:00:00").toISOString();
}

export function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

export function statCard(label, value) {
  const div = document.createElement("div");
  div.className = "stat-card neu-raised";
  div.innerHTML = `<span class="label">${label}</span><span class="value">${value}</span>`;
  return div;
}

export function statCardHtml(label, value) {
  return `<div class="stat-card neu-raised"><span class="label">${label}</span><span class="value">${value}</span></div>`;
}

export function pagosListaHtml(historial) {
  if (!historial.length) return `<div class="sin-pagos">Sin abonos registrados.</div>`;
  return `<div class="pagos-lista">${historial
    .map((h) => `<div class="pago-fila"><span>${fechaLegible(h.fecha)}</span><b>${money(h.monto)}</b></div>`)
    .join("")}</div>`;
}

export function renderHistorialAbonos(containerId, historial, onEliminar) {
  const el = document.getElementById(containerId);
  if (!historial.length) {
    el.innerHTML = "";
    return;
  }
  el.innerHTML = `
    <div class="historial-abonos-box neu-inset">
      <h4>Historial de abonos</h4>
      <div class="pagos-lista">
        ${historial
          .map(
            (h, i) => `<div class="pago-fila">
          <span>${fechaLegible(h.fecha)}${h.nota === "Abono inicial" ? " · inicial" : ""}</span>
          <span class="pago-fila-monto"><b>${money(h.monto)}</b>${onEliminar ? `<button type="button" class="neu-btn icon danger abono-del" data-i="${i}" title="Eliminar abono">🗑️</button>` : ""}</span>
        </div>`
          )
          .join("")}
      </div>
    </div>
  `;
  if (onEliminar) {
    el.querySelectorAll(".abono-del").forEach((btn) => btn.addEventListener("click", () => onEliminar(historial[Number(btn.dataset.i)])));
  }
}
