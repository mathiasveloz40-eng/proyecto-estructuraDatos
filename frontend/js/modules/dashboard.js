import { api } from "../api.js";
import { icon } from "../icons.js";
import {
  clamp,
  escapeHTML,
  formatDateTime,
  getPriorityName,
  patientName,
  priorityBadge,
  waitLabel,
} from "../utils.js";
import { renderEmptyState, renderErrorState, renderLoadingState, renderTable } from "../components/table.js";
import { showToast } from "../components/toast.js";

function metricCards(metrics = {}) {
  const totalBeds = Number(metrics.camasTotales) || 0;
  const cards = [
    {
      label: "Pacientes en espera",
      value: Number(metrics.pacientesEnEspera) || 0,
      icon: "patients",
      tone: "",
    },
    {
      label: "Atención prioritaria",
      value: Number(metrics.atencionPrioritaria) || 0,
      icon: "emergency",
      tone: "danger",
    },
    {
      label: "Camas disponibles",
      value: Number(metrics.camasDisponibles) || 0,
      icon: "beds",
      tone: "success",
    },
    {
      label: "Ocupación",
      value: `${Math.round(Number(metrics.ocupacionPorcentaje) || 0)} %`,
      icon: "activity",
      tone: Number(metrics.ocupacionPorcentaje) >= 85 ? "warning" : "",
      hint: totalBeds ? `${totalBeds} camas en total` : "",
    },
    {
      label: "Tiempo promedio de espera",
      value: `${Math.round(Number(metrics.tiempoPromedioEsperaMin) || 0)} min`,
      icon: "clock",
      tone: "violet",
    },
    {
      label: "Traslados pendientes",
      value: Number(metrics.trasladosPendientes) || 0,
      icon: "movement",
      tone: "warning",
    },
  ];

  return cards
    .map(
      (card) => `
        <article class="metric-card ${card.tone ? `metric-card--${card.tone}` : ""}">
          <div class="metric-card__top"><span class="metric-card__icon">${icon(card.icon)}</span></div>
          <strong class="metric-card__value">${escapeHTML(card.value)}</strong>
          <span class="metric-card__label">${escapeHTML(card.label)}</span>
          ${card.hint ? `<span class="sr-only">${escapeHTML(card.hint)}</span>` : ""}
        </article>
      `,
    )
    .join("");
}

function waitingTable(rows = []) {
  return renderTable({
    rows: rows.slice(0, 6),
    emptyMessage: "No hay pacientes esperando atención en este momento.",
    columns: [
      {
        label: "Paciente",
        render: (row) => `<span class="table-primary__copy"><strong>${escapeHTML(row.nombre || patientName(row.paciente))}</strong><small>HC ${escapeHTML(row.historiaClinica || row.pacienteId || "—")}</small></span>`,
      },
      {
        label: "Prioridad",
        render: (row) => priorityBadge(row.prioridad, row.prioridadNombre || getPriorityName(row.prioridad)),
      },
      { label: "Espera", render: (row) => `<strong>${waitLabel(row.tiempoEsperaMin)}</strong>` },
      { label: "Ubicación", render: (row) => escapeHTML(row.areaActual || "Urgencias") },
      {
        label: "",
        align: "right",
        render: (row) => `<button class="table-action" type="button" data-view-patient="${escapeHTML(row.pacienteId || row.id)}" aria-label="Ver paciente" title="Ver paciente">${icon("eye")}</button>`,
      },
    ],
  });
}

function occupancyList(areas = []) {
  if (!areas.length) {
    return `<p class="page-description">No hay información de ocupación disponible.</p>`;
  }

  return `<div class="occupancy-list">${areas
    .map((area) => {
      const percentage = clamp(area.porcentaje ?? ((Number(area.ocupadas) / Number(area.total)) * 100));
      const tone = percentage >= 90 ? "progress__bar--critical" : percentage >= 75 ? "progress__bar--high" : "";
      return `
        <div class="occupancy-row">
          <div class="occupancy-row__head">
            <strong>${escapeHTML(area.area)}</strong>
            <span>${escapeHTML(area.ocupadas || 0)} de ${escapeHTML(area.total || 0)} ocupadas · ${Math.round(percentage)} %</span>
          </div>
          <div class="progress" role="progressbar" aria-label="Ocupación de ${escapeHTML(area.area)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(percentage)}">
            <div class="progress__bar ${tone}" style="width:${percentage}%"></div>
          </div>
        </div>
      `;
    })
    .join("")}</div>`;
}

function recentMovements(movements = []) {
  if (!movements.length) {
    return `<p class="page-description">No hay movimientos recientes para mostrar.</p>`;
  }

  return `<div class="timeline">${movements.slice(0, 6)
    .map(
      (movement) => `
        <div class="timeline-item">
          <span class="timeline-item__rail" aria-hidden="true"></span>
          <div class="timeline-item__copy">
            <strong>${escapeHTML(movement.pacienteNombre || movement.nombrePaciente || `Paciente ${movement.pacienteId}`)}</strong>
            <p>${escapeHTML(movement.descripcion || `Traslado a ${movement.area || movement.areaDestino || "una nueva área"}`)}</p>
          </div>
          <time class="timeline-item__time">${formatDateTime(movement.fecha)}</time>
        </div>
      `,
    )
    .join("")}</div>`;
}

