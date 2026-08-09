const ROUTES = new Map([
  ["/resumen", { key: "dashboard", title: "Resumen" }],
  ["/urgencias", { key: "urgencias", title: "Urgencias" }],
  ["/pacientes", { key: "pacientes", title: "Pacientes" }],
  ["/camas", { key: "camas", title: "Camas" }],
  ["/movimientos", { key: "movimientos", title: "Movimientos" }],
  ["/rutas", { key: "rutas", title: "Rutas internas" }],
]);

function parseHash() {
  const raw = window.location.hash.replace(/^#/, "") || "/resumen";
  const [pathPart, queryPart = ""] = raw.split("?");
  const path = pathPart.startsWith("/") ? pathPart : `/${pathPart}`;
  const definition = ROUTES.get(path) || ROUTES.get("/resumen");

  return {
    ...definition,
    path: ROUTES.has(path) ? path : "/resumen",
    query: new URLSearchParams(queryPart),
  };
}

class Router {
  constructor() {
    this.listeners = new Set();
    this.handleHashChange = this.handleHashChange.bind(this);
  }

  start() {
    window.addEventListener("hashchange", this.handleHashChange);
    const rawPath = window.location.hash.replace(/^#/, "").split("?")[0] || "/resumen";
    const normalizedPath = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
    if (!window.location.hash || !ROUTES.has(normalizedPath)) {
      window.history.replaceState(null, "", "#/resumen");
    }
    this.handleHashChange();
  }

  stop() {
    window.removeEventListener("hashchange", this.handleHashChange);
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  navigate(path, params = {}) {
    const safePath = ROUTES.has(path) ? path : "/resumen";
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        query.set(key, String(value));
      }
    });
    const suffix = query.toString() ? `?${query.toString()}` : "";
    window.location.hash = `${safePath}${suffix}`;
  }

  current() {
    return parseHash();
  }

  handleHashChange() {
    const route = parseHash();
    document.title = `${route.title} | Hospital Flow`;
    this.listeners.forEach((listener) => listener(route));
  }
}

export const router = new Router();
export { ROUTES };
