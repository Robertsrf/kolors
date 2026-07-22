import { notificacionesEntrega } from "../state.js";
import { escapeHtml, fechaLegible } from "../utils.js";

const btn = document.getElementById("btnNotificaciones");
const badge = document.getElementById("notifBadge");
const dropdown = document.getElementById("notifDropdown");

function textoDias(dias) {
  if (dias < 0) return { txt: `Vencido hace ${Math.abs(dias)} día${Math.abs(dias) === 1 ? "" : "s"}`, clase: "vencido" };
  if (dias === 0) return { txt: "¡Hoy!", clase: "hoy" };
  if (dias === 1) return { txt: "Mañana", clase: "hoy" };
  return { txt: `En ${dias} días`, clase: "pronto" };
}

function irASeccion(tipo) {
  const tab = tipo === "camisa" ? "tablero" : tipo === "sublimacion" ? "impresiones" : "ecosolvente";
  const btnTab = document.querySelector(`.tab-btn[data-tab="${tab}"]`);
  if (btnTab) btnTab.click();
  dropdown.classList.remove("visible");
}

export function refrescarNotificaciones() {
  const items = notificacionesEntrega();
  if (items.length === 0) {
    badge.style.display = "none";
  } else {
    badge.style.display = "";
    badge.textContent = items.length;
  }

  if (items.length === 0) {
    dropdown.innerHTML = `<div class="notif-titulo">🔔 Entregas próximas</div><div class="notif-vacio">No hay entregas próximas ni vencidas. 🎉</div>`;
    return;
  }
  dropdown.innerHTML =
    `<div class="notif-titulo">🔔 Entregas próximas (${items.length})</div>` +
    items
      .map((it, idx) => {
        const d = textoDias(it.dias);
        return `<div class="notif-item" data-idx="${idx}">
          <span class="ic">${it.icono}</span>
          <div class="info">
            <div class="cli">${escapeHtml(it.cliente)}</div>
            <div class="sub">${it.seccion} · entrega ${fechaLegible(it.fechaEntrega)}${it.saldo > 0 ? " · debe" : ""}</div>
          </div>
          <span class="dias ${d.clase}">${d.txt}</span>
        </div>`;
      })
      .join("");

  dropdown.querySelectorAll(".notif-item").forEach((el) => {
    const it = items[Number(el.dataset.idx)];
    el.addEventListener("click", () => irASeccion(it.tipo));
  });
}

btn.addEventListener("click", (e) => {
  e.stopPropagation();
  dropdown.classList.toggle("visible");
});
document.addEventListener("click", (e) => {
  if (!dropdown.contains(e.target) && e.target !== btn) dropdown.classList.remove("visible");
});
