import { api } from "./api.js";
import { icon } from "./icons.js";
import { router } from "./router.js";
import { debounce, escapeHTML, formatLongDate, initials, patientName, unwrapCollection } from "./utils.js";
import { initSidebar } from "./components/sidebar.js";
import { closeAllModals } from "./components/modal.js";
import { renderErrorState, renderLoadingState } from "./components/table.js";
import { initToasts, showToast } from "./components/toast.js";
import * as dashboard from "./modules/dashboard.js";
import * as pacientes from "./modules/pacientes.js";
import * as urgencias from "./modules/urgencias.js";
import * as camas from "./modules/camas.js";
import * as movimientos from "./modules/movimientos.js";
import * as rutas from "./modules/rutas.js";

const modules = { dashboard, pacientes, urgencias, camas, movimientos, rutas };
const content = document.getElementById("main-content");
const sectionTitle = document.getElementById("current-section");
const dateElement = document.getElementById("current-date");
const statusElement = document.getElementById("system-status");
const searchForm = document.getElementById("global-search");
const searchInput = document.getElementById("global-search-input");
const searchResults = document.getElementById("global-search-results");

let activeCleanup = null;
let renderVersion = 0;
let searchVersion = 0;

initToasts();

const sidebar = initSidebar({
  container: document.getElementById("primary-navigation"),
  menuButton: document.getElementById("menu-toggle"),
  backdrop: document.getElementById("sidebar-backdrop"),
  onNavigate: (path) => router.navigate(path),
});

function setOnline(online) {
  statusElement.classList.toggle("is-offline", !online);
  statusElement.querySelector("span:last-child").textContent = online ? "Conectado" : "Sin conexión";
  statusElement.setAttribute("aria-label", online ? "Sistema conectado" : "Sistema sin conexión");
}

function updateDate() {
  dateElement.textContent = formatLongDate(new Date());
}

async function checkHealth() {
  try {
    await api.health();
    setOnline(true);
  } catch {
    setOnline(false);
  }
}

function hideSearchResults() {
  searchResults.hidden = true;
  searchInput.setAttribute("aria-expanded", "false");
}

function showSearchResults(html) {
  searchResults.innerHTML = html;
  searchResults.hidden = false;
  searchInput.setAttribute("aria-expanded", "true");
}

function patientSearchResults(patientsList) {
  if (!patientsList.length) {
    return '<p class="search-results__message">No se encontraron pacientes.</p>';
  }

  return patientsList.slice(0, 6)
    .map((patient) => {
      const name = patientName(patient);
      return `
        <button class="search-result-item" type="button" role="option" data-search-patient="${escapeHTML(patient.id)}">
          <span class="table-primary__avatar">${escapeHTML(initials(name))}</span>
          <span class="search-result-item__copy">
            <strong>${escapeHTML(name)}</strong>
            <small>HC ${escapeHTML(patient.historiaClinica || patient.id)} · ${escapeHTML(patient.areaActual || "Sin ubicación")}</small>
          </span>
          ${icon("arrowRight")}
        </button>
      `;
    })
    .join("");
}

const performSearch = debounce(async () => {
  const query = searchInput.value.trim();
  const version = ++searchVersion;
  if (query.length < 2) {
    hideSearchResults();
    return;
  }

  showSearchResults('<p class="search-results__message"><span class="spinner" aria-hidden="true" style="display:inline-block;vertical-align:middle;margin-right:7px"></span>Buscando…</p>');
  try {
    const payload = await api.getPatients({ buscar: query, orden: "nombre", direccion: "asc" });
    if (version !== searchVersion) return;
    showSearchResults(patientSearchResults(unwrapCollection(payload, ["pacientes"])));
  } catch (error) {
    if (version !== searchVersion) return;
    showSearchResults(`<p class="search-results__message">${escapeHTML(error.message)}</p>`);
  }
}, 280);

searchInput.addEventListener("input", performSearch);
searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    hideSearchResults();
    searchInput.blur();
  }
});
searchInput.addEventListener("focus", () => {
  if (searchInput.value.trim().length >= 2) performSearch();
});
searchResults.addEventListener("click", (event) => {
  const button = event.target.closest("[data-search-patient]");
  if (!button) return;
  hideSearchResults();
  searchInput.value = "";
  router.navigate("/pacientes", { detalle: button.dataset.searchPatient });
});
searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const query = searchInput.value.trim();
  if (!query) {
    searchInput.focus();
    return;
  }

  hideSearchResults();
  if (/^\d+$/.test(query)) {
    try {
      const patient = await api.findPatientByRecord(query);
      searchInput.value = "";
      router.navigate("/pacientes", { detalle: patient.id });
      return;
    } catch (error) {
      if (error.status !== 404) showToast(error.message, { type: "error" });
    }
  }
  router.navigate("/pacientes", { buscar: query });
});
document.addEventListener("click", (event) => {
  if (!searchForm.contains(event.target)) hideSearchResults();
});

async function renderRoute(route) {
  const version = ++renderVersion;
  closeAllModals();
  if (typeof activeCleanup === "function") {
    try {
      activeCleanup();
    } catch {
      // Una limpieza fallida no debe bloquear la siguiente pantalla.
    }
  }
  activeCleanup = null;
  sidebar.setActive(route.path);
  sidebar.close();
  sectionTitle.textContent = route.title;
  const pageMount = document.createElement("div");
  pageMount.innerHTML = renderLoadingState(`Abriendo ${route.title.toLocaleLowerCase("es")}…`);
  content.replaceChildren(pageMount);

  const module = modules[route.key] || modules.dashboard;
  try {
    const cleanup = await module.render(pageMount, {
      route,
      navigate: (path, params) => router.navigate(path, params),
      setOnline,
    });
    if (version !== renderVersion) {
      if (typeof cleanup === "function") cleanup();
      return;
    }
    activeCleanup = cleanup;
    window.scrollTo({ top: 0, behavior: "smooth" });
    content.focus({ preventScroll: true });
  } catch (error) {
    if (version !== renderVersion) return;
    pageMount.innerHTML = renderErrorState(error.message || "La pantalla no pudo cargarse.");
    pageMount.querySelector("[data-retry]")?.addEventListener("click", () => renderRoute(route));
  }
}

router.subscribe(renderRoute);
updateDate();
checkHealth();
window.setInterval(updateDate, 60_000);
router.start();
