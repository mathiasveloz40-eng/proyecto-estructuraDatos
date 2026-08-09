# Guía breve para la defensa

## Presentación sugerida

### 1. Problema

Hospital Flow no diagnostica. Resuelve coordinación operativa: quién espera, con qué prioridad, dónde está, qué cama ocupa, cómo se trasladó y qué cambió recientemente.

### 2. Demostración principal

1. Mostrar que los indicadores se derivan de los datos.
2. Registrar un paciente ficticio y buscarlo por historia clínica.
3. Ingresarlo a urgencias junto con dos pacientes de igual prioridad.
4. Llamar al siguiente y comprobar orden de llegada.
5. Asignar una cama y observar la ocupación actualizada.
6. Trasladar al paciente y consultar su historial.
7. Deshacer el traslado.
8. Calcular una ruta entre dos áreas.
9. Reiniciar el servidor y verificar persistencia.

### 3. Integración que conviene explicar

Una operación de traslado no es un ejercicio aislado: actualiza la ficha, añade el movimiento al historial, registra la operación reversible, persiste el cambio y modifica los indicadores. Los servicios coordinan la operación para que la lógica no se duplique en rutas o componentes.

## Preguntas probables

### ¿Por qué no usar una sola cola?

Porque urgencias necesita priorizar gravedad. Se usa una cola por nivel: primero se elige el nivel más urgente disponible y, dentro de ese nivel, se respeta el orden de llegada.

### ¿Por qué el árbol puede ser `O(n)`?

No es balanceado. Si se insertan claves ya ordenadas, puede degenerarse en una cadena. En condiciones promedio distribuidas, la búsqueda se aproxima a `O(log n)`.

### ¿Por qué lista enlazada si los datos terminan en JSON?

JSON es el mecanismo de persistencia; la lista enlazada es la estructura de trabajo en memoria. Al iniciar se reconstruye el historial, y sus operaciones se aplican antes de persistir la representación serializable.

### ¿Por qué recorrido en amplitud para rutas?

Las conexiones representan tramos equivalentes, sin pesos de distancia. El recorrido por niveles encuentra una ruta con la menor cantidad de conexiones en `O(V + E)`.

### ¿Por qué Insertion Sort?

Es sencillo de estudiar, estable y eficiente para listas pequeñas o casi ordenadas como las tablas operativas de esta demostración. Su peor caso sigue siendo `O(n²)`, una limitación que debe reconocerse.

### ¿Qué sucede al reiniciar?

El backend carga `database.json`. El grafo se prepara al crear los servicios y las demás estructuras se reconstruyen desde una copia del estado cuando una operación las requiere: el árbol al buscar, las colas al llamar, la lista al consultar o modificar un historial y la pila al mostrar o deshacer actividad. El archivo conserva el estado entre reinicios.

### ¿Es un sistema listo para un hospital real?

No. Es una demostración académica local con datos ficticios. Un entorno real requeriría autenticación, roles, cifrado, auditoría, concurrencia multiusuario, respaldos y cumplimiento normativo.

## Complejidades para memorizar

| Operación | Complejidad |
| --- | --- |
| Pila: insertar, retirar, consultar cima | `O(1)` |
| Cola: ingresar, llamar siguiente | `O(1)` amortizado |
| Lista: buscar, editar, eliminar | `O(n)` |
| Árbol: buscar/insertar promedio | `O(log n)` |
| Árbol: peor caso | `O(n)` |
| Grafo: ruta por amplitud | `O(V + E)` |
| Insertion Sort: mejor caso | `O(n)` |
| Insertion Sort: promedio/peor | `O(n²)` |
| Búsqueda lineal | `O(n)` |

## Límites que deben decirse con honestidad

- El árbol no se auto-balancea.
- JSON es apropiado para esta demostración, no para alta concurrencia.
- La ruta minimiza conexiones, no metros ni tiempo.
- Deshacer solo puede revertir operaciones explícitamente soportadas y todavía coherentes con el estado actual.
- Los datos y decisiones de triaje son ficticios y manuales.
