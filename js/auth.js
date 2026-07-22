import { supabase, CONFIGURADO } from "./supabaseClient.js";

const loginOverlay = document.getElementById("loginOverlay");
const appShell = document.getElementById("appShell");
const formLogin = document.getElementById("formLogin");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginError = document.getElementById("loginError");
const usuarioActual = document.getElementById("usuarioActual");
const btnLogout = document.getElementById("btnLogout");

function mostrarError(mensaje) {
  loginError.textContent = mensaje;
  loginError.classList.add("visible");
}

function ocultarError() {
  loginError.textContent = "";
  loginError.classList.remove("visible");
}

function mostrarLogin() {
  loginOverlay.classList.remove("hidden");
  appShell.classList.add("hidden");
}

function mostrarApp(email) {
  loginOverlay.classList.add("hidden");
  appShell.classList.remove("hidden");
  usuarioActual.textContent = email || "";
}

/**
 * Arranca el flujo de autenticación. onLogin se llama (una sola vez por
 * sesión iniciada) cuando hay un usuario autenticado y la app debe cargar
 * sus datos; onLogout se llama cuando no hay sesión (o se cierra sesión) y
 * hay que limpiar la pantalla.
 */
export function initAuth({ onLogin, onLogout }) {
  formLogin.addEventListener("submit", async (e) => {
    e.preventDefault();
    ocultarError();
    if (!CONFIGURADO) {
      mostrarError(
        "Falta configurar la conexión a Supabase en js/config.js (SUPABASE_URL y SUPABASE_ANON_KEY)."
      );
      return;
    }
    const email = loginEmail.value.trim();
    const password = loginPassword.value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      mostrarError("Correo o contraseña incorrectos.");
    }
  });

  btnLogout.addEventListener("click", async () => {
    await supabase.auth.signOut();
  });

  if (!CONFIGURADO) {
    mostrarError(
      "Falta configurar la conexión a Supabase en js/config.js (SUPABASE_URL y SUPABASE_ANON_KEY)."
    );
    return;
  }

  let sesionActivaId = null;

  supabase.auth.onAuthStateChange((_event, session) => {
    if (session && session.user) {
      if (sesionActivaId !== session.user.id) {
        sesionActivaId = session.user.id;
        mostrarApp(session.user.email);
        onLogin(session);
      } else {
        mostrarApp(session.user.email);
      }
    } else {
      sesionActivaId = null;
      mostrarLogin();
      onLogout();
    }
  });
}
