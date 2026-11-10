# Plan de Aseguramiento de Calidad y Pruebas — ObraGest

**Versión:** 1.0  
**Fecha:** 9 de noviembre de 2026  
**Etapa:** 1 — Base de calidad y requisitos  
**Referencias:** ISO/IEC/IEEE 29119-3, IEEE Std 730, ISO/IEC 25010, modelo de McCall, DoD y criterios Gherkin.

---

## 1. Propósito

Establecer cómo se planifican, diseñan, ejecutan y evidencian las pruebas de ObraGest durante las seis etapas de mejora. El plan busca que cada etapa tenga un criterio de salida verificable y que la calidad no dependa de pruebas manuales informales.

## 2. Alcance

Incluye:

- Pruebas unitarias, de integración, de sistema y de aceptación.
- Pruebas funcionales y no funcionales.
- Pruebas de API y de interfaz web.
- Evidencias de ejecución, defectos y trazabilidad.

No incluye:

- Pruebas de facturación electrónica ante entidades externas.
- Pruebas de penetración especializadas.
- Pruebas de carga con infraestructura de producción.

## 3. Objetivos de calidad

1. Verificar que cada requisito funcional tenga al menos un caso de prueba asociado.
2. Detectar defectos en la etapa en que se introducen, antes de avanzar.
3. Mantener una regresión automatizada de los flujos críticos.
4. Producir evidencia ejecutable y reproducible para la sustentación.
5. Medir la calidad del producto y del proceso con criterios verificables.

## 4. Organización y responsabilidades

| Rol | Responsabilidad |
| --- | --- |
| Responsable de calidad | Mantiene el plan, la matriz de trazabilidad y las evidencias. |
| Desarrollo | Implementa el código y las pruebas de cada etapa. |
| Revisor | Revisa requisitos, código, casos de prueba y resultados. |
| Usuario / negocio | Valida criterios de aceptación y participa en UAT. |
| ADMIN del sistema | Autoriza excepciones y valida flujos de cartera. |

## 5. Niveles de prueba

| Nivel | Objetivo | Herramientas | Cuándo |
| --- | --- | --- | --- |
| Unitario | Verificar funciones y servicios aislados. | Jest, Vitest. | En cada etapa, al implementar lógica. |
| Integración | Verificar interacción entre módulos, API y base de datos. | Supertest, Prisma, PostgreSQL de pruebas. | En cada etapa con cambios de API o datos. |
| Sistema | Verificar flujos completos de la aplicación. | Playwright, API real. | Al cerrar cada etapa con impacto en UI. |
| Aceptación | Verificar que el usuario acepta el resultado. | Guion UAT y criterios Gherkin. | Etapa 2 en adelante; cierre formal en Etapa 6. |

## 6. Tipos de prueba

### Funcionales

- Unitarias.
- Integración.
- Sistema.
- Humo.
- Sanidad.
- Interfaz.
- Regresión.
- Aceptación.

### No funcionales

- Seguridad y autorización.
- Rendimiento y volumen.
- Recuperación.
- Compatibilidad.
- Usabilidad.
- Instalación y portabilidad.
- Accesibilidad.

## 7. Entornos y datos de prueba

| Elemento | Definición |
| --- | --- |
| Backend local | `http://localhost:4000/api` |
| Frontend local | `http://localhost:5173` |
| Base de datos | PostgreSQL local `inventario_db` o base de pruebas equivalente. |
| Navegador E2E | Chrome instalado, mediante Playwright con `channel: chrome`. |
| Credenciales | Admin: `admin@obragest.local` / `Admin123*`; Empleado: `empleado@obragest.local` / `Empleado123*`. |
| Datos | Semilla demo y datos creados por las pruebas con prefijos identificables (`QA-`, `TEST-`). |
| Limpieza | Cada prueba debe ser idempotente o limpiar los datos que crea. No se ejecutan pruebas destructivas sobre datos reales. |

## 8. Herramientas

| Herramienta | Uso |
| --- | --- |
| Jest | Pruebas unitarias de backend. |
| ts-jest | Compilación TypeScript para Jest. |
| Supertest | Pruebas HTTP de integración/sistema de API. |
| Vitest | Pruebas unitarias de frontend. |
| React Testing Library | Pruebas de componentes y comportamiento de UI. |
| Playwright | Pruebas E2E de interfaz y smoke de API. |
| ESLint | Análisis estático de código. |
| Prisma | Preparación y consulta de datos de prueba. |

## 9. Estrategia por etapa

