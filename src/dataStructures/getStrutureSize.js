export default function getStructureSize(id, data) {
  if (id === "linked-list") return data.missions.length;
  if (id === "stack") return data.actions.length;
  if (id === "queue") return data.players.length;
  if (id === "tree") return data.categories.length;
  if (id === "graph") return Object.keys(data.graph).length;
  return data.games.length;
}