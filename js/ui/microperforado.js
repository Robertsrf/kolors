// Panel derecho con la publicidad de microperforado (para enseñársela al cliente).
const overlay = document.getElementById("modalMicroOverlay");

function abrir() {
  overlay.classList.add("active");
}
function cerrar() {
  overlay.classList.remove("active");
}

document.getElementById("btnMicroperforado").addEventListener("click", abrir);
document.getElementById("btnCerrarMicro").addEventListener("click", cerrar);
overlay.addEventListener("click", (e) => {
  if (e.target === overlay) cerrar();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && overlay.classList.contains("active")) cerrar();
});
