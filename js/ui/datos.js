import { state } from "../state.js";
import { importarRespaldoAntiguo, borrarTodo } from "../api.js";
import { render } from "../render.js";

document.getElementById("btnExportar").addEventListener("click", () => {
  const data = JSON.stringify(
    { pedidos: state.pedidos, impresiones: state.impresiones, ecoSolvente: state.ecoSolvente, perdidas: state.perdidas },
    null,
    2
  );
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const hoy = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `kolors_respaldo_${hoy}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

document.getElementById("btnImportar").addEventListener("click", () => {
  const input = document.getElementById("inputImportar");
  const file = input.files[0];
  if (!file) {
    alert("Selecciona primero un archivo JSON.");
    return;
  }
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);
      let pedidos, impresiones, perdidas;
      if (Array.isArray(data)) {
        pedidos = data;
        impresiones = [];
        perdidas = [];
      } else if (data && Array.isArray(data.pedidos)) {
        pedidos = data.pedidos;
        impresiones = Array.isArray(data.impresiones) ? data.impresiones : [];
        perdidas = Array.isArray(data.perdidas) ? data.perdidas : [];
      } else {
        throw new Error("Formato inválido");
      }
      if (!confirm(`Esto importará ${pedidos.length} pedido(s), ${impresiones.length} impresión(es) y ${perdidas.length} pérdida(s)/prueba(s) sumándolos a los datos ya existentes en Supabase. ¿Continuar?`)) return;
      await importarRespaldoAntiguo({ pedidos, impresiones, perdidas });
      render();
      alert("Datos importados correctamente.");
    } catch (err) {
      alert("El archivo no es un JSON válido de respaldo, o falló la importación: " + err.message);
    }
  };
  reader.readAsText(file);
});

document.getElementById("btnBorrarTodo").addEventListener("click", async () => {
  if (!confirm("¿Seguro que deseas borrar TODOS los pedidos, impresiones, eco solvente y pérdidas de TODOS los usuarios? Esta acción no se puede deshacer.")) return;
  if (!confirm("Confirma una vez más: se eliminarán todos los datos guardados en la base de datos.")) return;
  await borrarTodo();
  render();
});
