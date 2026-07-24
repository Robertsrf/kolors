// Exporta la sección de Estadísticas a un PDF ordenado (una imagen HD por bloque).
const btn = document.getElementById("btnPdfStats");

function unidadesPdf() {
  const section = document.getElementById("section-stats");
  const units = [];
  for (const child of section.children) {
    if (child.hasAttribute("data-pdf-ignore")) continue;
    if (child.classList.contains("charts-grid")) {
      for (const block of child.children) units.push(block);
    } else {
      units.push(child);
    }
  }
  return units.filter((u) => u.offsetHeight > 0);
}

async function exportar() {
  if (!window.html2canvas || !window.jspdf) {
    alert("No se pudieron cargar las librerías del PDF. Revisa tu conexión e intenta de nuevo.");
    return;
  }
  const { jsPDF } = window.jspdf;
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Generando PDF…";
  try {
    const pdf = new jsPDF("p", "mm", "a4");
    const margin = 10;
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const contentW = pageW - margin * 2;
    let y = margin;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.text("Kolors · Estadísticas", margin, y + 6);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(120);
    pdf.text("Generado el " + new Date().toLocaleString("es-VE"), margin, y + 12);
    pdf.setTextColor(0);
    y += 20;

    for (const unit of unidadesPdf()) {
      const canvas = await window.html2canvas(unit, { scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false });
      let w = contentW;
      let h = (canvas.height * w) / canvas.width;
      const maxH = pageH - margin * 2;
      if (h > maxH) {
        h = maxH;
        w = (canvas.width * h) / canvas.height;
      }
      if (y + h > pageH - margin) {
        pdf.addPage();
        y = margin;
      }
      const x = margin + (contentW - w) / 2;
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", x, y, w, h);
      y += h + 5;
    }

    pdf.save(`kolors_estadisticas_${new Date().toISOString().slice(0, 10)}.pdf`);
  } catch (e) {
    alert("No se pudo generar el PDF: " + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
}

btn.addEventListener("click", exportar);
