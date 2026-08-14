import { supabase } from "./supabaseClient.js";
import { cargarTodo, suscribirRealtime, olvidarCanalRealtime } from "./api.js";
import { render } from "./render.js";
import { refrescarChat } from "./ui/chat.js";
import { refrescarNotas } from "./ui/notas.js";
import { refrescarLog } from "./ui/log.js";
import { notificarEtapaFinal, registrarAutorEtapaFinal } from "./ui/avisoEtapaFinal.js";

// ============================================================
// SINCRONIZACIÓN EN VIVO
//
// Antes solo se dependía del canal de tiempo real de Supabase. Si ese canal se
// caía (wifi que se va, computadora que se duerme, pestaña en segundo plano,
// sesión que se renueva...) nadie se enteraba: los cambios y los mensajes solo
// aparecían al recargar la página a mano.
//
// Ahora hay tres redes de seguridad:
//   1. Tiempo real, con reconexión automática si el canal se cae.
//   2. Un repaso periódico (cada 1 min si el canal está vivo, cada 15 s si no).
//   3. Un repaso inmediato al volver a la pestaña, al recuperar internet y al
//      volver a conectarse el canal (por si algo pasó mientras no estábamos).
// ============================================================

const INTERVALO_VIVO_MS = 60 * 1000; // canal conectado: el repaso es solo por si acaso
const INTERVALO_CAIDO_MS = 15 * 1000; // sin tiempo real: se pregunta seguido
const LATIDO_MS = 5 * 1000; // cada cuánto se revisa si toca refrescar
const GAP_MINIMO_MS = 3 * 1000; // separación mínima entre dos repasos automáticos
const RECONEXION_MIN_MS = 3 * 1000;
const RECONEXION_MAX_MS = 30 * 1000;

let activo = false;
let canal = null;
let vista = "conectando"; // conectando | vivo | reconectando | sin-conexion
let refrescando = false;
let ultimoRefresco = 0;
let intentos = 0;
let latido = null;
let timerReconexion = null;

// ============================================================
// INDICADOR EN LA BARRA DE ARRIBA
// ============================================================
const TEXTO_ESTADO = {
  conectando: { txt: "⏳ Conectando…", tit: "Conectando con el servidor…" },
  vivo: { txt: "🟢 En vivo", tit: "Los cambios de los demás llegan solos. Haz clic para actualizar ahora." },
  reconectando: {
    txt: "🟡 Reconectando…",
    tit: "Se perdió la conexión en vivo; mientras tanto la página se actualiza sola cada 15 segundos. Haz clic para actualizar ahora.",
  },
  "sin-conexion": {
    txt: "🔴 Sin conexión",
    tit: "No se pudo hablar con el servidor. Revisa el internet. Haz clic para reintentar.",
  },
};

function pintarEstado() {
  const el = document.getElementById("syncEstado");
  if (!el) return;
  const info = TEXTO_ESTADO[vista] || TEXTO_ESTADO.conectando;
  el.textContent = info.txt;
  el.title = info.tit;
  el.className = "neu-btn sync-estado " + vista;
}

function cambiarVista(nueva) {
  if (vista === nueva) return;
  vista = nueva;
  pintarEstado();
}

// ============================================================
// REFRESCO
// ============================================================
// Mientras alguien arrastra una tarjeta no se repinta el tablero: se le caería
// de la mano. El siguiente latido lo intenta de nuevo.
function hayArrastre() {
  return !!document.querySelector(".card.arrastrando");
}

export async function refrescarAhora(motivo = "manual") {
  if (!activo || refrescando) return;
  if (motivo !== "manual") {
    // Nunca dos repasos automáticos pegados (cambiar de ventana, avisos
    // seguidos...): sería pedirle lo mismo al servidor varias veces.
    if (Date.now() - ultimoRefresco < GAP_MINIMO_MS) return;
    if (hayArrastre()) return;
  }
  refrescando = true;
  try {
    await cargarTodo();
    render();
    if (vista === "sin-conexion") cambiarVista(canal ? "reconectando" : "conectando");
  } catch (e) {
    console.error("Kolors · no se pudo actualizar:", e);
    cambiarVista("sin-conexion");
  } finally {
    ultimoRefresco = Date.now();
    refrescando = false;
  }
  // Chat, notas y log van aparte: si a alguno le falta su migración, no debe
  // tumbar el refresco de los pedidos.
  refrescarChat();
  refrescarNotas();
  refrescarLog();
}

function tick() {
  if (!activo) return;
  if (document.visibilityState !== "visible") return;
  const intervalo = vista === "vivo" ? INTERVALO_VIVO_MS : INTERVALO_CAIDO_MS;
  if (Date.now() - ultimoRefresco >= intervalo) refrescarAhora("repaso");
}

// ============================================================
// CANAL DE TIEMPO REAL (con reconexión)
// ============================================================
function conectar() {
  if (!activo) return;
  if (canal) {
    supabase.removeChannel(canal);
    olvidarCanalRealtime(canal);
    canal = null;
  }
  canal = suscribirRealtime(
    () => {
      ultimoRefresco = Date.now();
      render();
    },
    {
      onEstado: (status) => {
        if (!activo) return;
        if (status === "SUBSCRIBED") {
          intentos = 0;
          cambiarVista("vivo");
          // Al (re)conectar se repasa todo: pudo cambiar algo mientras no había canal.
          refrescarAhora("reconexion");
          return;
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          cambiarVista(navigator.onLine === false ? "sin-conexion" : "reconectando");
          programarReconexion();
        }
      },
      onEtapaFinal: (datos) => {
        if (!datos || !datos.id) return;
        registrarAutorEtapaFinal(datos.id, datos.autor);
        notificarEtapaFinal(datos);
        // El aviso llegó al instante; los datos van detrás.
        refrescarAhora("aviso");
      },
    }
  );
}

function programarReconexion() {
  if (!activo || timerReconexion) return;
  const espera = Math.min(RECONEXION_MIN_MS * Math.pow(2, intentos), RECONEXION_MAX_MS);
  intentos++;
  timerReconexion = setTimeout(() => {
    timerReconexion = null;
    conectar();
  }, espera);
}

// ============================================================
// ARRANQUE / PARADA
// ============================================================
export function iniciarSync() {
  if (activo) detenerSync();
  activo = true;
  intentos = 0;
  ultimoRefresco = Date.now();
  cambiarVista("conectando");
  pintarEstado();
  conectar();
  latido = setInterval(tick, LATIDO_MS);
}

export function detenerSync() {
  activo = false;
  if (canal) {
    supabase.removeChannel(canal);
    olvidarCanalRealtime(canal);
    canal = null;
  }
  if (latido) {
    clearInterval(latido);
    latido = null;
  }
  if (timerReconexion) {
    clearTimeout(timerReconexion);
    timerReconexion = null;
  }
  cambiarVista("conectando");
}

// Al volver a la pestaña (o al teléfono), al recuperar internet y al hacer clic
// en el indicador: repaso inmediato.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") refrescarAhora("volver");
});
window.addEventListener("focus", () => refrescarAhora("foco"));
window.addEventListener("online", () => {
  cambiarVista("reconectando");
  intentos = 0;
  conectar();
  refrescarAhora("internet");
});
window.addEventListener("offline", () => cambiarVista("sin-conexion"));

const btnEstado = document.getElementById("syncEstado");
if (btnEstado) {
  btnEstado.addEventListener("click", () => {
    refrescarAhora("manual");
    if (vista !== "vivo") {
      intentos = 0;
      conectar();
    }
  });
}
