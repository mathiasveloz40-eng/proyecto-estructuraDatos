export class Queue {
  constructor(values = []) {
    this.items = [...values]
    this.frontIndex = 0
  }

  enqueue(value) {
    this.items.push(value)
    return value
  }

  dequeue() {
    if (this.isEmpty()) return undefined
    const value = this.items[this.frontIndex]
    this.frontIndex += 1
    if (this.frontIndex > 10 && this.frontIndex * 2 > this.items.length) {
      this.items = this.items.slice(this.frontIndex)
      this.frontIndex = 0
    }
    return value
  }

  peek() {
    return this.items[this.frontIndex]
  }

  isEmpty() {
    return this.frontIndex >= this.items.length
  }

  get size() {
    return this.items.length - this.frontIndex
  }

  toArray() {
    return this.items.slice(this.frontIndex)
  }
}

