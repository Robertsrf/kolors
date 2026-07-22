// Calculadora simple (sin dependencias, sin eval).
const overlay = document.getElementById("modalCalculadoraOverlay");
const display = document.getElementById("calcDisplay");
const gridEl = document.getElementById("calcGrid");

let expr = "";

const BOTONES = [
  { t: "C", c: "clear" },
  { t: "⌫", c: "clear" },
  { t: "%", c: "op" },
  { t: "÷", c: "op" },
  { t: "7" }, { t: "8" }, { t: "9" }, { t: "×", c: "op" },
  { t: "4" }, { t: "5" }, { t: "6" }, { t: "−", c: "op" },
  { t: "1" }, { t: "2" }, { t: "3" }, { t: "+", c: "op" },
  { t: "0", c: "wide" }, { t: "." }, { t: "=", c: "eq" },
];

const OPS = { "+": "+", "−": "-", "×": "*", "÷": "/", "%": "%" };

function tokenizar(s) {
  const tokens = [];
  let num = "";
  for (const ch of s) {
    if ((ch >= "0" && ch <= "9") || ch === ".") {
      num += ch;
    } else if ("+-*/%".includes(ch)) {
      if (num !== "") { tokens.push(parseFloat(num)); num = ""; }
      tokens.push(ch);
    }
  }
  if (num !== "") tokens.push(parseFloat(num));
  return tokens;
}

function evaluar(s) {
  let t = tokenizar(s);
  if (!t.length) return 0;
  // primera pasada: * / %
  const t2 = [t[0]];
  for (let i = 1; i < t.length; i += 2) {
    const op = t[i];
    const val = t[i + 1];
    if (val == null) break;
    if (op === "*" || op === "/" || op === "%") {
      const a = t2.pop();
      t2.push(op === "*" ? a * val : op === "/" ? a / val : a % val);
    } else {
      t2.push(op, val);
    }
  }
  // segunda pasada: + -
  let acc = t2[0];
  for (let i = 1; i < t2.length; i += 2) {
    const op = t2[i];
    const val = t2[i + 1];
    if (val == null) break;
    acc = op === "+" ? acc + val : acc - val;
  }
  return acc;
}

function refrescar() {
  display.value = expr === "" ? "0" : expr;
}

function pulsar(txt) {
  if (txt === "C") {
    expr = "";
  } else if (txt === "⌫") {
    expr = expr.slice(0, -1);
  } else if (txt === "=") {
    try {
      const r = evaluar(expr);
      expr = Number.isFinite(r) ? String(Math.round(r * 1e6) / 1e6) : "Error";
    } catch {
      expr = "Error";
    }
  } else if (OPS[txt]) {
    if (expr === "" && txt !== "−") return;
    const ultimo = expr.slice(-1);
    if ("+-*/%".includes(ultimo)) expr = expr.slice(0, -1);
    expr += OPS[txt];
  } else {
    if (expr === "Error") expr = "";
    expr += txt;
  }
  refrescar();
}

gridEl.innerHTML = BOTONES.map((b) => `<button type="button" class="calc-btn ${b.c || ""}" data-t="${b.t}">${b.t}</button>`).join("");
gridEl.querySelectorAll(".calc-btn").forEach((el) => el.addEventListener("click", () => pulsar(el.dataset.t)));

function abrir() {
  overlay.classList.add("active");
}
function cerrar() {
  overlay.classList.remove("active");
}
document.getElementById("btnCalculadora").addEventListener("click", abrir);
document.getElementById("btnCerrarCalculadora").addEventListener("click", cerrar);
overlay.addEventListener("click", (e) => {
  if (e.target === overlay) cerrar();
});

// Teclado cuando la calculadora está abierta
document.addEventListener("keydown", (e) => {
  if (!overlay.classList.contains("active")) return;
  const map = { "/": "÷", "*": "×", "-": "−", "+": "+", "%": "%", Enter: "=", "=": "=", Backspace: "⌫", Escape: "C" };
  if (e.key >= "0" && e.key <= "9") { pulsar(e.key); e.preventDefault(); }
  else if (e.key === ".") { pulsar("."); e.preventDefault(); }
  else if (map[e.key]) { pulsar(map[e.key]); e.preventDefault(); }
});

refrescar();
