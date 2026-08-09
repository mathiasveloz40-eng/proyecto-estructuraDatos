# Verificación funcional

Última ejecución: 9 de agosto de 2026.

## Resultado

- `node --test`: **15 aprobadas, 0 fallidas**.
- Verificación de sintaxis: **49 archivos JavaScript correctos**.
- Navegador Chrome: **6 módulos renderizados, 0 excepciones y 0 errores de consola**.
- Auditoría estática: sin `Array.sort()`, sin términos académicos visibles y sin marcadores `TODO`, `FIXME` o `HACK`.

Las pruebas HTTP utilizan un directorio temporal y reinician el servidor sobre el mismo archivo para verificar persistencia sin alterar los datos de demostración.

## Lista de aceptación

| # | Flujo requerido | Evidencia | Estado |
| ---: | --- | --- | :---: |
| 1 | Crear paciente | `tests/api.test.js` registra una ficha completa | ✓ |
| 2 | Buscar paciente | Consulta exacta por historia clínica | ✓ |
| 3 | Editar paciente | Actualización parcial y lectura posterior | ✓ |
| 4 | Eliminar paciente | Eliminación, 404 y restauración | ✓ |
| 5 | Rechazar identificadores duplicados | Respuesta HTTP 409 | ✓ |
| 6 | Ingresar a urgencias | Episodio persistido y ficha sincronizada | ✓ |
| 7 | Respetar prioridad | Se atiende primero el nivel más urgente | ✓ |
| 8 | Respetar llegada dentro del mismo nivel | Tres llamadas comprueban el orden | ✓ |
| 9 | Llamar siguiente paciente | Estado del episodio y paciente actualizados | ✓ |
| 10 | Asignar cama | Ocupación, paciente e historial sincronizados | ✓ |
| 11 | Liberar cama | Disponibilidad actualizada y operación reversible | ✓ |
| 12 | Actualizar indicadores | Dashboard comprobado antes y después de cambios | ✓ |
| 13 | Mover entre áreas | Traslado pendiente/completado y fechas retroactivas | ✓ |
| 14 | Mostrar movimientos en historial | CRUD mediante la lista enlazada | ✓ |
| 15 | Deshacer última acción compatible | Llamado, cama, edición, eliminación y traslado | ✓ |
| 16 | Buscar mediante el árbol | Pruebas unitarias y endpoint de historia clínica | ✓ |
| 17 | Calcular rutas | Grafo unitario, endpoint y mapa SVG | ✓ |
| 18 | Ordenar sin `Array.sort()` | Prueba que reemplaza el método nativo por un error | ✓ |
| 19 | CRUD completo | Crear, leer, actualizar y eliminar vía HTTP | ✓ |
| 20 | Persistir tras reinicio | Cierre, reapertura y lectura del mismo JSON | ✓ |
| 21 | Cargar sin errores de consola | Inspección de las seis rutas con DevTools | ✓ |
| 22 | Evitar botones decorativos | Revisión de eventos y recorrido visual de módulos | ✓ |

## Comandos de reproducción

```bash
node --test
node backend/server.js
```

Después de iniciar el servidor, abrir `http://localhost:3000` y seguir el recorrido de demostración descrito en `docs/defensa.md`.
