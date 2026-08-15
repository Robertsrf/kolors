import { state, TAMANOS_FOTO, TAMANO_FOTO_LABEL } from "../state.js";
import { money, fmtNum, toInputDate, fechaInputToISO, marcarCampo, enfocarPrimerInvalido } from "../utils.js";
import { crearSesionFoto, actualizarSesionFoto, AVISO_FALTA_SESIONES_FOTO } from "../api.js";
import { render } from "../render.js";

const overlay = document.getElementById("modalSesionFotoOverlay");
const titulo = document.getElementById("modalSesionFotoTitulo");
const form = document.getElementById("formSesionFoto");
const checkFotos = document.getElementById("sesionFotoLlevaFotos");
const bloqueFotos = document.getElementById("sesionFotoBloqueFotos");
const fotosContainer = document.getElementById("fotosContainer");

let lineaCounter = 0;

// ============================================================
// LÍNEAS DE FOTOS IMPRESAS (tamaño + cuántas + precio de cada una)
// ============================================================
function agregarLineaFoto(foto) {
  lineaCounter++;
  const tamano = foto ? foto.tamano : "8x10";
  const cantidad = foto ? foto.cantidad : 1;
  const precio = foto ? foto.precioUnitario : 0;

  const row = document.createElement("div");
  row.className = "item-line foto-line";
  row.innerHTML = `
    <div>
      <label>Tamaño</label>
      <select class="in-tamano">
        ${TAMANOS_FOTO.map((t) => `<option value="${t}" ${t === tamano ? "selected" : ""}>${TAMANO_FOTO_LABEL[t]}</option>`).join("")}
      </select>
    </div>
    <div>
      <label>Cuántas</label>
      <input type="number" class="in-cant" min="1" step="1" value="${cantidad}">
    </div>
    <div>
      <label>Precio de cada una ($)</label>
      <input type="number" class="in-precio" min="0" step="0.01" value="${precio}">
    </div>
    <div>
      <button type="button" class="neu-btn icon danger in-quitar" title="Quitar tamaño">🗑️</button>
    </div>
  `;
  fotosContainer.appendChild(row);

  row.querySelector(".in-cant").addEventListener("input", actualizarResumen);
  row.querySelector(".in-precio").addEventListener("input", actualizarResumen);
  row.querySelector(".in-quitar").addEventListener("click", () => {
    row.remove();
    // Sin líneas no hay nada que cobrar: se destilda la casilla sola.
    if (!fotosContainer.children.length) {
      checkFotos.checked = false;
      aplicarLlevaFotos();
    }
    actualizarResumen();
  });
}

function leerLineasFoto() {
  return Array.from(fotosContainer.querySelectorAll(".foto-line")).map((row) => ({
    tamano: row.querySelector(".in-tamano").value,
    cantidad: Number(row.querySelector(".in-cant").value) || 0,
    precioUnitario: Number(row.querySelector(".in-precio").value) || 0,
  }));
}

function aplicarLlevaFotos() {
  const lleva = checkFotos.checked;
  bloqueFotos.style.display = lleva ? "" : "none";
  // Al marcarla por primera vez ya aparece una línea lista para llenar.
  if (lleva && !fotosContainer.children.length) agregarLineaFoto();
  actualizarResumen();
}

// ============================================================
// RESUMEN DE ABAJO
// ============================================================
function actualizarResumen() {
  const lineas = checkFotos.checked ? leerLineasFoto() : [];
  const cantidad = lineas.reduce((n, f) => n + f.cantidad, 0);
  const montoFotos = lineas.reduce((t, f) => t + f.cantidad * f.precioUnitario, 0);
  const valorSesion = Number(document.getElementById("sesionFotoValor").value) || 0;

  document.getElementById("resumenFotosCantidad").textContent = fmtNum(cantidad);
  document.getElementById("resumenFotosMonto").textContent = money(montoFotos);
  document.getElementById("resumenSesionTotal").textContent = money(valorSesion + montoFotos);
}

form.addEventListener("input", actualizarResumen);
checkFotos.addEventListener("change", aplicarLlevaFotos);
document.getElementById("btnAgregarFotoLinea").addEventListener("click", () => {
  agregarLineaFoto();
  actualizarResumen();
});

// ============================================================
// ABRIR / CERRAR
// ============================================================
// Sin la tabla creada no tiene sentido dejar llenar el formulario: se avisa
// antes de escribir nada, en vez de perderlo todo al guardar.
function faltaLaTabla() {
  if (!state.sesionesFotoFalta) return false;
  alert(AVISO_FALTA_SESIONES_FOTO);
  return true;
}

