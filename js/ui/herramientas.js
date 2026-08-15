// Panel de herramientas de la izquierda (metas, logros, calendario, calculadora,
// notas, chat y precios). Se puede esconder; queda recordado para la próxima vez.
const dock = document.getElementById("toolsDock");
const boton = document.getElementById("btnToolsDock");
const CLAVE = "kolors_herramientas_ocultas";

function aplicar(oculto) {
  dock.classList.toggle("oculto", oculto);
  // El contenido se corre a la izquierda cuando el panel está escondido.
  document.body.classList.toggle("herramientas-ocultas", oculto);
  boton.textContent = oculto ? "›" : "‹";
  boton.title = oculto ? "Mostrar herramientas" : "Ocultar herramientas";
  boton.setAttribute("aria-expanded", String(!oculto));
}

// localStorage puede fallar (modo privado en algunos navegadores): si pasa, el
// panel simplemente arranca visible.
function leerPreferencia() {
  try {
    return localStorage.getItem(CLAVE) === "1";
  } catch {
    return false;
  }
}
function guardarPreferencia(oculto) {
  try {
    localStorage.setItem(CLAVE, oculto ? "1" : "0");
  } catch {
    /* sin guardar */
  }
}

aplicar(leerPreferencia());

boton.addEventListener("click", () => {
  const oculto = !dock.classList.contains("oculto");
  aplicar(oculto);
  guardarPreferencia(oculto);
});

// Pestañas que no tienen nada que ver con estas herramientas: el panel entero
// (incluida la pestañita para mostrarlo) desaparece mientras se esté ahí.
const SIN_HERRAMIENTAS = ["fotos"];

export function aplicarHerramientasPorPestana(tab) {
  document.body.classList.toggle("sin-herramientas", SIN_HERRAMIENTAS.includes(tab));
}
