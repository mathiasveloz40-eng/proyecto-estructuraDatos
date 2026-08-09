import { icon } from "../icons.js";

const ITEMS = [
  { path: "/resumen", label: "Resumen", icon: "dashboard" },
  { path: "/urgencias", label: "Urgencias", icon: "emergency" },
  { path: "/pacientes", label: "Pacientes", icon: "patients" },
  { path: "/camas", label: "Camas", icon: "beds" },
  { path: "/movimientos", label: "Movimientos", icon: "movement" },
  { path: "/rutas", label: "Rutas internas", icon: "route" },
];

export function initSidebar({ container, menuButton, backdrop, onNavigate }) {
  container.innerHTML = `
    <span class="sidebar__label">Operación hospitalaria</span>
    ${ITEMS.map(
      (item) => `
        <a class="nav-link" href="#${item.path}" data-path="${item.path}">
          ${icon(item.icon)}
          <span>${item.label}</span>
        </a>
      `,
    ).join("")}
  `;

  const close = () => {
    document.body.classList.remove("sidebar-open");
    menuButton.setAttribute("aria-expanded", "false");
    backdrop.hidden = true;
  };

  const open = () => {
    document.body.classList.add("sidebar-open");
    menuButton.setAttribute("aria-expanded", "true");
    backdrop.hidden = false;
  };

  menuButton.addEventListener("click", () => {
    if (document.body.classList.contains("sidebar-open")) close();
    else open();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.body.classList.contains("sidebar-open")) {
      close();
      menuButton.focus();
    }
  });
  backdrop.addEventListener("click", close);
  container.addEventListener("click", (event) => {
    const link = event.target.closest(".nav-link");
    if (!link) return;
    event.preventDefault();
    close();
    onNavigate?.(link.dataset.path);
  });

  return {
    close,
    setActive(path) {
      container.querySelectorAll(".nav-link").forEach((link) => {
        if (link.dataset.path === path) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
      });
    },
  };
}
