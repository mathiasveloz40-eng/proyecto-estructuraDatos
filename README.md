# Nexus Arcade · plantilla de interfaz

Plantilla React + Vite para el proyecto integrador de Estructuras de Datos con tema **Videojuego**. La interfaz es únicamente la capa visual: las estructuras reales pueden conectarse después sin tener que rehacer el diseño.

## Ejecutar

```bash
npm install
npm run dev
```

## Dónde personalizar

La demostración está en [`src/App.jsx`](src/App.jsx). Cambia las props del componente:

```jsx
<GameDataStructuresUI
  projectName="Nombre de tu proyecto"
  projectSubtitle="Descripción corta"
  gameName="Videojuego"
  userName="Tu nombre"
  studentNames={["Estudiante 1", "Estudiante 2"]}
  initialRecords={misVideojuegos}
>
  {/* Aquí puedes insertar componentes adicionales */}
</GameDataStructuresUI>
```

El componente reutilizable está en [`src/components/GameDataStructuresUI.jsx`](src/components/GameDataStructuresUI.jsx) y los estilos en [`src/App.css`](src/App.css). La plantilla ya contempla en la navegación los seis temas del PDF: arreglo, lista enlazada, pila, cola, árbol y grafo. El módulo de arreglo muestra CRUD, búsqueda y ordenamiento como interacción visual de ejemplo.

Para conectar tu lógica, reemplaza las visualizaciones de `StructureVisual` o añade componentes mediante `children`. La UI no utiliza librerías que implementen directamente las estructuras solicitadas.
