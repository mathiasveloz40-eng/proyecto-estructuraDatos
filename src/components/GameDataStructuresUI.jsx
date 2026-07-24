import { useState } from "react";
import { createGameDataService } from "../dataStructures/gameDataService";
import "../App.css";
import defaultModules from "../dataStructures/Default";
import {defaultRecords} from "../dataStructures/Default"
import ModuleView from "./ModuleView";
import GraphPreview from "./GraphPreview";


function initials(name = "Jugador") {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function ModuleIcon({ icon }) {
  return (
    <span className="module-icon" aria-hidden="true">
      {icon}
    </span>
  );
}

function GameDataStructuresUI({
  projectName = "Nexus Arcade",
  projectSubtitle = "Laboratorio de estructuras de datos",
  gameName = "Videojuego",
  userName = "Jugador",
  studentNames = [],
  initialRecords = defaultRecords,
  modules = defaultModules,
  children,
}) {
  const [service] = useState(() => createGameDataService(initialRecords));
  const [activeModule, setActiveModule] = useState(modules[0]?.id || "array");
  const [, setVersion] = useState(0);
  const selectedModule =
    modules.find((module) => module.id === activeModule) ||
    modules[0] ||
    defaultModules[0];
  const data = {
    games: service.getGames(),
    missions: service.getMissions(),
    actions: service.getActions(),
    players: service.getPlayers(),
    categories: service.getCategories(),
    graph: service.getGraph(),
  };
  const refresh = () => setVersion((current) => current + 1);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">NX</div>
          <div>
            <p className="brand-title">{projectName}</p>
            <p className="brand-caption">{projectSubtitle}</p>
          </div>
        </div>
        <div className="nav-label">Estructuras</div>
        <nav className="nav-list" aria-label="Módulos de estructuras de datos">
          {modules.map((module, index) => (
            <button
              className={`nav-item ${activeModule === module.id ? "active" : ""}`}
              type="button"
              key={module.id}
              onClick={() => setActiveModule(module.id)}
            >
              <span className="nav-icon">
                <ModuleIcon icon={module.icon} />
              </span>
              <span>{module.label}</span>
              <span className="module-index">0{index + 1}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="eyebrow">Equipo de desarrollo</div>
          {studentNames.map((student) => (
            <div className="team-line" key={student}>
              <span className="avatar">{initials(student)}</span>
              {student}
            </div>
          ))}
        </div>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumbs">
            PROYECTO / <strong>{gameName.toUpperCase()}</strong> / PANEL
          </div>
          <div className="topbar-actions">
            <span className="status-dot" />
            <span className="live-status">SISTEMA EN LÍNEA</span>
            <button
              className="profile"
              type="button"
              title={`Perfil de ${userName}`}
            >
              {initials(userName)}
            </button>
          </div>
        </header>
        <div className="page-heading">
          <div>
            <div className="eyebrow">Interfaz gráfica - Proyecto </div>
            <h1>
              Usa Nexus Arcade
              <br />
            </h1>
            <p>Panel de control</p>
          </div>
          <div className="heading-meta">
            <div className="meta-chip">
              <b>06</b>estructuras
            </div>
            <div className="meta-chip">
              <b>100</b>puntos rubricados
            </div>
          </div>
        </div>
        <section className="stats-grid" aria-label="Resumen del proyecto">
          <div className="stat-card">
            <span className="stat-label">Módulo activo</span>
            <strong className="stat-value">{selectedModule.label}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">Registros CRUD</span>
            <strong className="stat-value">
              {data.games.length.toString().padStart(2, "0")}
            </strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">Estructuras</span>
            <strong className="stat-value">
              {modules.length.toString().padStart(2, "0")}
            </strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">Estado</span>
            <strong className="stat-value">LISTO</strong>
          </div>
        </section>
        <div className="dashboard-grid">
          <section className="panel">
            <div className="panel-header">
              <div>
                <div className="eyebrow">Mapa de navegación</div>
                <h2 className="panel-title">Módulos del sistema</h2>
                <p className="panel-subtitle">
                  Selecciona una estructura para ejecutar sus operaciones.
                </p>
              </div>
              <span className="panel-tag">{modules.length} disponibles</span>
            </div>
            <div className="module-grid">
              {modules.map((module, index) => (
                <button
                  className={`module-card ${selectedModule.id === module.id ? "selected" : ""}`}
                  type="button"
                  key={module.id}
                  onClick={() => setActiveModule(module.id)}
                >
                  <div className="module-card-top">
                    <ModuleIcon icon={module.icon} />
                    <span className="module-index">0{index + 1}</span>
                  </div>
                  <h3>{module.label}</h3>
                  <p>{module.description}</p>
                </button>
              ))}
            </div>
          </section>
          <section className="panel">
            <div className="panel-header">
              <div>
                <div className="eyebrow">Grafo de progreso</div>
                <h2 className="panel-title">Mapa de conexiones</h2>
                <p className="panel-subtitle">
                  Grafo real de niveles del videojuego.
                </p>
              </div>
            </div>
            <GraphPreview graph={data.graph} />
            <div className="graph-legend">
              <span className="legend-item">
                <span className="legend-dot" />
                nivel
              </span>
              <span className="legend-item">
                <span className="legend-dot violet" />
                conectado
              </span>
              <span className="legend-item">
                <span className="legend-dot orange" />
                ruta
              </span>
            </div>
          </section>
        </div>
        <div style={{ marginTop: 14 }}>
          <ModuleView
            module={selectedModule}
            data={data}
            service={service}
            refresh={refresh}
          />
        </div>
        {children}
        <div className="footer-note">
          <p> &copy;2026 NEXUS ARCADE. Todos los derechos reservados</p>
          <p> Hecho por: Juan Espin y Mathias Veloz</p>
        </div>
      </main>
    </div>
  );
}


export default GameDataStructuresUI;
