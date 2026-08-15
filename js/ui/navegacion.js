// Menú de secciones para pantallas angostas.
//
// En pantalla ancha las pestañas se ven todas y este archivo no hace nada. Al
// achicarse, la lista se guarda detrás del botón "☰" (lo decide el CSS) y aquí
// se maneja abrirlo, cerrarlo y que diga en qué sección estás parado.
const nav = document.getElementById("tabsNav");
const toggle = document.getElementById("btnMenuSecciones");
const lista = document.getElementById("tabsLista");
const toggleTexto = document.getElementById("tabsToggleTexto");

function abierto() {
  return lista.classList.contains("abierto");
}

function cerrar() {
  lista.classList.remove("abierto");
  toggle.setAttribute("aria-expanded", "false");
}

function alternar() {
  const nuevo = !abierto();
  lista.classList.toggle("abierto", nuevo);
  toggle.setAttribute("aria-expanded", String(nuevo));
}

// El botón dice en qué sección estás: cerrado el menú, es la única pista.
export function actualizarMenuSecciones() {
  const activa = document.querySelector(".tab-btn.active");
  toggleTexto.textContent = activa ? `☰ ${activa.textContent.trim()}` : "☰ Secciones";
}

toggle.addEventListener("click", (e) => {
  e.stopPropagation();
  alternar();
});

// Al elegir una sección el menú se cierra solo (si no, tapa lo que se acaba de
// abrir). Va en captura para adelantarse al repintado de la pestaña.
lista.addEventListener("click", (e) => {
  if (!e.target.closest(".tab-btn")) return;
  cerrar();
  actualizarMenuSecciones();
});

document.addEventListener("click", (e) => {
  if (abierto() && !nav.contains(e.target)) cerrar();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && abierto()) cerrar();
});

// Al ensanchar la ventana el CSS vuelve a mostrar las pestañas: que no quede la
// marca de "abierto" puesta para la próxima vez que se achique.
window.addEventListener("resize", () => {
  if (abierto() && toggle.offsetParent === null) cerrar();
});

actualizarMenuSecciones();
