/**
 * Arreglo controlado para el catálogo de videojuegos.
 * Incluye búsqueda lineal y Quick Sort implementados manualmente.
 */
export class ArrayStructure {
  constructor(initialItems = []) {
    this.items = [...initialItems]
  }

  get size() {
    return this.items.length
  }

  insert(item, index = this.items.length) {
    if (index < 0 || index > this.items.length) throw new RangeError('Índice fuera de rango')
    this.items.splice(index, 0, item)
    return item
  }

  findIndex(predicate) {
    for (let index = 0; index < this.items.length; index += 1) {
      if (predicate(this.items[index], index)) return index
    }
    return -1
  }

  find(predicate) {
    const index = this.findIndex(predicate)
    return index === -1 ? undefined : this.items[index]
  }

  update(predicate, updates) {
    const index = this.findIndex(predicate)
    if (index === -1) return undefined
    const current = this.items[index]
    this.items[index] = typeof updates === 'function'
      ? updates(current)
      : { ...current, ...updates }
    return this.items[index]
  }

  remove(predicate) {
    const index = this.findIndex(predicate)
    if (index === -1) return undefined
    return this.items.splice(index, 1)[0]
  }

  searchLinear(query, fields = []) {
    const normalizedQuery = String(query).trim().toLowerCase()
    if (!normalizedQuery) return this.toArray()
    return this.items.filter((item) => fields.some((field) => String(item[field] ?? '').toLowerCase().includes(normalizedQuery)))
  }

  sort(comparator) {
    this.items = this.quickSort(this.items, comparator)
    return this.toArray()
  }

  quickSort(items, comparator) {
    if (items.length <= 1) return [...items]
    const pivot = items[items.length - 1]
    const lower = []
    const greater = []
    for (let index = 0; index < items.length - 1; index += 1) {
      if (comparator(items[index], pivot) <= 0) lower.push(items[index])
      else greater.push(items[index])
    }
    return [...this.quickSort(lower, comparator), pivot, ...this.quickSort(greater, comparator)]
  }

  toArray() {
    return [...this.items]
  }
}

