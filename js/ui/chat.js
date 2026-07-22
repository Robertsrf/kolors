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
  try {
    await cargarMensajes();
  } catch (e) {
    cont.innerHTML = `<div class="chat-vacio">No se pudo cargar el chat. ¿Corriste la migración de notas/chat?</div>`;
    return;
  }
  renderMensajes();
  if (canal) {
    supabase.removeChannel(canal);
    canal = null;
  }
  canal = suscribirChat((msg) => {
    if (abierto()) {
      renderMensajes();
    } else {
      const yo = getUsuarioActual();
      if (!yo || msg.autor !== yo.nombre) noLeidos++;
      actualizarBadge();
    }
  });
}
