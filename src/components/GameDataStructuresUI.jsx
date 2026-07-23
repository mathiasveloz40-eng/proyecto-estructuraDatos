import { useState } from 'react'
import { createGameDataService } from '../dataStructures/gameDataService'
import '../App.css'

const defaultModules = [
  { id: 'array', label: 'Arreglos', icon: '[]', description: 'Puntajes y catálogo por índice' },
  { id: 'linked-list', label: 'Lista enlazada', icon: '→', description: 'Ruta de misiones conectadas' },
  { id: 'stack', label: 'Pila', icon: '▤', description: 'Historial LIFO de acciones' },
  { id: 'queue', label: 'Cola', icon: '≡', description: 'Turnos FIFO de jugadores' },
  { id: 'tree', label: 'Árbol', icon: '⌘', description: 'Jerarquía de categorías' },
  { id: 'graph', label: 'Grafo', icon: '⊙', description: 'Conexiones entre niveles' },
]

const defaultRecords = [
  { id: 1, name: 'Eclipse Runner', category: 'Arcade', score: 9820, status: 'Activo' },
  { id: 2, name: 'Pixel Quest', category: 'Aventura', score: 8450, status: 'Activo' },
]

const moduleDetails = {
  array: { operation: 'Acceso por índice', complexity: 'O(1)', description: 'Colección rápida para consultar puntajes del videojuego.' },
  'linked-list': { operation: 'Recorrido de misiones', complexity: 'O(n)', description: 'Cada misión apunta a la siguiente para construir una ruta flexible.' },
  stack: { operation: 'Deshacer acción', complexity: 'O(1)', description: 'La última acción registrada es la primera que se recupera (LIFO).' },
  queue: { operation: 'Siguiente jugador', complexity: 'O(1)', description: 'Los jugadores esperan su turno en orden de llegada (FIFO).' },
  tree: { operation: 'Buscar categoría', complexity: 'O(log n)', description: 'La clasificación jerárquica organiza géneros y niveles del juego.' },
  graph: { operation: 'Explorar conexión', complexity: 'O(V + E)', description: 'Los nodos representan niveles y las aristas sus conexiones.' },
}

function initials(name = 'Jugador') {
  return name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()
}

function ModuleIcon({ icon }) {
  return <span className="module-icon" aria-hidden="true">{icon}</span>
}

