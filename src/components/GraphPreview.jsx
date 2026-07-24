export default function GraphPreview({ graph }) {
  const vertices = Object.keys(graph);
  const positions = ["a", "b", "c", "d"];
  return (
    <div className="graph-preview">
      {vertices.slice(0, 4).map((vertex, index) => (
        <span
          className={`node ${positions[index]}`}
          key={vertex}
          title={`Conecta con: ${graph[vertex].join(", ") || "ninguno"}`}
        >
          {vertex.slice(0, 2).toUpperCase()}
        </span>
      ))}
      {vertices.length > 1 && (
        <>
          <span className="edge one" />
          <span className="edge two" />
          <span className="edge three" />
        </>
      )}
    </div>
  );
}