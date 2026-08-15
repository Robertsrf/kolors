// Sesiones fotográficas: calendario de lo agendado + lista con el detalle.
//
// Es la única sección donde el jefe puede crear y editar, así que aquí no se
// usan las clases "no-jefe" que esconden botones en el resto de la app.
import { state, LUGAR_SESION_LABEL, TAMANO_FOTO_LABEL, fotosDeSesion, totalFotosImpresas, totalMontoFotos, totalSesionFoto } from "../state.js";
import { money, fmtNum, escapeHtml, fechaLegible, datoDestacadoHtml } from "../utils.js";
import { eliminarSesionFoto } from "../api.js";
import { render } from "../render.js";
import { abrirModalEditarSesionFoto, abrirModalNuevaSesionFoto } from "../modales/sesionFoto.js";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const DOW = ["L", "M", "M", "J", "V", "S", "D"];

const grid = document.getElementById("fotoCalGrid");
const mesAnioLabel = document.getElementById("fotoCalMesAnio");
const detalleEl = document.getElementById("fotoCalDiaDetalle");
const listaEl = document.getElementById("fotosList");

let cursor = new Date();
let filtroTexto = "";
let filtroEstado = "todas";
// Día elegido en el calendario (para resaltarlo y filtrar la lista).
let diaSeleccionado = null;

// Medianoche de hoy: separa lo que ya pasó de lo que viene.
function hoyCero() {
  const h = new Date();
  return new Date(h.getFullYear(), h.getMonth(), h.getDate());
}
function claveDeFecha(iso) {
  const f = new Date(iso);
  return `${f.getFullYear()}-${f.getMonth()}-${f.getDate()}`;
}
function esFutura(s) {
  return new Date(s.fecha) >= hoyCero();
}

// ============================================================
// CALENDARIO DEL MES
// ============================================================
function sesionesPorDia() {
  const mapa = new Map();
  state.sesionesFoto.forEach((s) => {
    const k = claveDeFecha(s.fecha);
    if (!mapa.has(k)) mapa.set(k, []);
    mapa.get(k).push(s);
  });
  return mapa;
}

function renderCalendarioFotos() {
  const anio = cursor.getFullYear();
  const mes = cursor.getMonth();
  mesAnioLabel.textContent = `${MESES[mes]} ${anio}`;

  const porDia = sesionesPorDia();
  const claveHoy = claveDeFecha(new Date());

  const primero = new Date(anio, mes, 1);
  // getDay(): 0 = domingo. Se corre para que la semana empiece en lunes.
  let offset = primero.getDay() - 1;
  if (offset < 0) offset = 6;
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();

  let html = DOW.map((d) => `<div class="cal-dow">${d}</div>`).join("");
  for (let i = 0; i < offset; i++) html += `<div class="cal-dia vacio"></div>`;

  for (let dia = 1; dia <= diasEnMes; dia++) {
    const k = `${anio}-${mes}-${dia}`;
    const sesiones = porDia.get(k) || [];
    const clases = ["cal-dia"];
    if (k === claveHoy) clases.push("hoy");
    if (sesiones.length) clases.push("con-entregas");
    if (k === diaSeleccionado) clases.push("elegido");
    html += `<div class="${clases.join(" ")}" data-clave="${k}" data-dia="${dia}">
      <span>${dia}</span>
      ${sesiones.length ? `<span class="cuenta">${sesiones.length}</span>` : ""}
    </div>`;
  }
  grid.innerHTML = html;

  grid.querySelectorAll(".cal-dia:not(.vacio)").forEach((el) => {
    el.addEventListener("click", () => {
      const k = el.dataset.clave;
      // Volver a tocar el mismo día quita el filtro.
      diaSeleccionado = diaSeleccionado === k ? null : k;
      renderSesionesFoto();
    });
  });

  pintarDetalleDia(porDia);
}