function GameDataStructuresUI({ projectName = 'Nexus Arcade', projectSubtitle = 'Laboratorio de estructuras de datos', gameName = 'Videojuego', userName = 'Jugador', studentNames = [], initialRecords = defaultRecords, modules = defaultModules, children }) {
  const [service] = useState(() => createGameDataService(initialRecords))
  const [activeModule, setActiveModule] = useState(modules[0]?.id || 'array')
  const [, setVersion] = useState(0)
  const selectedModule = modules.find((module) => module.id === activeModule) || modules[0] || defaultModules[0]
  const data = {
    games: service.getGames(),
    missions: service.getMissions(),
    actions: service.getActions(),
    players: service.getPlayers(),
    categories: service.getCategories(),
    graph: service.getGraph(),
  }
  const refresh = () => setVersion((current) => current + 1)

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">NX</div><div><p className="brand-title">{projectName}</p><p className="brand-caption">{projectSubtitle}</p></div></div>
        <div className="nav-label">Estructuras</div>
        <nav className="nav-list" aria-label="Módulos de estructuras de datos">{modules.map((module, index) => <button className={`nav-item ${activeModule === module.id ? 'active' : ''}`} type="button" key={module.id} onClick={() => setActiveModule(module.id)}><span className="nav-icon"><ModuleIcon icon={module.icon} /></span><span>{module.label}</span><span className="module-index">0{index + 1}</span></button>)}</nav>
        <div className="sidebar-bottom"><div className="eyebrow">Equipo de desarrollo</div>{studentNames.map((student) => <div className="team-line" key={student}><span className="avatar">{initials(student)}</span>{student}</div>)}</div>
      </aside>
      <main className="main-content">
        <header className="topbar"><div className="breadcrumbs">PROYECTO / <strong>{gameName.toUpperCase()}</strong> / PANEL</div><div className="topbar-actions"><span className="status-dot" /><span className="live-status">SISTEMA EN LÍNEA</span><button className="profile" type="button" title={`Perfil de ${userName}`}>{initials(userName)}</button></div></header>
        <div className="page-heading"><div><div className="eyebrow">Interfaz gráfica · Proyecto integrador</div><h1>Construye. Conecta.<br /><span style={{ color: 'var(--cyan)' }}>Juega.</span></h1><p>Panel de control para explorar las estructuras que dan vida a <strong>{gameName}</strong>.</p></div><div className="heading-meta"><div className="meta-chip"><b>06</b>estructuras</div><div className="meta-chip"><b>100</b>puntos rubricados</div></div></div>
        <section className="stats-grid" aria-label="Resumen del proyecto"><div className="stat-card"><span className="stat-label">Módulo activo</span><strong className="stat-value">{selectedModule.label}</strong></div><div className="stat-card"><span className="stat-label">Registros CRUD</span><strong className="stat-value">{data.games.length.toString().padStart(2, '0')}</strong></div><div className="stat-card"><span className="stat-label">Estructuras</span><strong className="stat-value">{modules.length.toString().padStart(2, '0')}</strong></div><div className="stat-card"><span className="stat-label">Estado</span><strong className="stat-value">LISTO</strong></div></section>
        <div className="dashboard-grid"><section className="panel"><div className="panel-header"><div><div className="eyebrow">Mapa de navegación</div><h2 className="panel-title">Módulos del sistema</h2><p className="panel-subtitle">Selecciona una estructura para ejecutar sus operaciones.</p></div><span className="panel-tag">{modules.length} disponibles</span></div><div className="module-grid">{modules.map((module, index) => <button className={`module-card ${selectedModule.id === module.id ? 'selected' : ''}`} type="button" key={module.id} onClick={() => setActiveModule(module.id)}><div className="module-card-top"><ModuleIcon icon={module.icon} /><span className="module-index">0{index + 1}</span></div><h3>{module.label}</h3><p>{module.description}</p></button>)}</div></section><section className="panel"><div className="panel-header"><div><div className="eyebrow">Grafo de progreso</div><h2 className="panel-title">Mapa de conexiones</h2><p className="panel-subtitle">Grafo real de niveles del videojuego.</p></div></div><GraphPreview graph={data.graph} /><div className="graph-legend"><span className="legend-item"><span className="legend-dot" />nivel</span><span className="legend-item"><span className="legend-dot violet" />conectado</span><span className="legend-item"><span className="legend-dot orange" />ruta</span></div></section></div>
        <div style={{ marginTop: 14 }}><ModuleView module={selectedModule} data={data} service={service} refresh={refresh} /></div>
        {children}
        <div className="footer-note">NEXUS ARCADE // LÓGICA JS PURA CONECTADA</div>
      </main>
    </div>
  )
}

function ModuleView({ module, data, service, refresh }) {
  const details = moduleDetails[module.id] || moduleDetails.array
  return (
    <section className="module-view" aria-label={`Módulo ${module.label}`}>
      {module.id === 'array' ? <CrudPanel service={service} refresh={refresh} /> : <StructurePanel module={module} details={details} data={data} service={service} refresh={refresh} />}
    </section>
  )
}

