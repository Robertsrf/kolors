import { agendaItems, diasHastaEntrega } from "../state.js";
import { escapeHtml, money } from "../utils.js";

const overlay = document.getElementById("modalCalendarioOverlay");
const grid = document.getElementById("calGrid");
const mesAnioLabel = document.getElementById("calMesAnio");
const detalle = document.getElementById("calDiaDetalle");

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const DOW = ["L", "M", "M", "J", "V", "S", "D"];

let cursor = new Date();

function claveDia(d) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function agendaPorDia() {
  const mapa = new Map();
  agendaItems().forEach((it) => {
    const f = new Date(it.fechaEntrega);
    const k = `${f.getFullYear()}-${f.getMonth()}-${f.getDate()}`;
    if (!mapa.has(k)) mapa.set(k, []);
    mapa.get(k).push(it);
  });
  return mapa;
}

function irASeccion(tipo) {
  const tab = tipo === "camisa" ? "tablero" : tipo === "sublimacion" ? "impresiones" : "ecosolvente";
  const btnTab = document.querySelector(`.tab-btn[data-tab="${tab}"]`);
  if (btnTab) btnTab.click();
  cerrar();
}

function mostrarDetalleDia(items, fecha) {
  detalle.innerHTML =
    `<h4>${fecha.getDate()} de ${MESES[fecha.getMonth()].toLowerCase()} · ${items.length} entrega(s)</h4>` +
    items
      .map(
        (it, idx) => `<div class="notif-item" data-idx="${idx}">
          <span class="ic">${it.icono}</span>
          <div class="info">
            <div class="cli">${escapeHtml(it.cliente)}</div>
            <div class="sub">${it.seccion}${it.saldo > 0 ? " · debe " + money(it.saldo) : " · al día"}</div>
          </div>
        </div>`
      )
      .join("");
  detalle.querySelectorAll(".notif-item").forEach((el) => {
    const it = items[Number(el.dataset.idx)];
    el.addEventListener("click", () => irASeccion(it.tipo));
  });
}

export function renderCalendario() {
  const anio = cursor.getFullYear();
  const mes = cursor.getMonth();
  mesAnioLabel.textContent = `${MESES[mes]} ${anio}`;
  detalle.innerHTML = "";

  const porDia = agendaPorDia();
  const hoy = new Date();
  const claveHoy = claveDia(hoy);

  const primero = new Date(anio, mes, 1);
  // getDay(): 0=domingo. Convertir a inicio en lunes.
  let offset = primero.getDay() - 1;
  if (offset < 0) offset = 6;
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();

  let html = DOW.map((d) => `<div class="cal-dow">${d}</div>`).join("");
  for (let i = 0; i < offset; i++) html += `<div class="cal-dia vacio"></div>`;

  for (let dia = 1; dia <= diasEnMes; dia++) {
    const k = `${anio}-${mes}-${dia}`;
    const items = porDia.get(k) || [];
    const esHoy = k === claveHoy;
    const tieneVencido = items.some((it) => diasHastaEntrega(it.fechaEntrega, hoy) < 0);
    const clases = ["cal-dia"];
    if (esHoy) clases.push("hoy");
    if (items.length) clases.push("con-entregas");
    if (tieneVencido) clases.push("tiene-vencido");
    html += `<div class="${clases.join(" ")}" data-dia="${dia}">
      <span>${dia}</span>
      ${items.length ? `<span class="cuenta">${items.length}</span>` : ""}
    </div>`;
  }
  grid.innerHTML = html;

  grid.querySelectorAll(".cal-dia.con-entregas").forEach((el) => {
    const dia = Number(el.dataset.dia);
    el.addEventListener("click", () => mostrarDetalleDia(porDia.get(`${anio}-${mes}-${dia}`) || [], new Date(anio, mes, dia)));
  });
}

function abrir() {
  cursor = new Date();
  renderCalendario();
  overlay.classList.add("active");
}
function cerrar() {
  overlay.classList.remove("active");
}

document.getElementById("btnCalendario").addEventListener("click", abrir);
document.getElementById("btnCerrarCalendario").addEventListener("click", cerrar);
overlay.addEventListener("click", (e) => {
  if (e.target === overlay) cerrar();
});
document.getElementById("calPrev").addEventListener("click", () => {
  cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
  renderCalendario();
});
document.getElementById("calNext").addEventListener("click", () => {
  cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  renderCalendario();
});
