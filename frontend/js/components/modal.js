import { icon } from "../icons.js";
import { escapeHTML } from "../utils.js";

const root = () => document.getElementById("modal-root");
const modalStack = [];

function getFocusable(container) {
  return Array.from(
    container.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hidden && element.offsetParent !== null);
}

export function closeActiveModal() {
  modalStack[modalStack.length - 1]?.close();
}

export function closeAllModals() {
  while (modalStack.length) {
    modalStack[modalStack.length - 1].close("navigation");
  }
}

export function openModal({
  title,
  description = "",
  content = "",
  size = "medium",
  closeOnBackdrop = true,
  onClose = null,
} = {}) {
  const host = root();
  if (!host) throw new Error("No se encontró el contenedor de ventanas.");

  const previousFocus = document.activeElement;
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  const sizeClass = size === "large" ? "modal--large" : size === "small" ? "modal--small" : "";
  backdrop.innerHTML = `
    <section class="modal ${sizeClass}" role="dialog" aria-modal="true" aria-labelledby="active-modal-title">
      <header class="modal__header">
        <div>
          <h2 class="modal__title" id="active-modal-title"></h2>
          <p class="modal__description" ${description ? "" : "hidden"}></p>
        </div>
        <button class="icon-button modal__close" type="button" aria-label="Cerrar">${icon("close")}</button>
      </header>
      <div class="modal__body"></div>
      <footer class="modal__footer" hidden></footer>
    </section>
  `;

  const modal = backdrop.querySelector(".modal");
  const titleElement = backdrop.querySelector(".modal__title");
  const descriptionElement = backdrop.querySelector(".modal__description");
  const body = backdrop.querySelector(".modal__body");
  const footer = backdrop.querySelector(".modal__footer");
  titleElement.textContent = title || "Detalle";
  descriptionElement.textContent = description;

  if (content instanceof Node) body.append(content);
  else body.innerHTML = content;

  let closed = false;
  const close = (reason = "dismiss") => {
    if (closed) return;
    closed = true;
    document.removeEventListener("keydown", handleKeydown);
    backdrop.remove();
    const stackIndex = modalStack.indexOf(controller);
    if (stackIndex !== -1) modalStack.splice(stackIndex, 1);
    document.body.classList.toggle("modal-open", modalStack.length > 0);
    if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    onClose?.(reason);
  };

  const handleKeydown = (event) => {
    if (modalStack[modalStack.length - 1] !== controller) return;
    if (event.key === "Escape") {
      event.preventDefault();
      close("escape");
      return;
    }

    if (event.key !== "Tab") return;
    const focusable = getFocusable(modal);
    if (!focusable.length) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  backdrop.querySelector(".modal__close").addEventListener("click", () => close("close"));
  backdrop.addEventListener("mousedown", (event) => {
    if (closeOnBackdrop && event.target === backdrop) close("backdrop");
  });
  document.addEventListener("keydown", handleKeydown);
  host.append(backdrop);
  document.body.classList.add("modal-open");

  const controller = {
    element: modal,
    body,
    footer,
    close,
    setFooter(contentValue) {
      footer.hidden = false;
      if (contentValue instanceof Node) {
        footer.replaceChildren(contentValue);
      } else {
        footer.innerHTML = contentValue;
      }
      return footer;
    },
    hideFooter() {
      footer.hidden = true;
      footer.replaceChildren();
    },
  };

  modalStack.push(controller);
  window.requestAnimationFrame(() => {
    const target = modal.querySelector("[autofocus]") || getFocusable(modal)[0] || modal;
    if (target === modal) modal.setAttribute("tabindex", "-1");
    target.focus();
  });

  return controller;
}

export function confirmModal({
  title = "Confirmar acción",
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  danger = false,
} = {}) {
  return new Promise((resolve) => {
    let resolved = false;
    const finish = (value) => {
      if (resolved) return;
      resolved = true;
      resolve(value);
    };

    const modal = openModal({
      title,
      size: "small",
      content: `
        <div class="notice ${danger ? "notice--warning" : ""}">
          ${icon("warning")}
          <span>${escapeHTML(message || "¿Deseas continuar?")}</span>
        </div>
      `,
      onClose: () => finish(false),
    });

    modal.setFooter(`
      <button class="button button--secondary" type="button" data-action="cancel">${cancelText}</button>
      <button class="button ${danger ? "button--danger" : "button--primary"}" type="button" data-action="confirm">${confirmText}</button>
    `);
    modal.footer.querySelector('[data-action="cancel"]').addEventListener("click", () => {
      finish(false);
      modal.close("cancel");
    });
    modal.footer.querySelector('[data-action="confirm"]').addEventListener("click", () => {
      finish(true);
      modal.close("confirm");
    });
  });
}