function alertsList(alerts = []) {
  if (!alerts.length) {
    return `
      <div class="alert-item alert-item--info">
        <span class="alert-item__icon">${icon("check")}</span>
        <div class="alert-item__copy"><h4>Operación estable</h4><p>No hay alertas activas en este momento.</p></div>
      </div>
    `;
  }

  return `<div class="alert-list">${alerts
    .map((alert) => {
      const type = String(alert.tipo || "warning").toLowerCase();
      const cssType = /error|danger|crit/.test(type) ? "danger" : /info|ok|success/.test(type) ? "info" : "warning";
      return `
        <div class="alert-item alert-item--${cssType}">
          <span class="alert-item__icon">${icon(cssType === "info" ? "info" : "warning")}</span>
          <div class="alert-item__copy">
            <h4>${escapeHTML(alert.titulo || "Aviso operativo")}</h4>
            <p>${escapeHTML(alert.detalle || alert.descripcion || "Revisa la operación del área.")}</p>
          </div>
        </div>
      `;
    })
    .join("")}</div>`;
}

function dashboardMarkup(data) {
  return `
    <section class="page" aria-labelledby="dashboard-title">
      <header class="page-header">
        <div class="page-header__copy">
          <p class="eyebrow">Visión operativa</p>
          <h1 class="page-title" id="dashboard-title">Resumen del hospital</h1>
          <p class="page-description">Estado actualizado de atención, capacidad y traslados internos.</p>
        </div>
        <div class="page-header__actions">
          <button class="button button--secondary" type="button" data-refresh>${icon("refresh")} Actualizar</button>
          <button class="button button--primary" type="button" data-nav="/urgencias">${icon("emergency")} Abrir urgencias</button>
        </div>
      </header>

      <div class="metric-grid">${metricCards(data.metricas)}</div>

      <div class="section-grid section-grid--two">
        <article class="card">
          <header class="card__header">
            <div class="card__heading"><h2 class="card__title">Pacientes esperando atención</h2><p class="card__subtitle">Ordenados por prioridad y tiempo de llegada</p></div>
            <button class="button button--ghost button--small" type="button" data-nav="/urgencias">Ver lista ${icon("arrowRight")}</button>
          </header>
          <div class="card__body card__body--flush">${waitingTable(data.pacientesEnEspera)}</div>
        </article>

        <article class="card">
          <header class="card__header">
            <div class="card__heading"><h2 class="card__title">Ocupación por departamento</h2><p class="card__subtitle">Capacidad de camas por área</p></div>
            <button class="button button--ghost button--small" type="button" data-nav="/camas">Administrar ${icon("arrowRight")}</button>
          </header>
          <div class="card__body">${occupancyList(data.camasPorArea)}</div>
        </article>
      </div>

      <div class="section-grid section-grid--two" style="margin-top:20px">
        <article class="card">
          <header class="card__header">
            <div class="card__heading"><h2 class="card__title">Últimos movimientos</h2><p class="card__subtitle">Actividad registrada en áreas hospitalarias</p></div>
            <button class="button button--ghost button--small" type="button" data-nav="/movimientos">Ver historial ${icon("arrowRight")}</button>
          </header>
          <div class="card__body">${recentMovements(data.movimientosRecientes)}</div>
        </article>

        <article class="card">
          <header class="card__header">
            <div class="card__heading"><h2 class="card__title">Alertas operativas</h2><p class="card__subtitle">Situaciones que requieren seguimiento</p></div>
          </header>
          <div class="card__body">${alertsList(data.alertas)}</div>
        </article>
      </div>
    </section>
  `;
}

export async function render(container, context = {}) {
  let active = true;
  container.innerHTML = renderLoadingState("Preparando el resumen operativo…");

  const load = async ({ quiet = false } = {}) => {
    const refreshButton = container.querySelector("[data-refresh]");
    if (refreshButton) refreshButton.disabled = true;
    if (!quiet && !container.querySelector(".page")) {
      container.innerHTML = renderLoadingState("Actualizando indicadores…");
    }

    try {
      const data = await api.getDashboard();
      if (!active || !container.isConnected) return;
      container.innerHTML = dashboardMarkup({
        metricas: data?.metricas || {},
        pacientesEnEspera: data?.pacientesEnEspera || [],
        camasPorArea: data?.camasPorArea || [],
        movimientosRecientes: data?.movimientosRecientes || [],
        alertas: data?.alertas || [],
      });
      bindActions();
      context.setOnline?.(true);
      if (quiet) showToast("El resumen fue actualizado.", { type: "success", duration: 2500 });
    } catch (error) {
      if (!active || !container.isConnected) return;
      context.setOnline?.(false);
      container.innerHTML = renderErrorState(error.message);
      container.querySelector("[data-retry]")?.addEventListener("click", () => load());
    }
  };

  const bindActions = () => {
    container.querySelector("[data-refresh]")?.addEventListener("click", () => load({ quiet: true }));
    container.querySelectorAll("[data-nav]").forEach((button) => {
      button.addEventListener("click", () => context.navigate?.(button.dataset.nav));
    });
    container.querySelectorAll("[data-view-patient]").forEach((button) => {
      button.addEventListener("click", () =>
        context.navigate?.("/pacientes", { detalle: button.dataset.viewPatient }),
      );
    });
  };

  await load();
  return () => {
    active = false;
  };
}
