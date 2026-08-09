import { api } from "../api.js";
import { icon } from "../icons.js";
import { DEFAULT_AREAS, escapeHTML, routeKey, setButtonBusy } from "../utils.js";
import { renderErrorState, renderLoadingState } from "../components/table.js";
import { showToast } from "../components/toast.js";

const FALLBACK_CONNECTIONS = [
  { origen: "Triaje", destino: "Urgencias" },
  { origen: "Urgencias", destino: "Laboratorio" },
  { origen: "Urgencias", destino: "Radiología" },
  { origen: "Urgencias", destino: "UCI" },
  { origen: "Laboratorio", destino: "Radiología" },
  { origen: "Radiología", destino: "Hospitalización" },
  { origen: "UCI", destino: "Quirófano" },
  { origen: "Quirófano", destino: "Hospitalización" },
  { origen: "Hospitalización", destino: "Farmacia" },
  { origen: "Farmacia", destino: "Salida" },
];

const FIXED_POSITIONS = new Map([
  ["triaje", { x: 195, y: 100 }],
  ["urgencias", { x: 335, y: 100 }],
  ["laboratorio", { x: 485, y: 100 }],
  ["radiologia", { x: 610, y: 100 }],
  ["radiología", { x: 610, y: 100 }],
  ["uci", { x: 225, y: 250 }],
  ["quirofano", { x: 375, y: 250 }],
  ["quirófano", { x: 375, y: 250 }],
  ["hospitalizacion", { x: 535, y: 250 }],
  ["hospitalización", { x: 535, y: 250 }],
  ["farmacia", { x: 425, y: 395 }],
  ["salida", { x: 590, y: 395 }],
]);

