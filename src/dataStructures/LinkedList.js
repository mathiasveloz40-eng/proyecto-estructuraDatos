class LinkedNode {
  constructor(value) {
    this.value = value
    this.next = null
  }
}

export class LinkedList {
  constructor(values = []) {
    this.head = null
    this.tail = null
    this.length = 0
    values.forEach((value) => this.append(value))
  }

  append(value) {
    const node = new LinkedNode(value)
    if (!this.head) this.head = node
    else this.tail.next = node
    this.tail = node
    this.length += 1
    return value
  }

  prepend(value) {
    const node = new LinkedNode(value)
    node.next = this.head
    this.head = node
    if (!this.tail) this.tail = node
    this.length += 1
    return value
  }

  insertAt(index, value) {
    if (index < 0 || index > this.length) throw new RangeError('Índice fuera de rango')
    if (index === 0) return this.prepend(value)
    if (index === this.length) return this.append(value)
    const previous = this.nodeAt(index - 1)
    const node = new LinkedNode(value)
    node.next = previous.next
    previous.next = node
    this.length += 1
    return value
  }

  nodeAt(index) {
    if (index < 0 || index >= this.length) return null
    let current = this.head
    for (let position = 0; position < index; position += 1) current = current.next
    return current
  }

  removeAt(index) {
    if (index < 0 || index >= this.length || !this.head) return undefined
    if (index === 0) {
      const removed = this.head.value
      this.head = this.head.next
      this.length -= 1
      if (this.length === 0) this.tail = null
      return removed
    }
    const previous = this.nodeAt(index - 1)
    const removed = previous.next.value
    previous.next = previous.next.next
    this.length -= 1
    if (index === this.length) this.tail = previous
    return removed
  }

  removeFirst(predicate) {
    let current = this.head
    let previous = null
    while (current) {
      if (predicate(current.value)) {
        if (previous) previous.next = current.next
        else this.head = current.next
        if (current === this.tail) this.tail = previous
        this.length -= 1
        return current.value
      }
      previous = current
      current = current.next
    }
    return undefined
  }

  find(predicate) {
    let current = this.head
    while (current) {
      if (predicate(current.value)) return current.value
      current = current.next
    }
    return undefined
  }

  toArray() {
    const values = []
    let current = this.head
    while (current) {
      values.push(current.value)
      current = current.next
    }
    return values
  }
}

