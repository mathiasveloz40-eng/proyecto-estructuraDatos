# Estructuras de datos y algoritmos

## Relación con el sistema

| Estructura | Módulo | Justificación |
| --- | --- | --- |
| Arreglo | Catálogos y dashboard | Hay una colección acotada y recorrible de áreas, prioridades, camas y registros para agregar estadísticas. |
| Lista enlazada | Historial del paciente | Los eventos forman una secuencia cronológica que se recorre y puede modificarse sin exponer índices de arreglo. |
| Pila | Actividad reciente | La última acción realizada es la primera candidata a deshacerse. |
| Cola | Urgencias | Dentro de una misma prioridad, quien llegó primero debe atenderse primero. |
| Árbol binario | Pacientes | La historia clínica numérica funciona como clave ordenada para búsqueda e indexación. |
| Grafo | Rutas internas | Un área puede conectar con varias otras; las conexiones no forman una jerarquía lineal. |

## Arreglos

Los arreglos guardan catálogos estables como áreas y niveles de triaje, y representan colecciones persistidas que deben recorrerse para obtener indicadores. Acceder por índice cuesta `O(1)`; localizar un elemento sin índice cuesta `O(n)`.

Archivos principales: `backend/config/catalogs.js`, `backend/data/seed.js` y `backend/services/dashboard.service.js`.

No se añadió un arreglo artificial: es la representación natural cuando se necesitan estadísticas de toda una colección o una respuesta JSON ordenada para la interfaz.

## Historial de movimientos: lista enlazada

Archivo: `backend/structures/LinkedList.js`. Integración: `backend/services/domain.helpers.js` y `backend/services/movimientos.service.js`.

Cada nodo contiene el movimiento (`id`, `pacienteId`, `area`, `fecha`, `descripcion`) y una referencia al siguiente. El servicio reconstruye el historial de un paciente desde la persistencia y lo utiliza para sus operaciones cronológicas.

Operaciones:

- Insertar al final: `O(1)` cuando se conserva referencia a la cola.
- Buscar por identificador: `O(n)`.
- Modificar un evento: `O(n)` para localizarlo.
- Eliminar un evento: `O(n)`.
- Recorrer el historial completo: `O(n)`.

Ejemplo visible: **Historial del paciente**, donde se muestran ingreso, triaje, traslado y egreso en secuencia.

## Actividad reciente: pila

Archivo: `backend/structures/Stack.js`. Integración: `backend/services/actividad.service.js`.

La acción más reciente se guarda en la parte superior. Al elegir **Deshacer última acción**, se extrae esa acción y se restaura el estado anterior.

- `push`: `O(1)`.
- `pop`: `O(1)`.
- `peek`: `O(1)`.
- `isEmpty`: `O(1)`.
- `size`: `O(1)`.

Este orden de último en entrar, primero en salir coincide exactamente con la semántica de deshacer.

## Espera de urgencias: colas por prioridad

Archivo: `backend/structures/Queue.js`. Integración: `backend/services/urgencias.service.js`.

`enqueue` añade al final y `dequeue` retira del frente. La implementación mantiene un índice frontal para no usar `shift`, cuyo movimiento de elementos tendría coste lineal.

- `enqueue`: `O(1)` amortizado.
- `dequeue`: `O(1)` amortizado.
- `peek`: `O(1)`.
- `isEmpty` y `size`: `O(1)`.
- `getItems`: `O(n)` porque crea una vista segura.

Existen cinco colas, una por nivel. **Llamar siguiente paciente** revisa desde nivel 1 hasta nivel 5. Entre dos pacientes del mismo nivel se conserva estrictamente el orden de llegada.

## Índice de pacientes: árbol binario de búsqueda

Archivo: `backend/structures/BinarySearchTree.js`. Integración: `backend/services/pacientes.service.js` y `backend/services/domain.helpers.js`.

Cada nodo guarda como clave la historia clínica y como valor el paciente asociado. Las claves menores quedan a la izquierda y las mayores a la derecha.

- Inserción y búsqueda: promedio `O(log n)`, peor caso `O(n)` si el árbol queda degenerado.
- Eliminación: promedio `O(log n)`, peor caso `O(n)`.
- Recorridos `inOrder`, `preOrder` y `postOrder`: `O(n)`.
- Espacio del índice: `O(n)`.

El servicio construye el índice desde el estado persistido antes de una búsqueda exacta o una validación de unicidad. Una vez construido, la consulta del árbol tiene las complejidades anteriores; construirlo requiere recorrer los `n` pacientes y evita que el índice quede desactualizado después de una operación de deshacer. La interfaz solamente muestra **Buscar paciente**.

## Rutas hospitalarias: grafo

Archivo: `backend/structures/Graph.js`. Integración: `backend/services/rutas.service.js`.

Se utiliza una lista de adyacencia: cada área tiene la colección de áreas conectadas directamente. Es más compacta que una matriz cuando no todas las áreas se conectan entre sí.

Operaciones:

- Agregar nodo: `O(1)` promedio.
- Agregar conexión: `O(1)` promedio con conjuntos de vecinos.
- Consultar vecinos: `O(grado del vértice)`.
- Eliminar área: `O(V + E)` en el peor caso.
- Recorrido en amplitud y ruta mínima: `O(V + E)`.

La ruta recomendada usa un recorrido en amplitud porque las conexiones no están ponderadas. La primera vez que se alcanza el destino se obtiene una ruta con el menor número de tramos.

## Búsquedas

Archivo: `backend/algorithms/search.js`. Integración principal: `backend/services/pacientes.service.js`.

- Búsqueda exacta por historia clínica: delega al índice del árbol; promedio `O(log n)` y peor caso `O(n)`.
- Búsqueda lineal por nombre, apellido o cédula: revisa cada paciente, `O(n)`. Es apropiada para coincidencias parciales que no corresponden a la clave del árbol.

No se utiliza `Array.find()` como sustituto del algoritmo académico.

## Ordenamiento por inserción

Archivo: `backend/algorithms/sorting.js`. Lo utilizan pacientes, urgencias, camas, movimientos, actividad y dashboard; el frontend incluye la misma implementación didáctica en `frontend/js/utils.js` para ordenar vistas ya cargadas.

Insertion Sort construye progresivamente una región ordenada. Para cada elemento desplaza hacia la derecha los elementos anteriores que deban quedar después según el comparador elegido.

- Mejor caso: `O(n)` cuando la colección ya está ordenada.
- Caso promedio y peor caso: `O(n²)`.
- Espacio adicional: `O(n)` si se devuelve una copia para no mutar la fuente; el núcleo del ordenamiento trabaja en la copia.
- Es estable si solo se desplaza cuando el comparador indica un orden estrictamente mayor.

El mismo algoritmo acepta comparadores para tiempo de espera, nombre, fecha de ingreso y prioridad. No llama a `Array.sort()`.

## Resumen para la defensa

La elección no parte de “dónde colocar cada estructura”, sino de la regla del negocio:

- Secuencia editable de eventos → lista enlazada.
- Revertir lo último → pila.
- Conservar llegada dentro de una prioridad → cola.
- Indexar una clave numérica ordenable → árbol.
- Conectar ubicaciones de muchas maneras → grafo.
- Agregar colecciones y catálogos → arreglos.
