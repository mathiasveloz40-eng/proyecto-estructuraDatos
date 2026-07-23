export class Stack {
  constructor(values = []) {
    this.items = [...values]
  }

  push(value) {
    this.items.push(value)
    return value
  }

  pop() {
    return this.items.pop()
  }

  peek() {
    return this.items[this.items.length - 1]
  }

  isEmpty() {
    return this.items.length === 0
  }

  get size() {
    return this.items.length
  }

  toArray() {
    return [...this.items].reverse()
  }
}