function pintarDetalleDia(porDia) {
  if (!diaSeleccionado) {
    const proximas = state.sesionesFoto.filter(esFutura).length;
    detalleEl.innerHTML = `<div class="cal-ayuda">Toca un día para ver solo sus sesiones.${
      proximas ? ` Tienes <b>${proximas}</b> sesión(es) por delante.` : ""
    }</div>`;
    return;
  }
  const sesiones = porDia.get(diaSeleccionado) || [];
  const [a, m, d] = diaSeleccionado.split("-").map(Number);
  const fecha = new Date(a, m, d);
  detalleEl.innerHTML =
    `<h4>${fecha.getDate()} de ${MESES[fecha.getMonth()].toLowerCase()} · ${sesiones.length} sesión(es)</h4>` +
    (sesiones.length
      ? sesiones
          .map(
            (s) => `<div class="notif-item">
              <span class="ic">📸</span>
              <div class="info">
                <div class="cli">${escapeHtml(s.nombre)}</div>
                <div class="sub">${LUGAR_SESION_LABEL[s.lugar] || s.lugar} · ${money(totalSesionFoto(s))}</div>
              </div>
            </div>`
          )
          .join("")
      : `<div class="cal-ayuda">Sin sesiones ese día. <button type="button" class="neu-btn small" id="btnAgendarEseDia">➕ Agendar aquí</button></div>`);

  const btn = document.getElementById("btnAgendarEseDia");
  // Se arma el YYYY-MM-DD con las piezas del día tal cual: pasar por UTC podría
  // correr la fecha un día según la hora del país.
  if (btn) {
    const valor = `${a}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    btn.addEventListener("click", () => abrirModalNuevaSesionFoto(valor));
  }
}

// ============================================================
// LISTA DE SESIONES
// ============================================================
function tarjetaSesion(s) {
  const card = document.createElement("div");
  card.className = "card impresion-card sesion-card";

  const cantidadFotos = totalFotosImpresas(s);
  const montoFotos = totalMontoFotos(s);
  const detalleFotos = fotosDeSesion(s)
    .filter((f) => Number(f.cantidad) > 0)
    .map((f) => `${fmtNum(f.cantidad)} × ${TAMANO_FOTO_LABEL[f.tamano] || f.tamano} (${money(f.precioUnitario)} c/u)`)
    .join(" · ");

  card.innerHTML = `
    <div class="impresion-top">
      <div>
        <div class="impresion-cliente">${escapeHtml(s.nombre)}</div>
        <div class="impresion-fecha">${fechaLegible(s.fecha)}${esFutura(s) ? " · próxima" : ""}</div>
      </div>
      <span class="badge lugar-${s.lugar}">${LUGAR_SESION_LABEL[s.lugar] || s.lugar}</span>
    </div>
    ${datoDestacadoHtml({
      icono: "📸",
      valor: money(totalSesionFoto(s)),
      unidad: "total",
      detalle: `sesión ${money(s.valorSesion)}${montoFotos ? ` · fotos ${money(montoFotos)}` : ""}`,
    })}
    ${s.telefono ? `<div class="impresion-mid"><span>📞 ${escapeHtml(s.telefono)}</span></div>` : ""}
    ${s.descripcion ? `<div class="impresion-desc">${escapeHtml(s.descripcion)}</div>` : ""}
    ${
      cantidadFotos
        ? `<div class="sesion-fotos"><b>🖼️ ${fmtNum(cantidadFotos)} foto(s) impresa(s)</b><span>${escapeHtml(detalleFotos)}</span></div>`
        : `<div class="sesion-fotos sin-fotos">🚫 Sin fotos impresas</div>`
    }
    <div class="sesion-actions">
      <button class="neu-btn icon" data-action="editar" title="Editar">✏️</button>
      <button class="neu-btn icon danger" data-action="eliminar" title="Eliminar">🗑️</button>
    </div>
  `;

  card.querySelector('[data-action="editar"]').addEventListener("click", () => abrirModalEditarSesionFoto(s.id));
  card.querySelector('[data-action="eliminar"]').addEventListener("click", () => borrar(s));
  return card;
}

async function borrar(s) {
  if (!confirm(`¿Eliminar la sesión de ${s.nombre} del ${fechaLegible(s.fecha)}? Esta acción no se puede deshacer.`)) return;
  try {
    await eliminarSesionFoto(s.id);
  } catch (err) {
    alert("No se pudo eliminar la sesión.\n\n" + err.message);
    return;
  }
  render();
}

export function renderSesionesFoto() {
  renderCalendarioFotos();

  if (state.sesionesFotoFalta) {
    listaEl.innerHTML = `<div class="empty-state">Falta preparar esta sección en la base de datos.<br>
      Corre una vez <b>supabase/migracion-sesiones-foto.sql</b> en el SQL Editor de Supabase y recarga la página.</div>`;
    return;
  }

  const texto = filtroTexto.trim().toLowerCase();
  const visibles = state.sesionesFoto
    .filter((s) => {
      if (texto && !`${s.nombre} ${s.telefono}`.toLowerCase().includes(texto)) return false;
      if (filtroEstado === "proximas" && !esFutura(s)) return false;
      if (filtroEstado === "pasadas" && esFutura(s)) return false;
      if (diaSeleccionado && claveDeFecha(s.fecha) !== diaSeleccionado) return false;
      return true;
    })
    // Lo que viene primero, y de lo ya hecho, lo más reciente arriba.
    .sort((a, b) => {
      const fa = new Date(a.fecha);
      const fb = new Date(b.fecha);
      const futA = esFutura(a);
      const futB = esFutura(b);
      if (futA !== futB) return futA ? -1 : 1;
      return futA ? fa - fb : fb - fa;
    });

  listaEl.innerHTML = "";
  if (!visibles.length) {
    listaEl.innerHTML = `<div class="empty-state">${
      state.sesionesFoto.length ? "Ninguna sesión coincide con lo que buscas." : "Todavía no hay sesiones fotográficas agendadas."
    }</div>`;
    return;
  }
  visibles.forEach((s) => listaEl.appendChild(tarjetaSesion(s)));
}

// ============================================================
// CONTROLES
// ============================================================
document.getElementById("buscadorFotos").addEventListener("input", (e) => {
  filtroTexto = e.target.value;
  renderSesionesFoto();
});

document.getElementById("filtroFotos").addEventListener("click", (e) => {
  const btn = e.target.closest(".filtro-pago-btn");
  if (!btn) return;
  document.querySelectorAll("#filtroFotos .filtro-pago-btn").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  filtroEstado = btn.dataset.filtro;
  renderSesionesFoto();
});

document.getElementById("fotoCalPrev").addEventListener("click", () => {
  cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
  renderSesionesFoto();
});
document.getElementById("fotoCalNext").addEventListener("click", () => {
  cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  renderSesionesFoto();
});