| Etapa | Enfoque de prueba | Evidencia mínima |
| --- | --- | --- |
| 1. Base de calidad | Humo de backend, frontend y E2E; instalación limpia. | `npm test`, `npm run test:e2e`, build, log de instalación. |
| 2. Usabilidad y quick wins | Búsqueda de clientes, paginación, cambio de contraseña. | Unitarias, API, E2E y capturas. |
| 3. Inventario y alquiler | Serial automático, concurrencia, cantidad. | Unitarias, integración con BD, E2E y prueba de concurrencia. |
| 4. Facturación y cartera | Saldo, alertas, autorización, auditoría. | Unitarias, API, E2E, pruebas de seguridad y matriz de permisos. |
| 5. Seguridad y confiabilidad | Rate limiting, health check, recuperación, GET idempotente. | Pruebas de seguridad, recuperación y regresión. |
| 6. Cierre de calidad | Regresión completa, UAT, no funcionales y RTF. | Suite completa, reporte de cobertura, acta UAT y evidencias. |

## 10. Criterios de entrada y salida

### Criterios de entrada por etapa

- Requisitos y criterios de aceptación aprobados.
- Código base compilando.
- Entorno de pruebas disponible.
- Datos de prueba preparados.
- Casos de prueba de la etapa diseñados.

### Criterios de salida por etapa

- Build de backend y frontend correcto.
- Pruebas unitarias y de integración aplicables aprobadas.
- Pruebas E2E de los flujos modificados aprobadas.
- Regresión de flujos críticos aprobada.
- Evidencia guardada en `docs/qa/evidencias/etapa-N/`.
- Defectos críticos cerrados.
- Revisión y aceptación del usuario.

## 11. Definición de terminado (DoD)

Una historia o corrección se considera terminada cuando:

1. El código está implementado y revisado.
2. Tiene al menos una prueba automatizada que falla sin el cambio y pasa con él.
3. La regresión relacionada pasa.
4. La documentación y la trazabilidad están actualizadas.
5. La evidencia de ejecución está guardada.
6. No introduce defectos críticos ni regresiones conocidas.
7. El usuario valida el resultado en demo o UAT.

## 12. Gestión de defectos

| Campo | Descripción |
| --- | --- |
| ID | `DEF-###` |
| Título | Descripción breve del defecto. |
| Severidad | Crítica, Alta, Media, Baja. |
| Prioridad | Inmediata, Alta, Media, Baja. |
| Requisito asociado | `RF-###` o `RNF-###`. |
| Caso de prueba | `CP-###-##`. |
| Estado | Abierto, En corrección, En revisión, Cerrado. |
| Evidencia | Captura, log o respuesta HTTP. |

Un defecto crítico abierto bloquea el gate de la etapa.

## 13. Evidencias

La estructura propuesta es:

```text
docs/qa/evidencias/
├── etapa-1/
│   ├── build-backend.txt
│   ├── build-frontend.txt
│   ├── test-backend.txt
│   ├── test-frontend.txt
│   ├── test-e2e.txt
│   └── lint.txt
├── etapa-2/
└── ...
```

Cada evidencia debe incluir fecha, comando ejecutado, resultado y responsable.

## 14. Matriz de riesgos de prueba

| Riesgo | Impacto | Mitigación |
| --- | --- | --- |
| Base de datos no disponible | Bloquea integración y E2E | Verificar PostgreSQL antes de ejecutar; usar health check. |
| Datos demo modificados | Pruebas no reproducibles | Crear datos con prefijo y limpiar al finalizar. |
| Pruebas E2E frágiles | Falsos negativos | Usar roles y etiquetas accesibles; evitar selectores por posición. |
| Cambios sin pruebas | Regresiones | Gate obligatorio y revisión de DoD. |
| Pruebas lentas | Se omiten | Mantener unitarias rápidas y separar E2E. |
| Falta de evidencia | No se puede sustentar | Guardar logs y capturas en cada etapa. |

## 15. Trazabilidad

La matriz `docs/qa/04-matriz-trazabilidad.md` relaciona cada requisito con:

- Implementación o archivo.
- Caso de prueba.
- Etapa.
- Estado de ejecución.

Se actualiza al cerrar cada etapa.

## 16. Comandos objetivo

```powershell
npm run build
npm test
npm run test:e2e
npm run lint
```

Los comandos deben funcionar desde la raíz del proyecto. Las pruebas que requieran base de datos o aplicación en ejecución se documentan en el README o en la evidencia de la etapa.

## 17. Control de cambios

| Versión | Fecha | Cambio |
| --- | --- | --- |
| 1.0 | 2026-11-09 | Creación del plan para las seis etapas. |