function normalizeName(value) {
  return String(value || "")
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getPositions(areas) {
  const positions = new Map();
  let fallbackIndex = 0;
  areas.forEach((area) => {
    const normalized = normalizeName(area);
    const fixed = FIXED_POSITIONS.get(normalized) || FIXED_POSITIONS.get(String(area).toLocaleLowerCase("es"));
    if (fixed) {
      positions.set(area, fixed);
    } else {
      const column = fallbackIndex % 4;
      const row = Math.floor(fallbackIndex / 4);
      positions.set(area, { x: 90 + column * 165, y: 70 + row * 130 });
      fallbackIndex += 1;
    }
  });
  return positions;
}

function nodeLabel(area) {
  if (area.length <= 15) return `<text y="4">${escapeHTML(area)}</text>`;
  const words = area.split(" ");
  if (words.length === 1) return `<text y="4" style="font-size:9px">${escapeHTML(area)}</text>`;
  const midpoint = Math.ceil(words.length / 2);
  return `<text><tspan x="0" y="-3">${escapeHTML(words.slice(0, midpoint).join(" "))}</tspan><tspan x="0" y="11">${escapeHTML(words.slice(midpoint).join(" "))}</tspan></text>`;
}

function mapMarkup(areas, connections, route = []) {
  const positions = getPositions(areas);
  const activeNodes = new Set(route.map(normalizeName));
  const activeEdges = new Set();
  for (let index = 0; index < route.length - 1; index += 1) {
    activeEdges.add(routeKey(route[index], route[index + 1]));
  }
  const origin = normalizeName(route[0]);
  const destination = normalizeName(route[route.length - 1]);

  const edgesMarkup = connections
    .map((connection) => {
      const from = positions.get(connection.origen);
      const to = positions.get(connection.destino);
      if (!from || !to) return "";
      const active = activeEdges.has(routeKey(connection.origen, connection.destino));
      return `<line class="map-edge${active ? " is-active" : ""}" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" data-edge="${escapeHTML(routeKey(connection.origen, connection.destino))}" />`;
    })
    .join("");

  const nodesMarkup = areas
    .map((area) => {
      const position = positions.get(area);
      const normalized = normalizeName(area);
      const classes = ["map-node"];
      if (activeNodes.has(normalized)) classes.push("is-active");
      if (normalized === origin) classes.push("is-origin");
      if (normalized === destination) classes.push("is-destination");
      return `
        <g class="${classes.join(" ")}" transform="translate(${position.x} ${position.y})" data-map-area="${escapeHTML(area)}">
          <rect x="-54" y="-23" width="108" height="46" rx="11" />
          ${nodeLabel(area)}
        </g>
      `;
    })
    .join("");

  return `
    <svg class="hospital-map" viewBox="0 0 680 470" role="img" aria-labelledby="map-title map-description">
      <title id="map-title">Mapa esquemático del hospital</title>
      <desc id="map-description">Conexiones internas entre las áreas. La ruta recomendada aparece destacada.</desc>
      <defs>
        <pattern id="map-grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M24 0H0V24" fill="none" stroke="#edf2f4" stroke-width="1" />
        </pattern>
      </defs>
      <rect width="680" height="470" fill="url(#map-grid)" />
      <g aria-hidden="true">${edgesMarkup}</g>
      <g>${nodesMarkup}</g>
    </svg>
  `;
}

function routeResult(data) {
  if (!data?.ruta?.length) {
    return `
      <div class="notice">${icon("info")}<span>Selecciona dos áreas distintas para obtener una ruta recomendada.</span></div>
    `;
  }

  const path = data.ruta
    .map(
      (area, index) =>
        `${index ? '<span class="route-arrow" aria-hidden="true">→</span>' : ""}<span class="route-step">${escapeHTML(area)}</span>`,
    )
    .join("");
  return `
    <div class="route-result" role="status">
      <h3 class="route-result__title">Ruta recomendada</h3>
      <div class="route-result__path">${path}</div>
      <p class="route-result__meta">${escapeHTML(data.texto || `${data.pasos ?? Math.max(0, data.ruta.length - 1)} tramos internos`)}</p>
    </div>
  `;
}

export async function render(container) {
  const state = {
    areas: [],
    connections: [],
    route: null,
  };
  container.innerHTML = renderLoadingState("Preparando el mapa interno…");

  try {
    const payload = await api.getRouteAreas();
    state.areas = payload?.areas?.length ? payload.areas : DEFAULT_AREAS;
    state.connections = payload?.conexiones?.length ? payload.conexiones : FALLBACK_CONNECTIONS;
  } catch {
    state.areas = DEFAULT_AREAS;
    state.connections = FALLBACK_CONNECTIONS;
  }

  const defaultOrigin = state.areas.includes("Urgencias") ? "Urgencias" : state.areas[0];
  const defaultDestination = state.areas.includes("Radiología")
    ? "Radiología"
    : state.areas.find((area) => area !== defaultOrigin) || state.areas[0];

  container.innerHTML = `
    <section class="page" aria-labelledby="routes-title">
      <header class="page-header">
        <div class="page-header__copy">
          <p class="eyebrow">Orientación hospitalaria</p>
          <h1 class="page-title" id="routes-title">Rutas internas</h1>
          <p class="page-description">Encuentra el recorrido con menos conexiones entre las áreas del hospital.</p>
        </div>
      </header>
      <div class="route-layout">
        <article class="card">
          <header class="card__header">
            <div class="card__heading"><h2 class="card__title">Mapa del hospital</h2><p class="card__subtitle">Esquema de conexiones disponibles</p></div>
            <span class="badge badge--info">Ruta destacada</span>
          </header>
          <div id="hospital-map">${mapMarkup(state.areas, state.connections)}</div>
        </article>

        <article class="card">
          <header class="card__header">
            <div class="card__heading"><h2 class="card__title">Calcular ruta interna</h2><p class="card__subtitle">Selecciona el punto de partida y destino</p></div>
          </header>
          <div class="card__body">
            <form id="route-form">
              <div class="form-alert" role="alert" hidden></div>
              <div class="field">
                <span class="field__label">Origen</span>
                <select class="select" name="origin" required autofocus>
                  ${state.areas.map((area) => `<option value="${escapeHTML(area)}"${area === defaultOrigin ? " selected" : ""}>${escapeHTML(area)}</option>`).join("")}
                </select>
              </div>
              <button class="icon-button" style="margin:10px auto" type="button" data-swap aria-label="Intercambiar origen y destino" title="Intercambiar">${icon("movement")}</button>
              <div class="field">
                <span class="field__label">Destino</span>
                <select class="select" name="destination" required>
                  ${state.areas.map((area) => `<option value="${escapeHTML(area)}"${area === defaultDestination ? " selected" : ""}>${escapeHTML(area)}</option>`).join("")}
                </select>
              </div>
              <button class="button button--primary button--wide" style="margin-top:16px" type="submit" data-calculate>${icon("route")} Obtener indicaciones</button>
            </form>
            <div id="route-result">${routeResult(null)}</div>
            <div class="divider"></div>
            <div class="detail-list">
              <div class="detail-item"><dt>Verde</dt><dd>Punto de origen</dd></div>
              <div class="detail-item"><dt>Naranja</dt><dd>Destino</dd></div>
            </div>
          </div>
        </article>
      </div>
    </section>
  `;

  const form = container.querySelector("#route-form");
  const originSelect = form.elements.origin;
  const destinationSelect = form.elements.destination;
  const calculateButton = form.querySelector("[data-calculate]");
  const alert = form.querySelector(".form-alert");
  const mapContainer = container.querySelector("#hospital-map");
  const resultContainer = container.querySelector("#route-result");

  const calculate = async () => {
    alert.hidden = true;
    const origin = originSelect.value;
    const destination = destinationSelect.value;
    if (origin === destination) {
      alert.textContent = "Selecciona un destino distinto del origen.";
      alert.hidden = false;
      return;
    }
    setButtonBusy(calculateButton, true, "Calculando…");
    try {
      const data = await api.calculateRoute(origin, destination);
      state.route = data;
      mapContainer.innerHTML = mapMarkup(state.areas, state.connections, data.ruta || []);
      resultContainer.innerHTML = routeResult(data);
    } catch (error) {
      alert.textContent = error.message;
      alert.hidden = false;
      showToast(error.message, { type: "error" });
    } finally {
      setButtonBusy(calculateButton, false);
    }
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    calculate();
  });
  form.querySelector("[data-swap]").addEventListener("click", () => {
    const origin = originSelect.value;
    originSelect.value = destinationSelect.value;
    destinationSelect.value = origin;
    calculate();
  });

  await calculate();
  return null;
}
