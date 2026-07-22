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
      let pedidos, impresiones, ecoSolvente, perdidas;
      if (Array.isArray(data)) {
        pedidos = data;
        impresiones = [];
        ecoSolvente = [];
        perdidas = [];
      } else if (data && typeof data === "object") {
        pedidos = Array.isArray(data.pedidos) ? data.pedidos : [];
        impresiones = Array.isArray(data.impresiones) ? data.impresiones : [];
        ecoSolvente = Array.isArray(data.ecoSolvente) ? data.ecoSolvente : [];
        perdidas = Array.isArray(data.perdidas) ? data.perdidas : [];
        if (!pedidos.length && !impresiones.length && !ecoSolvente.length && !perdidas.length) {
          throw new Error("El JSON no contiene pedidos, impresiones, ecoSolvente ni perdidas.");
        }
      } else {
        throw new Error("Formato inválido");
      }
      if (!confirm(`Esto importará ${pedidos.length} pedido(s) de camisa, ${impresiones.length} sublimación(es), ${ecoSolvente.length} eco solvente y ${perdidas.length} pérdida(s)/prueba(s), sumándolos a los datos ya existentes en Supabase. ¿Continuar?`)) return;
      await importarRespaldoAntiguo({ pedidos, impresiones, ecoSolvente, perdidas });
      render();
      alert("Datos importados correctamente.");
    } catch (err) {
      alert("El archivo no es un JSON válido de respaldo, o falló la importación: " + err.message);
    }
  };
  reader.readAsText(file);
});

// Importadores separados (para la migración inicial desde Excel).
// Aceptan un JSON que sea un arreglo directo, o un objeto con la clave del tipo.
function importarSoloTipo(inputId, clave, etiqueta) {
  const input = document.getElementById(inputId);
  const file = input.files[0];
  if (!file) {
    alert("Selecciona primero un archivo JSON.");
    return;
  }
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);
      let registros;
      if (Array.isArray(data)) {
        registros = data;
      } else if (data && typeof data === "object" && Array.isArray(data[clave])) {
        registros = data[clave];
      } else {
        throw new Error(`El JSON debe ser un arreglo de ${etiqueta}, o un objeto con la clave "${clave}".`);
      }
      if (!registros.length) {
        throw new Error(`El JSON no contiene ningún registro de ${etiqueta}.`);
      }
      if (!confirm(`Esto importará ${registros.length} registro(s) de ${etiqueta}, sumándolos a lo que ya exista en Supabase. ¿Continuar?`)) return;
      await importarRespaldoAntiguo({ [clave]: registros });
      render();
      alert(`${etiqueta} importado correctamente (${registros.length}).`);
    } catch (err) {
      alert(`El archivo no es válido o falló la importación: ${err.message}`);
    }
  };
  reader.readAsText(file);
}

document.getElementById("btnImportarSublimacion").addEventListener("click", () => {
  importarSoloTipo("inputImportarSublimacion", "impresiones", "sublimación");
});

document.getElementById("btnImportarEco").addEventListener("click", () => {
  importarSoloTipo("inputImportarEco", "ecoSolvente", "eco solvente");
});

document.getElementById("btnBorrarTodo").addEventListener("click", async () => {
  if (!confirm("¿Seguro que deseas borrar TODOS los pedidos, impresiones, eco solvente y pérdidas de TODOS los usuarios? Esta acción no se puede deshacer.")) return;
  if (!confirm("Confirma una vez más: se eliminarán todos los datos guardados en la base de datos.")) return;
  await borrarTodo();
  render();
});
