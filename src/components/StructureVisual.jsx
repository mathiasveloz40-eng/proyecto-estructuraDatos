import GraphPreview from "./GraphPreview";

export default function StructureVisual({ id, data, graph, traversal }) {
  if (id === "stack")
    return (
      <div className="visual-board">
        <div className="stack-list">
          {data.actions.map((item, index) => (
            <div
              className={`data-node ${index === 0 ? "current-node" : ""}`}
              key={`${item}-${index}`}
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    );
  if (id === "queue")
    return (
      <div className="visual-board">
        <div className="queue-list">
          {data.players.map((item) => (
            <div className="data-node" key={item}>
              {item}
            </div>
          ))}
        </div>
      </div>
    );
  if (id === "tree")
    return (
      <div className="visual-board">
        <div className="tree-board">
          <div className="tree-level">
            <div className="data-node">Juegos</div>
          </div>
          <div className="tree-level tree-branch">
            {data.categories.slice(0, 2).map((item) => (
              <div className="data-node" key={item}>
                {item}
              </div>
            ))}
          </div>
          <div className="tree-level tree-branch">
            {data.categories.slice(2, 5).map((item) => (
              <div className="data-node" key={item}>
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  if (id === "graph")
    return (
      <div className="visual-board">
        <div style={{ width: "100%" }}>
          <GraphPreview graph={graph} />
          {traversal.length > 0 && (
            <div className="helper-note">
              Recorrido: {traversal.join(" → ")}
            </div>
          )}
        </div>
      </div>
    );
  if (id === "linked-list")
    return (
      <div className="visual-board">
        <div className="list-items">
          {data.missions.map((item, index) => (
            <div className="list-item" key={`${item}-${index}`}>
              <span className="data-node">{item}</span>
              <span className="node-arrow">
                {index === data.missions.length - 1 ? "∅" : "→"}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  return (
    <div className="visual-board">
      <div className="node-row">
        {data.games.map((item, index) => (
          <span className="data-node" key={item.id}>
            [{index}] {item.score}
          </span>
        ))}
      </div>
    </div>
  );
}