import { useState } from "react";
import getStructureSize from "../dataStructures/getStrutureSize";
import StructureVisual from "./StructureVisual";

export default function StructurePanel({ module, details, data, service, refresh }) {
  const [input, setInput] = useState("");
  const [secondaryInput, setSecondaryInput] = useState("");
  const [message, setMessage] = useState("");
  const [traversal, setTraversal] = useState([]);
  const setActionMessage = (text) => setMessage(text);

  const runAction = (callback, successMessage) => {
    const result = callback();
    if (result !== false) {
      setActionMessage(successMessage);
      refresh();
    }
  };

  const renderControls = () => {
    if (module.id === "linked-list")
      return (
        <>
          <div className="inline-controls">
            <input
              className="field-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Nueva misión"
            />
            <input
              className="field-input small-field"
              type="number"
              min="0"
              max={data.missions.length}
              value={secondaryInput}
              onChange={(event) => setSecondaryInput(event.target.value)}
              placeholder="Índice"
            />
            <button
              className="button"
              type="button"
              onClick={() => {
                if (!input.trim()) return;
                runAction(
                  () => service.addMission(input.trim(), secondaryInput),
                  "Nodo insertado en la lista",
                );
                setInput("");
                setSecondaryInput("");
              }}
            >
              Insertar
            </button>
            <button
              className="button secondary"
              type="button"
              onClick={() => {
                const result = service.searchMission(input);
                setActionMessage(
                  result ? `Encontrado: ${result}` : "Misión no encontrada",
                );
              }}
            >
              Buscar
            </button>
            <button
              className="button danger"
              type="button"
              onClick={() => {
                const result = service.removeMission(input);
                setActionMessage(
                  result ? "Nodo eliminado" : "Nodo no encontrado",
                );
                refresh();
              }}
            >
              Eliminar
            </button>
          </div>
        </>
      );
    if (module.id === "stack")
      return (
        <div className="inline-controls">
          <input
            className="field-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Acción del jugador"
          />
          <button
            className="button"
            type="button"
            onClick={() => {
              if (!input.trim()) return;
              runAction(
                () => service.pushAction(input.trim()),
                "Elemento apilado (PUSH)",
              );
              setInput("");
            }}
          >
            PUSH
          </button>
          <button
            className="button secondary"
            type="button"
            onClick={() => {
              const result = service.popAction();
              setActionMessage(
                result.removed
                  ? `Elemento retirado: ${result.removed} (POP)`
                  : "La pila está vacía",
              );
              refresh();
            }}
          >
            POP
          </button>
        </div>
      );
    if (module.id === "queue")
      return (
        <div className="inline-controls">
          <input
            className="field-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Nombre del jugador"
          />
          <button
            className="button"
            type="button"
            onClick={() => {
              if (!input.trim()) return;
              runAction(
                () => service.enqueuePlayer(input.trim()),
                "Jugador agregado al final (ENQUEUE)",
              );
              setInput("");
            }}
          >
            ENQUEUE
          </button>
          <button
            className="button secondary"
            type="button"
            onClick={() => {
              const result = service.dequeuePlayer();
              setActionMessage(
                result.removed
                  ? `Turno atendido: ${result.removed} (DEQUEUE)`
                  : "La cola está vacía",
              );
              refresh();
            }}
          >
            DEQUEUE
          </button>
        </div>
      );
    if (module.id === "tree")
      return (
        <div className="inline-controls">
          <input
            className="field-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Nueva categoría"
          />
          <button
            className="button"
            type="button"
            onClick={() => {
              if (!input.trim()) return;
              runAction(
                () => service.addCategory(input.trim()),
                "Categoría insertada en el árbol",
              );
              setInput("");
            }}
          >
            Insertar
          </button>
          <button
            className="button secondary"
            type="button"
            onClick={() => {
              const result = service.searchCategory(input.trim());
              setActionMessage(
                result ? `Encontrada: ${result}` : "Categoría no encontrada",
              );
            }}
          >
            Buscar
          </button>
        </div>
      );
    if (module.id === "graph")
      return (
        <>
          <div className="inline-controls">
            <input
              className="field-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Nivel origen"
            />
            <input
              className="field-input"
              value={secondaryInput}
              onChange={(event) => setSecondaryInput(event.target.value)}
              placeholder="Nivel destino"
            />
            <button
              className="button"
              type="button"
              onClick={() => {
                if (!input.trim()) return;
                runAction(
                  () => service.addLevel(input.trim()),
                  "Vértice agregado",
                );
                setInput("");
              }}
            >
              Agregar nivel
            </button>
            <button
              className="button secondary"
              type="button"
              onClick={() => {
                if (!input.trim() || !secondaryInput.trim()) return;
                runAction(
                  () =>
                    service.connectLevels(input.trim(), secondaryInput.trim()),
                  "Arista conectada",
                );
                setInput("");
                setSecondaryInput("");
              }}
            >
              Conectar
            </button>
          </div>
          <div className="inline-controls">
            <input
              className="field-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Nivel inicial para recorrer"
            />
            <button
              className="button secondary"
              type="button"
              onClick={() =>
                setTraversal(service.exploreLevels(input.trim(), "bfs"))
              }
            >
              BFS
            </button>
            <button
              className="button secondary"
              type="button"
              onClick={() =>
                setTraversal(service.exploreLevels(input.trim(), "dfs"))
              }
            >
              DFS
            </button>
          </div>
        </>
      );
    return null;
  };

  return (
    <div className="structure-layout">
      <div className="panel">
        <div className="panel-header">
          <div>
            <div className="eyebrow">Módulo / operaciones reales</div>
            <h2 className="panel-title">{module.label}</h2>
            <p className="panel-subtitle">{details.description}</p>
          </div>
          <span className="panel-tag">{details.operation}</span>
        </div>
        <div className="operation-bar">{renderControls()}</div>
        <StructureVisual
          id={module.id}
          data={data}
          graph={data.graph}
          traversal={traversal}
        />
        <p className="visual-caption">
          {message || "Ejecuta una operación para actualizar esta estructura."}
        </p>
      </div>
      <div className="panel">
        <div className="eyebrow">Ficha técnica</div>
        <h2 className="panel-title">Operaciones conectadas</h2>
        <dl className="info-list">
          <div className="info-row">
            <dt>Complejidad base</dt>
            <dd>{details.complexity}</dd>
          </div>
          <div className="info-row">
            <dt>Elementos actuales</dt>
            <dd>{getStructureSize(module.id, data)}</dd>
          </div>
          <div className="info-row">
            <dt>Recorrido</dt>
            <dd>
              {module.id === "graph" && traversal.length
                ? traversal.join(" → ")
                : "Disponible"}
            </dd>
          </div>
          <div className="info-row">
            <dt>Estado</dt>
            <dd style={{ color: "var(--cyan)" }}>CONECTADO</dd>
          </div>
        </dl>
        <div className="helper-note">
          La estructura se instancia en JavaScript puro y la interfaz solo
          refleja su estado actual.
        </div>
      </div>
    </div>
  );
}