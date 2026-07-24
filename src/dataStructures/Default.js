const defaultModules = [
  {
    id: "array",
    label: "Arreglos",
    icon: "[]",
    description: "Puntajes y catálogo por índice",
  },
  {
    id: "linked-list",
    label: "Lista enlazada",
    icon: "→",
    description: "Ruta de misiones conectadas",
  },
  {
    id: "stack",
    label: "Pila",
    icon: "▤",
    description: "Historial LIFO de acciones",
  },
  {
    id: "queue",
    label: "Cola",
    icon: "≡",
    description: "Turnos FIFO de jugadores",
  },
  {
    id: "tree",
    label: "Árbol",
    icon: "⌘",
    description: "Jerarquía de categorías",
  },
  {
    id: "graph",
    label: "Grafo",
    icon: "⊙",
    description: "Conexiones entre niveles",
  },
];


export const moduleDetails = {
  array: {
    operation: "Acceso por índice",
    complexity: "O(1)",
    description: "Colección rápida para consultar puntajes del videojuego.",
  },
  "linked-list": {
    operation: "Recorrido de misiones",
    complexity: "O(n)",
    description:
      "Cada misión apunta a la siguiente para construir una ruta flexible.",
  },
  stack: {
    operation: "Deshacer acción",
    complexity: "O(1)",
    description:
      "La última acción registrada es la primera que se recupera (LIFO).",
  },
  queue: {
    operation: "Siguiente jugador",
    complexity: "O(1)",
    description: "Los jugadores esperan su turno en orden de llegada (FIFO).",
  },
  tree: {
    operation: "Buscar categoría",
    complexity: "O(log n)",
    description:
      "La clasificación jerárquica organiza géneros y niveles del juego.",
  },
  graph: {
    operation: "Explorar conexión",
    complexity: "O(V + E)",
    description: "Los nodos representan niveles y las aristas sus conexiones.",
  },
};


 export const defaultRecords = [
  {
    id: 1,
    name: "Eclipse Runner",
    category: "Arcade",
    score: 9820,
    status: "Activo",
  },
  {
    id: 2,
    name: "Pixel Quest",
    category: "Aventura",
    score: 8450,
    status: "Activo",
  },
];




export default defaultModules;