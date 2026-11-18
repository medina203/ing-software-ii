# Evidencias — Etapa 6 (usabilidad, personalización e imágenes)

**Fecha de ejecución:** 17 de noviembre de 2026  
**Entorno:** Linux, Node.js v22, PostgreSQL 16, Google Chrome (Playwright).  
**Origen:** solicitudes del usuario en la revisión del PR #1.

> Igual que en la Etapa 4-5, Prisma se ejecutó en el sandbox con el compilador WASM y
> `@prisma/adapter-pg` cargados desde fuera del repositorio. El código versionado no cambia.

## Cambios verificados

| Solicitud                                       | Resultado                                                                                                                                               |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Imágenes en las tarjetas del inventario         | 12 ilustraciones propias (SVG) elegidas por el nombre o la categoría del implemento, más una genérica.                                                  |
| Reemplazar la imagen / subir desde celular o PC | Botón de cámara en cada tarjeta (ADMIN) y campo opcional al crear. La foto se reduce en el navegador (máx. 1280 px, WEBP) antes de subirla.             |
| Validar archivos subidos                        | Solo JPG, PNG o WEBP verificados por su firma (no por la extensión), máx. 5 MB, nombres aleatorios; un SVG renombrado a `.png` se rechaza con 400.      |
| Límite de dígitos y sin letras                  | Identificación por tipo (CC/CE/TI 6-10 dígitos, NIT 9 + DV), teléfono 7-10 dígitos, tarifa, cantidades y pagos. Validado en la interfaz y en la API.    |
| Ver la factura desde cartera                    | Botón "Ver factura" que lleva al detalle del alquiler (`#factura`), con desplazamiento, resaltado y lista de pagos. Se reutiliza la pantalla existente. |
| Plantilla de personalización (ADMIN)            | Página **Apariencia**: modo oscuro, tamaño de letra (14/16/18 px), color principal (5 paletas), imagen del login y artículos del carrusel.              |
| Login moderno y menos cargado                   | Pantalla dividida: imagen difuminada con franja diagonal y marca en contorno; formulario oscuro y cuentas demo plegadas.                                |
| Panel más dinámico con carrusel                 | Carrusel de 4 artículos (automático cada 6 s, pausa, flechas, teclado, deslizar en celular); indicadores animados y clicables.                          |

## Archivos

| Archivo                                                        | Contenido                                                      |
| -------------------------------------------------------------- | -------------------------------------------------------------- |
| `build.txt`, `lint.txt`, `prettier-check.txt`, `check-env.txt` | Construcción, lint, formato y plantillas `.env`.               |
| `test-backend-unit.txt`                                        | 13 suites, 68 pruebas unitarias del backend y cobertura.       |
| `test-frontend.txt`                                            | 9 archivos, 29 pruebas del frontend.                           |
| `test-api-e2e.txt`                                             | 6 suites, 32 pruebas de API (incluye `stage6.e2e-spec.ts`).    |
| `test-ui-e2e.txt`                                              | 21 pruebas Playwright (incluye `e2e/stage6.spec.ts`).          |
| `captura-*.jpg`                                                | Login, panel, inventario, apariencia en modo oscuro y celular. |

## Resultado

| Verificación        | Antes de la Etapa 6 | Después     |
| ------------------- | ------------------- | ----------- |
| Unitarias backend   | 63/63               | 68/68       |
| Unitarias frontend  | 18/18               | 29/29       |
| API e2e             | 25/25               | 32/32       |
| UI e2e (Playwright) | 16/16               | 21/21       |
| **Total**           | **122/122**         | **150/150** |

Pruebas manuales adicionales: imagen servida con `Cross-Origin-Resource-Policy: cross-origin`; intento de recorrido de rutas (`/uploads/..%2f..%2fpackage.json`) → 404; al reemplazar o quitar una imagen se borra el archivo anterior si ninguna unidad lo usa.