function CrudPanel({ service, refresh }) {
  const [query, setQuery] = useState('')
  const [sortOrder, setSortOrder] = useState('desc')
  const [editingId, setEditingId] = useState(null)
  const [message, setMessage] = useState('')
  const emptyDraft = { name: '', category: 'Arcade', score: 0, status: 'Activo' }
  const [draft, setDraft] = useState(emptyDraft)
  const visibleRecords = service.searchGames(query)

  const updateDraft = (field, value) => setDraft((current) => ({ ...current, [field]: value }))
  const submit = (event) => {
    event.preventDefault()
    if (!draft.name.trim()) return
    if (editingId === null) {
      service.createGame({ ...draft, name: draft.name.trim(), score: Number(draft.score) || 0 })
      setMessage('Registro creado con el arreglo')
    } else {
      service.updateGame(editingId, { ...draft, name: draft.name.trim(), score: Number(draft.score) || 0 })
      setMessage('Registro actualizado')
    }
    setDraft(emptyDraft)
    setEditingId(null)
    refresh()
  }
  const edit = (record) => { setEditingId(record.id); setDraft({ name: record.name, category: record.category, score: record.score, status: record.status }); setMessage(`Editando ${record.name}`) }
  const remove = (id) => { service.deleteGame(id); setMessage('Registro eliminado'); refresh() }
  const sort = () => { service.sortGames(sortOrder); setSortOrder((current) => current === 'desc' ? 'asc' : 'desc'); setMessage('Ordenamiento Quick Sort aplicado'); refresh() }

  return <div className="panel"><div className="panel-header"><div><div className="eyebrow">Módulo 01 / CRUD</div><h2 className="panel-title">Catálogo de videojuegos</h2><p className="panel-subtitle">Arreglo con crear, consultar, actualizar, eliminar, buscar y ordenar.</p></div><span className="panel-tag">Arreglo · Quick Sort</span></div><form className="form-grid" onSubmit={submit}><div className="field"><label htmlFor="game-name">Nombre del juego</label><input id="game-name" className="field-input" value={draft.name} onChange={(event) => updateDraft('name', event.target.value)} placeholder="Ej. Starfall" /></div><div className="field"><label htmlFor="game-category">Categoría</label><select id="game-category" className="field-select" value={draft.category} onChange={(event) => updateDraft('category', event.target.value)}><option>Arcade</option><option>Aventura</option><option>Estrategia</option><option>RPG</option></select></div><div className="field"><label htmlFor="game-score">Puntaje</label><input id="game-score" className="field-input" type="number" min="0" value={draft.score} onChange={(event) => updateDraft('score', event.target.value)} /></div><div className="field"><label htmlFor="game-status">Estado</label><select id="game-status" className="field-select" value={draft.status} onChange={(event) => updateDraft('status', event.target.value)}><option>Activo</option><option>En pausa</option><option>Nuevo</option></select></div><div className="field" style={{ alignSelf: 'end' }}><button className="button" type="submit">{editingId === null ? '+ Crear registro' : 'Guardar cambios'}</button></div>{editingId !== null && <div className="field" style={{ alignSelf: 'end' }}><button className="button secondary" type="button" onClick={() => { setEditingId(null); setDraft(emptyDraft) }}>Cancelar edición</button></div>}</form><div className="toolbar"><span className="eyebrow">{message || `${visibleRecords.length} registros encontrados`}</span><div className="toolbar-actions"><input className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Búsqueda lineal..." aria-label="Buscar videojuego" /><button className="button secondary" type="button" onClick={sort}>Ordenar {sortOrder === 'desc' ? '↓' : '↑'}</button></div></div><div className="table-scroll"><table className="data-table"><thead><tr><th>Videojuego</th><th>Categoría</th><th>Puntaje</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{visibleRecords.length ? visibleRecords.map((record) => <tr key={record.id}><td>{record.name}</td><td>{record.category}</td><td>{Number(record.score).toLocaleString()}</td><td><span className={`badge ${record.status === 'En pausa' ? 'paused' : ''}`}>{record.status}</span></td><td><div className="table-actions"><button className="icon-button" type="button" onClick={() => edit(record)}>Editar</button><button className="icon-button" type="button" onClick={() => remove(record.id)}>Borrar</button></div></td></tr>) : <tr><td colSpan="5"><div className="empty-state">No hay registros para esta búsqueda.</div></td></tr>}</tbody></table></div></div>
}

