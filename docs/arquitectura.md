# Arquitectura de Hospital Flow

## Criterio general

La aplicación separa presentación, transporte HTTP, reglas operativas, estructuras académicas y persistencia. Esa separación permite estudiar cada parte sin convertir `server.js` o `app.js` en archivos monolíticos.

```text
Navegador
  │  Fetch / JSON
  ▼
Rutas HTTP
  │  valida formato y traduce respuestas
  ▼
Servicios
  │  coordina casos de uso
  ├────────► Estructuras y algoritmos
  │
  ▼
Persistencia JSON
```

## Frontend

`frontend/index.html` contiene únicamente el armazón permanente de la SPA: sidebar, cabecera, buscador, región principal, contenedor de modales y notificaciones. El router por hash monta un módulo distinto sin recargar el documento.

- `api.js`: centraliza `fetch`, serialización y errores del servidor.
- `router.js`: relaciona cada hash con un renderizador.
- `app.js`: inicia la aplicación y coordina acciones globales.
- `components/`: componentes pequeños reutilizables.
- `modules/`: interfaz y eventos particulares de cada área funcional.

Los módulos no leen archivos JSON de forma directa. Todo dato visible llega de la API.

## Backend

`backend/server.js` crea el servidor con `http.createServer()`, entrega los archivos estáticos y delega las solicitudes `/api/` al enrutador. Las rutas interpretan parámetros, cuerpos y códigos HTTP; la lógica operativa vive en servicios.

Responsabilidades principales:

- Pacientes: validación, unicidad, CRUD e índice de búsqueda.
- Urgencias: reconstrucción de las cinco esperas, ingreso y selección del próximo paciente.
- Camas: disponibilidad, asignación y liberación coherentes.
- Movimientos: historial, ubicación actual y operaciones relacionadas.
- Rutas: catálogo de conexiones y ruta recomendada.
- Dashboard: agregación calculada de indicadores y alertas.
- Deshacer: revierte la última acción almacenada que todavía es aplicable.

## Persistencia

`JsonStore` carga y escribe `backend/data/database.json`. Si el archivo no existe, `backend/data/seed.js` crea los datos ficticios iniciales. Las estructuras en memoria se construyen desde una copia coherente de ese estado cuando cada operación las necesita; el grafo de áreas se crea al iniciar los servicios. Por eso las estructuras no sustituyen la persistencia, sino que proporcionan el comportamiento requerido durante la ejecución.

Una operación compuesta sigue este orden conceptual:

1. Validar todos los datos y recursos involucrados.
2. Aplicar el cambio mediante el servicio responsable.
3. Ejecutar la estructura correspondiente sobre el estado de trabajo.
4. Persistir los archivos afectados.
5. Devolver al cliente el estado confirmado.

La escritura está centralizada para evitar que las rutas dupliquen acceso al sistema de archivos.

## Flujo integrado de ejemplo

Al trasladar un paciente de Urgencias a Radiología:

1. El servicio comprueba que el paciente y el área existan.
2. Conserva el área anterior para una posible reversión.
3. Actualiza `areaActual` en el paciente.
4. Inserta el evento en su historial de movimientos.
5. Registra una acción reciente reversible.
6. Persiste los datos afectados.
7. El dashboard vuelve a calcular ubicación, esperas y alertas al consultarse.

Así, una única acción visible integra lista enlazada, pila, arreglos e indicadores sin exponer esos términos al personal.

## API

| Método y ruta | Responsabilidad |
| --- | --- |
| `GET /api/pacientes` | Listar, filtrar y ordenar pacientes |
| `POST /api/pacientes` | Registrar un paciente |
| `GET /api/pacientes/:id` | Consultar una ficha por historia clínica |
| `PUT /api/pacientes/:id` | Editar una ficha |
| `DELETE /api/pacientes/:id` | Eliminar la ficha y sus relaciones de forma reversible |
| `GET /api/pacientes/buscar` | Buscar una historia clínica exacta mediante el árbol |
| `GET /api/pacientes?buscar=...` | Buscar coincidencias textuales de forma lineal |
| `GET /api/urgencias` | Consultar la lista de espera priorizada |
| `POST /api/urgencias` | Ingresar un paciente a urgencias |
| `POST /api/urgencias/siguiente` | Llamar al próximo según prioridad y llegada |
| `PATCH /api/urgencias/:pacienteId` | Actualizar prioridad o estado; permite llamar a un paciente concreto |
| `DELETE /api/urgencias/:pacienteId` | Retirar una atención activa |
| `GET /api/camas` | Consultar o filtrar camas |
| `POST /api/camas/asignar` | Asignar una cama disponible |
| `POST /api/camas/liberar` | Liberar una cama ocupada |
| `GET /api/movimientos` | Consultar movimientos |
| `POST /api/movimientos` | Trasladar o registrar un evento |
| `PUT /api/movimientos/:id` | Corregir un evento |
| `DELETE /api/movimientos/:id` | Eliminar un evento |
| `GET /api/pacientes/:id/historial` | Recorrer el historial de un paciente |
| `POST /api/deshacer` | Revertir la última acción compatible |
| `GET /api/dashboard` | Calcular indicadores y alertas |
| `GET /api/rutas` | Calcular una ruta entre áreas |
| `GET /api/catalogos` | Obtener áreas, estados y triaje |
| `GET /api/actividad` | Consultar acciones recientes y disponibilidad de deshacer |

Las respuestas exitosas devuelven directamente el recurso. Los errores siguen el formato `{ "error": { "code", "message", "details" } }` con el código HTTP correspondiente.

## Decisiones de diseño

- CommonJS mantiene el proyecto ejecutable directamente con Node.js sin configuración adicional.
- Los identificadores clínicos se normalizan a números para conservar un orden consistente en el árbol.
- La prioridad no reemplaza el orden de llegada: existen cinco esperas independientes y cada una conserva el orden de ingreso.
- El frontend no replica reglas sensibles; solicita al backend que confirme cada operación.
- SVG ofrece un mapa accesible y responsive sin dependencias externas.
