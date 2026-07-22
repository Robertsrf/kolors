import { supabase, CONFIGURADO } from "./supabaseClient.js";

// ============================================================
// ROLES Y CÓDIGOS
//
// Cada código de 4 dígitos está ligado a una cuenta de Supabase.
// La contraseña real de cada cuenta es: <código> + SUFIJO_PASSWORD
// (el sufijo solo sirve para cumplir el mínimo de 6 caracteres de
// Supabase; el "secreto" real son los 4 dígitos).
//
// rol:
//   'admin'  -> ve y edita todo, además puede importar / borrar todo
//   'editor' -> ve y edita todo (María y Mía)
//   'jefe'   -> SOLO LECTURA (ve todo, no puede modificar nada)
// ============================================================
export const SUFIJO_PASSWORD = "kolors";

const CUENTAS = [
  { email: "admin@kolors.app", rol: "admin" },
  { email: "jefe@kolors.app", rol: "jefe" },
  { email: "maria@kolors.app", rol: "editor" },
  { email: "mia@kolors.app", rol: "editor" },
];

function rolPorEmail(email) {
  const c = CUENTAS.find((x) => x.email === email);
  return c ? c.rol : "editor";
}

const NOMBRE_POR_EMAIL = {
  "admin@kolors.app": "Admin",
  "jefe@kolors.app": "Jefe",
  "maria@kolors.app": "María",
  "mia@kolors.app": "Mía",
};

let usuarioSesion = null;
export function getUsuarioActual() {
  return usuarioSesion;
}

const loginOverlay = document.getElementById("loginOverlay");
const appShell = document.getElementById("appShell");
const formLogin = document.getElementById("formLogin");
const loginCodigo = document.getElementById("loginCodigo");
const loginError = document.getElementById("loginError");
const usuarioActual = document.getElementById("usuarioActual");
const btnLogout = document.getElementById("btnLogout");

const ETIQUETA_ROL = { admin: "Administrador", editor: "Editor", jefe: "Solo lectura" };

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
  loginCodigo.value = "";
}

function aplicarRol(rol) {
  document.body.classList.remove("rol-admin", "rol-editor", "rol-jefe");
  document.body.classList.add("rol-" + rol);
  usuarioActual.textContent = ETIQUETA_ROL[rol] || "";
}

function mostrarApp(rol) {
  loginOverlay.classList.add("hidden");
  appShell.classList.remove("hidden");
  aplicarRol(rol);
}

/**
 * Arranca el flujo de autenticación por código.
 * onLogin(rol) se llama una vez por sesión iniciada; onLogout() al salir.
 */
export function initAuth({ onLogin, onLogout }) {
  formLogin.addEventListener("submit", async (e) => {
    e.preventDefault();
    ocultarError();

    if (!CONFIGURADO) {
      mostrarError("Falta configurar la conexión a Supabase en js/config.js.");
      return;
    }

    const codigo = loginCodigo.value.trim();
    if (!/^\d{4}$/.test(codigo)) {
      mostrarError("Ingresa tu código de 4 dígitos.");
      return;
    }

    const password = codigo + SUFIJO_PASSWORD;
    const btn = formLogin.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = "Entrando...";

    // Se prueba el código contra cada cuenta hasta encontrar la correcta.
    let ok = false;
    for (const cuenta of CUENTAS) {
      const { data, error } = await supabase.auth.signInWithPassword({ email: cuenta.email, password });
      if (!error && data && data.session) {
        ok = true;
        break;
      }
    }

    btn.disabled = false;
    btn.textContent = "Entrar";
    if (!ok) {
      mostrarError("Código incorrecto.");
      loginCodigo.value = "";
      loginCodigo.focus();
    }
    // Si fue correcto, onAuthStateChange se encarga de mostrar la app.
  });

  btnLogout.addEventListener("click", async () => {
    await supabase.auth.signOut();
  });

  if (!CONFIGURADO) {
    mostrarError("Falta configurar la conexión a Supabase en js/config.js (SUPABASE_URL y SUPABASE_ANON_KEY).");
    return;
  }

  let sesionActivaId = null;

  supabase.auth.onAuthStateChange((_event, session) => {
    if (session && session.user) {
      const rol = rolPorEmail(session.user.email);
      usuarioSesion = { email: session.user.email, rol, nombre: NOMBRE_POR_EMAIL[session.user.email] || session.user.email };
      if (sesionActivaId !== session.user.id) {
        sesionActivaId = session.user.id;
        mostrarApp(rol);
        onLogin(rol);
      } else {
        mostrarApp(rol);
      }
    } else {
      sesionActivaId = null;
      usuarioSesion = null;
      document.body.classList.remove("rol-admin", "rol-editor", "rol-jefe");
      mostrarLogin();
      onLogout();
    }
  });
}
