import GameDataStructuresUI from './components/GameDataStructuresUI'

const studentNames = ['Valentina Cruz', 'Mateo Andrade']

function App() {
  return (
    <GameDataStructuresUI
      projectName="Nexus Arcade"
      projectSubtitle="Laboratorio de estructuras de datos"
      gameName="Videojuego"
      userName="Valentina"
      studentNames={studentNames}
      initialRecords={[
        { id: 1, name: 'Eclipse Runner', category: 'Arcade', score: 9820, status: 'Activo' },
        { id: 2, name: 'Pixel Quest', category: 'Aventura', score: 8450, status: 'Activo' },
        { id: 3, name: 'Neon Tactics', category: 'Estrategia', score: 7690, status: 'En pausa' },
      ]}
    />
  )
}

export default App
