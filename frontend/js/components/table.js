import { escapeHTML } from "../utils.js";
import { icon } from "../icons.js";

export function renderTable({ columns, rows, rowKey = "id", emptyMessage = "No hay registros para mostrar", caption = "" }) {
  if (!rows?.length) return renderEmptyState(emptyMessage);

  const headings = columns
    .map((column) => `<th scope="col"${column.align === "right" ? ' style="text-align:right"' : ""}>${escapeHTML(column.label)}</th>`)
    .join("");

  const body = rows
    .map((row, rowIndex) => {
      const cells = columns
        .map((column) => {
          const value = column.render ? column.render(row, rowIndex) : escapeHTML(row[column.key] ?? "—");
          const className = column.className ? ` class="${column.className}"` : "";
          const align = column.align === "right" ? ' style="text-align:right"' : "";
          return `<td data-label="${escapeHTML(column.label)}"${className}${align}>${value}</td>`;
        })
        .join("");
      return `<tr data-row-id="${escapeHTML(row[rowKey] ?? rowIndex)}">${cells}</tr>`;
    })
    .join("");

  return `
    <div class="data-table-wrap">
      <table class="data-table">
        <thead><tr>${headings}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>
    ${caption ? `<div class="table-caption">${escapeHTML(caption)}</div>` : ""}
  `;
}

export function renderEmptyState(message, options = {}) {
  return `
    <div class="empty-state">
      <div class="empty-state__content">
        <span class="state-icon">${icon(options.icon || "file")}</span>
        <h3>${escapeHTML(options.title || "Sin resultados")}</h3>
        <p>${escapeHTML(message)}</p>
        ${options.action ? `<button class="button button--primary" type="button" data-empty-action>${escapeHTML(options.action)}</button>` : ""}
      </div>
    </div>
  `;
}

export function renderErrorState(message = "No fue posible cargar la información.", retryLabel = "Reintentar") {
  return `
    <div class="state-panel" role="alert">
      <div class="state-panel__content">
        <span class="state-icon state-icon--error">${icon("warning")}</span>
        <h2>Ocurrió un inconveniente</h2>
        <p>${escapeHTML(message)}</p>
        <button class="button button--secondary" type="button" data-retry>${escapeHTML(retryLabel)}</button>
      </div>
    </div>
  `;
}

export function renderLoadingState(label = "Cargando información…") {
  return `<div class="page-loading" role="status"><span class="spinner" aria-hidden="true"></span><span>${escapeHTML(label)}</span></div>`;
}