function StructurePanel({ module, details, data, service, refresh }) {
  const [input, setInput] = useState('')
  const [secondaryInput, setSecondaryInput] = useState('')
  const [message, setMessage] = useState('')
  const [traversal, setTraversal] = useState([])
  const setActionMessage = (text) => setMessage(text)

  const runAction = (callback, successMessage) => {
    const result = callback()
    if (result !== false) { setActionMessage(successMessage); refresh() }
  }

  const renderControls = () => {
    if (module.id === 'linked-list') return <><div className="inline-controls"><input className="field-input" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Nueva misión" /><input className="field-input small-field" type="number" min="0" max={data.missions.length} value={secondaryInput} onChange={(event) => setSecondaryInput(event.target.value)} placeholder="Índice" /><button className="button" type="button" onClick={() => { if (!input.trim()) return; runAction(() => service.addMission(input.trim(), secondaryInput), 'Nodo insertado en la lista'); setInput(''); setSecondaryInput('') }}>Insertar</button><button className="button secondary" type="button" onClick={() => { const result = service.searchMission(input); setActionMessage(result ? `Encontrado: ${result}` : 'Misión no encontrada') }}>Buscar</button><button className="button danger" type="button" onClick={() => { const result = service.removeMission(input); setActionMessage(result ? 'Nodo eliminado' : 'Nodo no encontrado'); refresh() }}>Eliminar</button></div></>
    if (module.id === 'stack') return <div className="inline-controls"><input className="field-input" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Acción del jugador" /><button className="button" type="button" onClick={() => { if (!input.trim()) return; runAction(() => service.pushAction(input.trim()), 'Elemento apilado (PUSH)'); setInput('') }}>PUSH</button><button className="button secondary" type="button" onClick={() => { const result = service.popAction(); setActionMessage(result.removed ? `Elemento retirado: ${result.removed} (POP)` : 'La pila está vacía'); refresh() }}>POP</button></div>
    if (module.id === 'queue') return <div className="inline-controls"><input className="field-input" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Nombre del jugador" /><button className="button" type="button" onClick={() => { if (!input.trim()) return; runAction(() => service.enqueuePlayer(input.trim()), 'Jugador agregado al final (ENQUEUE)'); setInput('') }}>ENQUEUE</button><button className="button secondary" type="button" onClick={() => { const result = service.dequeuePlayer(); setActionMessage(result.removed ? `Turno atendido: ${result.removed} (DEQUEUE)` : 'La cola está vacía'); refresh() }}>DEQUEUE</button></div>
    if (module.id === 'tree') return <div className="inline-controls"><input className="field-input" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Nueva categoría" /><button className="button" type="button" onClick={() => { if (!input.trim()) return; runAction(() => service.addCategory(input.trim()), 'Categoría insertada en el árbol'); setInput('') }}>Insertar</button><button className="button secondary" type="button" onClick={() => { const result = service.searchCategory(input.trim()); setActionMessage(result ? `Encontrada: ${result}` : 'Categoría no encontrada') }}>Buscar</button></div>
    if (module.id === 'graph') return <><div className="inline-controls"><input className="field-input" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Nivel origen" /><input className="field-input" value={secondaryInput} onChange={(event) => setSecondaryInput(event.target.value)} placeholder="Nivel destino" /><button className="button" type="button" onClick={() => { if (!input.trim()) return; runAction(() => service.addLevel(input.trim()), 'Vértice agregado'); setInput('') }}>Agregar nivel</button><button className="button secondary" type="button" onClick={() => { if (!input.trim() || !secondaryInput.trim()) return; runAction(() => service.connectLevels(input.trim(), secondaryInput.trim()), 'Arista conectada'); setInput(''); setSecondaryInput('') }}>Conectar</button></div><div className="inline-controls"><input className="field-input" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Nivel inicial para recorrer" /><button className="button secondary" type="button" onClick={() => setTraversal(service.exploreLevels(input.trim(), 'bfs'))}>BFS</button><button className="button secondary" type="button" onClick={() => setTraversal(service.exploreLevels(input.trim(), 'dfs'))}>DFS</button></div></>
    return null
  }

  return <div className="structure-layout"><div className="panel"><div className="panel-header"><div><div className="eyebrow">Módulo / operaciones reales</div><h2 className="panel-title">{module.label}</h2><p className="panel-subtitle">{details.description}</p></div><span className="panel-tag">{details.operation}</span></div><div className="operation-bar">{renderControls()}</div><StructureVisual id={module.id} data={data} graph={data.graph} traversal={traversal} /><p className="visual-caption">{message || 'Ejecuta una operación para actualizar esta estructura.'}</p></div><div className="panel"><div className="eyebrow">Ficha técnica</div><h2 className="panel-title">Operaciones conectadas</h2><dl className="info-list"><div className="info-row"><dt>Complejidad base</dt><dd>{details.complexity}</dd></div><div className="info-row"><dt>Elementos actuales</dt><dd>{getStructureSize(module.id, data)}</dd></div><div className="info-row"><dt>Recorrido</dt><dd>{module.id === 'graph' && traversal.length ? traversal.join(' → ') : 'Disponible'}</dd></div><div className="info-row"><dt>Estado</dt><dd style={{ color: 'var(--cyan)' }}>CONECTADO</dd></div></dl><div className="helper-note">La estructura se instancia en JavaScript puro y la interfaz solo refleja su estado actual.</div></div></div>
}

