# Hospital Flow

Proyecto de estructura de datos sistema web para coordinar el flujo operativo de pacientes en un servicio de urgencias. El proyecto integra estructuras de datos detrás de funciones que se usan usualmente en un dashboard de un hospital: priorización de atención, historial de traslados, búsqueda de pacientes, ocupación de camas, rutas internas y deshacer acciones.

> Proyecto académico. Todos los datos estan en un arreglo de objectos Json y el sistema.

## Problema y solución

El modulo urgencias, la información de espera, prioridad, ubicación y camas cambia constantemente. Hospital Flow centraliza esa operación en un dashboard: el personal puede registrar pacientes, controlar la lista de espera por triaje, asignar camas, trasladar pacientes y consultar indicadores calculados en tiempo real.

La interfaz abstrae el tema tecnico de estructura de datos para que el usuario no vea lo que hay detras de esas funciones en el tema tecnico. El usuario trabaja con acciones como **Llamar siguiente**, **Ver historial**, **Calcular ruta** o **Deshacer**, mientras el backend utiliza internamente las estructuras apropiadas.

## Características

- Dashboard operativo con cifras calculadas desde datos persistidos.
- CRUD completo de pacientes con validación e historias clínicas únicas.
- Búsqueda exacta indexada y búsqueda textual por nombre o cédula.
- Atención de urgencias por cinco niveles de prioridad, respetando llegada dentro de cada nivel.
- Asignación y liberación de camas en Urgencias, UCI y Hospitalización.
- Historial editable de movimientos y ubicación actual del paciente.
- Deshacer de la última operación compatible.
- Cálculo y visualización de rutas internas del hospital.
- Ordenamiento manual por nombre, fecha, prioridad y espera.
- Persistencia local en archivos JSON, sin base de datos externa.
- Interfaz SPA responsive sin frameworks ni dependencias de terceros.

## Tecnologías

- HTML5, CSS3 y JavaScript.
- Node.js y módulos nativos (`http`, `fs`, `path`, `url`, `crypto`).
- Fetch API para la comunicación.
- JSON local para persistencia.
- `node:test` para pruebas automatizadas.


## Ejecución

Requisito: Node.js 18 o superior.

```bash
node backend/server.js
```

Abrir [http://localhost:3000](http://localhost:3000). Para utilizar otro puerto:

```powershell
$env:PORT=4000
node backend/server.js
```

## Pruebas

```bash
node --test
```

Las pruebas cubren las operaciones de las estructuras y los principales flujos de la API. Se ejecutan sobre archivos temporales.

El detalle de los 22 criterios de aceptación está en [docs/pruebas.md](docs/pruebas.md).

## Arquitectura

```text
frontend/
  index.html
  css/                estilos base, layout, componentes y responsive
  js/
    app.js            arranque y eventos globales
    api.js            cliente HTTP
    router.js         navegación SPA por hash
    components/       modal, toast, tablas y sidebar
    modules/          dashboard, pacientes, urgencias, camas, movimientos, rutas
backend/
  server.js           servidor HTTP y archivos estáticos
  routes/             traducción HTTP de cada recurso
  services/           reglas y coordinación de operaciones
  persistence/        acceso seguro a JSON
  structures/         implementaciones manuales
  algorithms/         búsqueda y ordenamiento
  data/               datos ficticios persistidos
tests/                 pruebas unitarias y de integración
docs/                  material técnico y de defensa
```

La explicación detallada se encuentra en [docs/arquitectura.md](docs/arquitectura.md).

## Estructuras y algoritmos

| Implementación | Aplicación en Hospital Flow |
| --- | --- |
| Arreglo | Catálogos, configuración y agregación de indicadores |
| Lista enlazada | Historial cronológico de movimientos por paciente |
| Pila | Registro de acciones reversibles |
| Colas por prioridad | Espera de urgencias con triaje y orden de llegada |
| Árbol binario de búsqueda | Índice por historia clínica |
| Grafo | Áreas conectadas y rutas internas |
| Búsqueda lineal | Coincidencias parciales por datos personales |
| Insertion Sort | Orden visual por distintos criterios sin `Array.sort()` |

Consulta [docs/estructuras.md](docs/estructuras.md) para operaciones, complejidades y ejemplos.

## Datos de demostración

En nuestro proyecto incluye pacientes, camas, movimientos y esperas ficticias. `backend/data/seed.js` genera el estado inicial y el servidor lo conserva en `backend/data/database.json`.

## Seguridad y alcance

Esta aplicación se diseñó para una demostración local. No incluye autenticación, cifrado de datos, auditoría regulatoria ni controles necesarios para ponerla en produccion.

## Integrantes

- Mathias Veloz
- Juan Espin



