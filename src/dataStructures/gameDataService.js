import { ArrayStructure } from './ArrayStructure.js'
import { BinarySearchTree } from './BinarySearchTree.js'
import { Graph } from './Graph.js'
import { LinkedList } from './LinkedList.js'
import { Queue } from './Queue.js'
import { Stack } from './Stack.js'

const defaultMissions = ['Inicio', 'Bosque', 'Ciudad', 'Jefe final']
const defaultPlayers = ['P01', 'P02', 'P03', 'P04']
const defaultCategories = ['Arcade', 'Aventura', 'Estrategia', 'RPG']

function categoryCompare(a, b) {
  return String(a).localeCompare(String(b), 'es', { sensitivity: 'base' })
}

export function createGameDataService(initialRecords = []) {
  const catalog = new ArrayStructure(initialRecords)
  const missions = new LinkedList(defaultMissions)
  const actionHistory = new Stack(['Partida iniciada'])
  const playerQueue = new Queue(defaultPlayers)
  const categories = new BinarySearchTree(categoryCompare)
  const levels = new Graph()
  let nextId = initialRecords.reduce((max, record) => Math.max(max, Number(record.id) || 0), 0) + 1

  defaultCategories.forEach((category) => categories.insert(category))
  ;[['Inicio', 'Bosque'], ['Bosque', 'Ciudad'], ['Ciudad', 'Jefe final'], ['Bosque', 'Arena']].forEach(([from, to]) => levels.addEdge(from, to))

  return {
    createGame(data) {
      const game = { ...data, id: nextId }
      nextId += 1
      catalog.insert(game)
      actionHistory.push(`Creó ${game.name}`)
      return game
    },

    updateGame(id, data) {
      const updated = catalog.update((game) => game.id === id, data)
      if (updated) actionHistory.push(`Actualizó ${updated.name}`)
      return updated
    },

    deleteGame(id) {
      const deleted = catalog.remove((game) => game.id === id)
      if (deleted) actionHistory.push(`Eliminó ${deleted.name}`)
      return deleted
    },

    searchGames(query) {
      return catalog.searchLinear(query, ['name', 'category', 'status'])
    },

    sortGames(order = 'desc') {
      const multiplier = order === 'asc' ? 1 : -1
      return catalog.sort((a, b) => (Number(a.score) - Number(b.score)) * multiplier)
    },

    getGames() {
      return catalog.toArray()
    },

    addMission(mission, index) {
      if (index === undefined || index === '') missions.append(mission)
      else missions.insertAt(Number(index), mission)
      actionHistory.push(`Añadió misión ${mission}`)
      return missions.toArray()
    },

    removeMission(mission) {
      const deleted = missions.removeFirst((item) => item.toLowerCase() === mission.toLowerCase())
      if (deleted) actionHistory.push(`Quitó misión ${deleted}`)
      return deleted
    },

    searchMission(mission) {
      return missions.find((item) => item.toLowerCase().includes(mission.toLowerCase()))
    },

    getMissions() {
      return missions.toArray()
    },

    pushAction(action) {
      actionHistory.push(action)
      return actionHistory.toArray()
    },

    popAction() {
      const action = actionHistory.pop()
      return { removed: action, values: actionHistory.toArray() }
    },

    getActions() {
      return actionHistory.toArray()
    },

    enqueuePlayer(player) {
      playerQueue.enqueue(player)
      return playerQueue.toArray()
    },

    dequeuePlayer() {
      return { removed: playerQueue.dequeue(), values: playerQueue.toArray() }
    },

    getPlayers() {
      return playerQueue.toArray()
    },

    addCategory(category) {
      categories.insert(category)
      return categories.inOrder()
    },

    searchCategory(category) {
      return categories.search(category)
    },

    getCategories() {
      return categories.inOrder()
    },

    addLevel(level) {
      levels.addVertex(level)
      return levels.toObject()
    },

    connectLevels(from, to) {
      levels.addEdge(from, to)
      return levels.toObject()
    },

    exploreLevels(start, method = 'bfs') {
      return method === 'dfs' ? levels.depthFirstSearch(start) : levels.breadthFirstSearch(start)
    },

    getGraph() {
      return levels.toObject()
    },
  }
}
