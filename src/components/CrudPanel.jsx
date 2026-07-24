import { useState } from "react";



export default function CrudPanel({ service, refresh }) {
  const [query, setQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("desc");
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const emptyDraft = {
    name: "",
    category: "Arcade",
    score: 0,
    status: "Activo",
  };
  const [draft, setDraft] = useState(emptyDraft);
  const visibleRecords = service.searchGames(query);

  const updateDraft = (field, value) =>
    setDraft((current) => ({ ...current, [field]: value }));

  const submit = (event) => {
    event.preventDefault();
    if (!draft.name.trim()) {
        return alert("Por favor rellene los campos vacios")
    };
    if (editingId === null) {
      service.createGame({
        ...draft,
        name: draft.name.trim(),
        score: Number(draft.score) || 0,
      });
      alert("El juego ha sido creado")
      setMessage("Registro creado con el arreglo");
    } else {
      service.updateGame(editingId, {
        ...draft,
        name: draft.name.trim(),
        score: Number(draft.score) || 0,
      });
      alert("registro actualizado correctamente")
      setMessage("Registro actualizado");
    }
    setDraft(emptyDraft);
    setEditingId(null);
    refresh();
  };
  const edit = (record) => {
    setEditingId(record.id);
    setDraft({
      name: record.name,
      category: record.category,
      score: record.score,
      status: record.status,
    });
    setMessage(`Editando ${record.name}`);
  };
  const remove = (id) => {
    service.deleteGame(id);
    setMessage("Registro eliminado");
    refresh();
  };
  const sort = () => {
    service.sortGames(sortOrder);
    setSortOrder((current) => (current === "desc" ? "asc" : "desc"));
    setMessage("Ordenamiento Quick Sort aplicado");
    refresh();
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <div className="eyebrow">Módulo 01 / CRUD</div>
          <h2 className="panel-title">Catálogo de videojuegos</h2>
          <p className="panel-subtitle">
            Arreglo con crear, consultar, actualizar, eliminar, buscar y
            ordenar.
          </p>
        </div>
        <span className="panel-tag">Arreglo · Quick Sort</span>
      </div>
      <form className="form-grid" onSubmit={submit}>
        <div className="field">
          <label htmlFor="game-name">Nombre del juego</label>
          <input
            id="game-name"
            className="field-input"
            value={draft.name}
            onChange={(event) => updateDraft("name", event.target.value)}
            placeholder="Ej. Starfall"
          />
        </div>
        <div className="field">
          <label htmlFor="game-category">Categoría</label>
          <select
            id="game-category"
            className="field-select"
            value={draft.category}
            onChange={(event) => updateDraft("category", event.target.value)}
          >
            <option>Arcade</option>
            <option>Aventura</option>
            <option>Estrategia</option>
            <option>RPG</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="game-score">Puntaje</label>
          <input
            id="game-score"
            className="field-input"
            type="number"
            min="0"
            value={draft.score}
            onChange={(event) => updateDraft("score", event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="game-status">Estado</label>
          <select
            id="game-status"
            className="field-select"
            value={draft.status}
            onChange={(event) => updateDraft("status", event.target.value)}
          >
            <option>Activo</option>
            <option>En pausa</option>
            <option>Nuevo</option>
          </select>
        </div>
        <div className="field" style={{ alignSelf: "end" }}>
          <button className="button" type="submit">
            {editingId === null ? "+ Crear registro" : "Guardar cambios"}
          </button>
        </div>
        {editingId !== null && (
          <div className="field" style={{ alignSelf: "end" }}>
            <button
              className="button secondary"
              type="button"
              onClick={() => {
                setEditingId(null);
                setDraft(emptyDraft);
              }}
            >
              Cancelar edición
            </button>
          </div>
        )}
      </form>
      <div className="toolbar">
        <span className="eyebrow">
          {message || `${visibleRecords.length} registros encontrados`}
        </span>
        <div className="toolbar-actions">
          <input
            className="search-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Búsqueda lineal..."
            aria-label="Buscar videojuego"
          />
          <button className="button secondary" type="button" onClick={sort}>
            Ordenar {sortOrder === "desc" ? "↓" : "↑"}
          </button>
        </div>
      </div>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Videojuego</th>
              <th>Categoría</th>
              <th>Puntaje</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {visibleRecords.length ? (
              visibleRecords.map((record) => (
                <tr key={record.id}>
                  <td>{record.name}</td>
                  <td>{record.category}</td>
                  <td>{Number(record.score).toLocaleString()}</td>
                  <td>
                    <span
                      className={`badge ${record.status === "En pausa" ? "paused" : ""}`}
                    >
                      {record.status}
                    </span>
                  </td>
                  <td>
                    <div className="table-actions">
                      <button
                        className="icon-button"
                        type="button"
                        onClick={() => edit(record)}
                      >
                        Editar
                      </button>
                      <button
                        className="icon-button"
                        type="button"
                        onClick={() => remove(record.id)}
                      >
                        Borrar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5">
                  <div className="empty-state">
                    No hay registros para esta búsqueda.
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}