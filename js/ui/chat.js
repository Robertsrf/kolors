import { state } from "../state.js";
import { cargarMensajes, enviarMensaje, suscribirChat } from "../api.js";
import { getUsuarioActual } from "../auth.js";
import { escapeHtml } from "../utils.js";
import { supabase } from "../supabaseClient.js";

const overlay = document.getElementById("modalChatOverlay");
const cont = document.getElementById("chatMensajes");
const form = document.getElementById("formChat");
const input = document.getElementById("chatInput");
const badge = document.getElementById("chatBadge");

let canal = null;
let noLeidos = 0;
// Mensajes que ya se contaron, para no volver a marcarlos como "nuevos" cuando
// el chat se recarga completo (repaso periódico).
let idsVistos = new Set();

function horaCorta(iso) {
  const d = new Date(iso);
  return d.toLocaleString("es-VE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function abierto() {
  return overlay.classList.contains("active");
}

function renderMensajes() {
  const yo = getUsuarioActual();
  const miNombre = yo ? yo.nombre : "";
  if (!state.mensajes.length) {
    cont.innerHTML = `<div class="chat-vacio">Todavía no hay mensajes. ¡Escribe el primero! 👋</div>`;
    return;
  }
  cont.innerHTML = state.mensajes
    .map((m) => {
      const propio = m.autor === miNombre;
      return `<div class="chat-msg ${propio ? "propio" : "ajeno"}">
        ${propio ? "" : `<div class="autor">${escapeHtml(m.autor)}</div>`}
        <div>${escapeHtml(m.texto)}</div>
        <div class="hora">${horaCorta(m.creado_at)}</div>
      </div>`;
    })
    .join("");
  cont.scrollTop = cont.scrollHeight;
}

function actualizarBadge() {
  if (noLeidos > 0 && !abierto()) {
    badge.style.display = "";
    badge.textContent = noLeidos > 9 ? "9+" : noLeidos;
  } else {
    badge.style.display = "none";
  }
}

// Revisa qué mensajes son nuevos desde la última vez: si el chat está abierto se
// repinta, y si no, se suma al globito rojo. Lo usan tanto el aviso en vivo como
// el repaso periódico.
function aplicarMensajes({ primeraVez = false } = {}) {
  const yo = getUsuarioActual();
  let nuevosDeOtros = 0;
  state.mensajes.forEach((m) => {
    if (idsVistos.has(m.id)) return;
    idsVistos.add(m.id);
    if (!primeraVez && !abierto() && (!yo || m.autor !== yo.nombre)) nuevosDeOtros++;
  });
  if (abierto()) {
    noLeidos = 0;
    renderMensajes();
  } else {
    noLeidos += nuevosDeOtros;
  }
  actualizarBadge();
}

// Vuelve a bajar el chat del servidor. Es la red de seguridad por si el aviso en
// vivo no llegó (era lo que hacía que los mensajes "tardaran" hasta recargar).
export async function refrescarChat() {
  try {
    await cargarMensajes();
    aplicarMensajes();
  } catch (e) {
    // Sin chat disponible (falta la migración): no se molesta al usuario.
  }
}

function abrir() {
  overlay.classList.add("active");
  noLeidos = 0;
  actualizarBadge();
  renderMensajes();
  input.focus();
}
function cerrar() {
  overlay.classList.remove("active");
}

document.getElementById("btnChat").addEventListener("click", abrir);
document.getElementById("btnCerrarChat").addEventListener("click", cerrar);
overlay.addEventListener("click", (e) => {
  if (e.target === overlay) cerrar();
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const texto = input.value.trim();
  if (!texto) return;
  const yo = getUsuarioActual();
  input.value = "";
  try {
    await enviarMensaje(yo ? yo.nombre : "Anónimo", texto);
  } catch (err) {
    alert("No se pudo enviar el mensaje: " + err.message);
  }
});

export async function initChat() {
  noLeidos = 0;
  idsVistos = new Set();
  try {
    await cargarMensajes();
  } catch (e) {
    cont.innerHTML = `<div class="chat-vacio">No se pudo cargar el chat. ¿Corriste la migración de notas/chat?</div>`;
    return;
  }
  aplicarMensajes({ primeraVez: true });
  renderMensajes();
  if (canal) {
    supabase.removeChannel(canal);
    canal = null;
  }
  canal = suscribirChat(() => aplicarMensajes());
}