function getStructureSize(id, data) {
  if (id === 'linked-list') return data.missions.length
  if (id === 'stack') return data.actions.length
  if (id === 'queue') return data.players.length
  if (id === 'tree') return data.categories.length
  if (id === 'graph') return Object.keys(data.graph).length
  return data.games.length
}

function StructureVisual({ id, data, graph, traversal }) {
  if (id === 'stack') return <div className="visual-board"><div className="stack-list">{data.actions.map((item, index) => <div className={`data-node ${index === 0 ? 'current-node' : ''}`} key={`${item}-${index}`}>{item}</div>)}</div></div>
  if (id === 'queue') return <div className="visual-board"><div className="queue-list">{data.players.map((item) => <div className="data-node" key={item}>{item}</div>)}</div></div>
  if (id === 'tree') return <div className="visual-board"><div className="tree-board"><div className="tree-level"><div className="data-node">Juegos</div></div><div className="tree-level tree-branch">{data.categories.slice(0, 2).map((item) => <div className="data-node" key={item}>{item}</div>)}</div><div className="tree-level tree-branch">{data.categories.slice(2, 5).map((item) => <div className="data-node" key={item}>{item}</div>)}</div></div></div>
  if (id === 'graph') return <div className="visual-board"><div style={{ width: '100%' }}><GraphPreview graph={graph} />{traversal.length > 0 && <div className="helper-note">Recorrido: {traversal.join(' → ')}</div>}</div></div>
  if (id === 'linked-list') return <div className="visual-board"><div className="list-items">{data.missions.map((item, index) => <div className="list-item" key={`${item}-${index}`}><span className="data-node">{item}</span><span className="node-arrow">{index === data.missions.length - 1 ? '∅' : '→'}</span></div>)}</div></div>
  return <div className="visual-board"><div className="node-row">{data.games.map((item, index) => <span className="data-node" key={item.id}>[{index}] {item.score}</span>)}</div></div>
}

function GraphPreview({ graph }) {
  const vertices = Object.keys(graph)
  const positions = ['a', 'b', 'c', 'd']
  return <div className="graph-preview">{vertices.slice(0, 4).map((vertex, index) => <span className={`node ${positions[index]}`} key={vertex} title={`Conecta con: ${graph[vertex].join(', ') || 'ninguno'}`}>{vertex.slice(0, 2).toUpperCase()}</span>)}{vertices.length > 1 && <><span className="edge one" /><span className="edge two" /><span className="edge three" /></>}</div>
}

export default GameDataStructuresUI
