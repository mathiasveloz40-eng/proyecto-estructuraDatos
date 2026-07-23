class TreeNode {
  constructor(value) {
    this.value = value
    this.left = null
    this.right = null
  }
}

export class BinarySearchTree {
  constructor(compare = (a, b) => String(a).localeCompare(String(b))) {
    this.root = null
    this.compare = compare
  }

  insert(value) {
    const node = new TreeNode(value)
    if (!this.root) {
      this.root = node
      return value
    }
    let current = this.root
    while (true) {
      const direction = this.compare(value, current.value)
      if (direction === 0) return current.value
      if (direction < 0) {
        if (!current.left) {
          current.left = node
          return value
        }
        current = current.left
      } else {
        if (!current.right) {
          current.right = node
          return value
        }
        current = current.right
      }
    }
  }

  search(value) {
    let current = this.root
    while (current) {
      const direction = this.compare(value, current.value)
      if (direction === 0) return current.value
      current = direction < 0 ? current.left : current.right
    }
    return undefined
  }

  contains(value) {
    return this.search(value) !== undefined
  }

  inOrder() {
    const values = []
    const traverse = (node) => {
      if (!node) return
      traverse(node.left)
      values.push(node.value)
      traverse(node.right)
    }
    traverse(this.root)
    return values
  }
}

