# Mejora — Inventario agrupado por tipo

**Fecha:** 17 de noviembre de 2026  
**Origen:** observación del usuario en la revisión del PR #1. El inventario mostraba una tarjeta por cada unidad (AND-004, AND-005, AND-006…), lo que repetía la misma información y sobrecargaba la pantalla.

## Cambio

- **Una tarjeta por tipo de implemento** (misma categoría y nombre) con su stock: disponibles de total, una barra por estado y los conteos de alquiladas, en mantenimiento y fuera de servicio.
- **Ver unidades:** los seriales se consultan en una ventana dentro de la tarjeta. Allí el ADMIN cambia el estado de cada unidad o elimina las que no tienen historial.
- **Agregar unidades (+)** suma al stock del tipo. Si al crear un implemento el nombre ya existe en la categoría (aunque cambien mayúsculas o espacios), las unidades se suman al mismo tipo en lugar de crear otro.
- **Editar** aplica nombre, descripción y tarifa a todas las unidades del tipo; no permite renombrarlo con el nombre de otro tipo existente (409).
- **Eliminar** un tipo es todo o nada: si alguna unidad está alquilada o tiene historial, no se elimina ninguna (409).
- La paginación es por tipos (9 por página) y el encabezado muestra el total de tipos y de unidades.

## API

| Método   | Ruta                                                         | Rol         | Descripción                                 |
| -------- | ------------------------------------------------------------ | ----------- | ------------------------------------------- |
| `GET`    | `/items/groups?search=&estado=&categoriaId=&page=&pageSize=` | Autenticado | Tipos con stock por estado                  |
| `GET`    | `/items?categoriaId=&nombre=`                                | Autenticado | Unidades (seriales) de un tipo              |
| `PATCH`  | `/items/group`                                               | ADMIN       | Edita nombre, descripción y tarifa del tipo |
| `DELETE` | `/items/group?categoriaId=&nombre=`                          | ADMIN       | Elimina el tipo completo (todo o nada)      |

## Pruebas

| Nivel     | Archivo                                                           | Resultado |
| --------- | ----------------------------------------------------------------- | :-------: |
| Unitarias | `backend/src/items/items-groups.service.spec.ts` (6)              |   Pasa    |
| API e2e   | `backend/test/inventory-groups.e2e-spec.ts` (4)                   |   Pasa    |
| UI e2e    | `e2e/inventory-groups.spec.ts` (1); `stage2` y `stage3` ajustadas |   Pasa    |

Regresión completa: 122/122 (63 + 18 unitarias, 25 API, 16 Playwright).
