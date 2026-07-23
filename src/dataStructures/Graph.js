export class Graph {
  constructor() {
    this.adjacency = new Map()
  }

  addVertex(vertex) {
    if (!this.adjacency.has(vertex)) this.adjacency.set(vertex, [])
    return vertex
  }

  addEdge(from, to, bidirectional = true) {
    this.addVertex(from)
    this.addVertex(to)
    if (!this.adjacency.get(from).includes(to)) this.adjacency.get(from).push(to)
    if (bidirectional && !this.adjacency.get(to).includes(from)) this.adjacency.get(to).push(from)
  }

  removeEdge(from, to, bidirectional = true) {
    if (this.adjacency.has(from)) this.adjacency.set(from, this.adjacency.get(from).filter((vertex) => vertex !== to))
    if (bidirectional && this.adjacency.has(to)) this.adjacency.set(to, this.adjacency.get(to).filter((vertex) => vertex !== from))
  }

  neighbors(vertex) {
    return this.adjacency.has(vertex) ? [...this.adjacency.get(vertex)] : []
  }

  breadthFirstSearch(start) {
    if (!this.adjacency.has(start)) return []
    const visited = new Set([start])
    const pending = [start]
    const result = []
    while (pending.length) {
      const current = pending.shift()
      result.push(current)
      this.neighbors(current).forEach((neighbor) => {
        if (!visited.has(neighbor)) {
          visited.add(neighbor)
          pending.push(neighbor)
        }
      })
    }
    return result
  }

  depthFirstSearch(start) {
    const result = []
    const visited = new Set()
    const visit = (vertex) => {
      if (!this.adjacency.has(vertex) || visited.has(vertex)) return
      visited.add(vertex)
      result.push(vertex)
      this.neighbors(vertex).forEach(visit)
    }
    visit(start)
    return result
  }

  toObject() {
    return Object.fromEntries([...this.adjacency.entries()].map(([vertex, neighbors]) => [vertex, [...neighbors]]))
  }
}

