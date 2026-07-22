import { state } from "../state.js";
import { cargarNotas, guardarNotas, suscribirNotas } from "../api.js";
import { getUsuarioActual } from "../auth.js";
import { supabase } from "../supabaseClient.js";

const overlay = document.getElementById("modalNotasOverlay");
const textarea = document.getElementById("notasTexto");
const estado = document.getElementById("notasEstado");

let guardarTimer = null;
let canal = null;

function abrir() {
  textarea.value = state.notas || "";
  overlay.classList.add("active");
  estado.textContent = "";
}
function cerrar() {
  overlay.classList.remove("active");
}

document.getElementById("btnNotas").addEventListener("click", abrir);
document.getElementById("btnCerrarNotas").addEventListener("click", cerrar);
overlay.addEventListener("click", (e) => {
  if (e.target === overlay) cerrar();
});

textarea.addEventListener("input", () => {
  estado.textContent = "Escribiendo…";
  if (guardarTimer) clearTimeout(guardarTimer);
  guardarTimer = setTimeout(async () => {
    try {
      const u = getUsuarioActual();
      await guardarNotas(textarea.value, u ? u.nombre : "");
      estado.textContent = "Guardado ✓";
    } catch (e) {
      estado.textContent = "Error al guardar: " + e.message;
    }
  }, 700);
});

export async function initNotas() {
  try {
    await cargarNotas();
    if (document.activeElement !== textarea) textarea.value = state.notas || "";
  } catch (e) {
    estado.textContent = "No se pudieron cargar las notas. ¿Corriste la migración de notas/chat?";
    return;
  }
  if (canal) {
    supabase.removeChannel(canal);
    canal = null;
  }
  canal = suscribirNotas((row) => {
    // No pisar lo que el usuario está escribiendo ahora mismo.
    if (document.activeElement !== textarea) textarea.value = state.notas || "";
    if (row && row.actualizado_por) estado.textContent = `Última edición: ${row.actualizado_por}`;
  });
}
