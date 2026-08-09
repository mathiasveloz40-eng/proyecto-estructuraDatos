import { escapeHTML } from "../utils.js";

let region = null;

export function initToasts(container = document.getElementById("toast-region")) {
  region = container;
}

export function showToast(message, options = {}) {
  if (!region) initToasts();
  if (!region) return null;

  const type = ["success", "warning", "error", "info"].includes(options.type)
    ? options.type
    : "info";
  const titleByType = {
    success: "Operación completada",
    warning: "Revisa esta información",
    error: "No se pudo completar",
    info: "Información",
  };
  const symbolByType = { success: "✓", warning: "!", error: "×", info: "i" };
  const toast = document.createElement("article");
  toast.className = `toast toast--${type}`;
  toast.setAttribute("role", type === "error" ? "alert" : "status");
  toast.innerHTML = `
    <span class="toast__icon" aria-hidden="true">${symbolByType[type]}</span>
    <div class="toast__copy">
      <strong>${escapeHTML(options.title || titleByType[type])}</strong>
      <p>${escapeHTML(message)}</p>
    </div>
    <button class="toast__close" type="button" aria-label="Cerrar notificación">×</button>
  `;

  const remove = () => {
    if (!toast.isConnected) return;
    toast.classList.add("is-leaving");
    window.setTimeout(() => toast.remove(), 190);
  };

  toast.querySelector(".toast__close").addEventListener("click", remove);
  region.append(toast);

  const duration = Number(options.duration ?? (type === "error" ? 6500 : 4500));
  if (duration > 0) window.setTimeout(remove, duration);
  return { element: toast, remove };
}