export function abrirModalNuevaSesionFoto(fechaSugerida) {
  if (faltaLaTabla()) return;
  form.reset();
  document.getElementById("sesionFotoId").value = "";
  document.getElementById("sesionFotoFecha").value = fechaSugerida || toInputDate();
  document.getElementById("sesionFotoLugar").value = "estudio";
  fotosContainer.innerHTML = "";
  checkFotos.checked = false;
  aplicarLlevaFotos();
  titulo.textContent = "Agendar sesión fotográfica";
  overlay.classList.add("active");
  document.getElementById("sesionFotoNombre").focus();
}

export function abrirModalEditarSesionFoto(id) {
  if (faltaLaTabla()) return;
  const s = state.sesionesFoto.find((x) => x.id === id);
  if (!s) return;
  form.reset();
  document.getElementById("sesionFotoId").value = s.id;
  document.getElementById("sesionFotoNombre").value = s.nombre;
  document.getElementById("sesionFotoTelefono").value = s.telefono || "";
  document.getElementById("sesionFotoFecha").value = toInputDate(s.fecha);
  document.getElementById("sesionFotoValor").value = s.valorSesion;
  document.getElementById("sesionFotoLugar").value = s.lugar || "estudio";
  document.getElementById("sesionFotoDescripcion").value = s.descripcion || "";

  fotosContainer.innerHTML = "";
  (s.fotos || []).forEach((f) => agregarLineaFoto(f));
  checkFotos.checked = !!s.llevaFotos;
  aplicarLlevaFotos();

  titulo.textContent = "Editar sesión fotográfica";
  overlay.classList.add("active");
}

function cerrar() {
  overlay.classList.remove("active");
}

// ============================================================
// GUARDAR
// ============================================================
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nombreEl = document.getElementById("sesionFotoNombre");
  const fechaEl = document.getElementById("sesionFotoFecha");
  const valorEl = document.getElementById("sesionFotoValor");
  const nombre = nombreEl.value.trim();
  const fechaInput = fechaEl.value;
  const valorSesion = Number(valorEl.value);

  let valido = true;
  valido = marcarCampo(nombreEl, !!nombre) && valido;
  valido = marcarCampo(fechaEl, !!fechaInput) && valido;
  valido = marcarCampo(valorEl, !isNaN(valorSesion) && valorSesion >= 0) && valido;

  const llevaFotos = checkFotos.checked;
  const lineas = llevaFotos ? leerLineasFoto() : [];
  if (llevaFotos) {
    // Marcar "lleva fotos impresas" y no decir cuántas deja la cuenta a medias.
    const filas = Array.from(fotosContainer.querySelectorAll(".foto-line"));
    filas.forEach((row) => {
      const cant = Number(row.querySelector(".in-cant").value) || 0;
      valido = marcarCampo(row.querySelector(".in-cant"), cant > 0) && valido;
    });
    if (!filas.length) {
      alert("Marcaste que la sesión lleva fotos impresas: agrega al menos un tamaño o desmarca la casilla.");
      return;
    }
  }
  if (!valido) {
    enfocarPrimerInvalido(form);
    return;
  }

  const datos = {
    nombre,
    telefono: document.getElementById("sesionFotoTelefono").value.trim(),
    fecha: fechaInputToISO(fechaInput),
    valorSesion,
    lugar: document.getElementById("sesionFotoLugar").value,
    llevaFotos,
    fotos: lineas,
    descripcion: document.getElementById("sesionFotoDescripcion").value.trim(),
  };

  const idExistente = document.getElementById("sesionFotoId").value;
  // Si falla el guardado la ventana se queda abierta: lo que se escribió no se
  // pierde y se puede reintentar.
  try {
    if (idExistente) await actualizarSesionFoto(idExistente, datos);
    else await crearSesionFoto(datos);
  } catch (err) {
    alert("No se pudo guardar la sesión.\n\n" + err.message);
    return;
  }

  cerrar();
  render();
});

document.getElementById("btnNuevaSesionFoto").addEventListener("click", () => abrirModalNuevaSesionFoto());
document.getElementById("btnCerrarModalSesionFoto").addEventListener("click", cerrar);
document.getElementById("btnCancelarModalSesionFoto").addEventListener("click", cerrar);
// Solo se cierra con la ✕ o Cancelar (no al hacer clic afuera).
