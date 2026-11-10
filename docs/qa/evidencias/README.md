# Evidencias de calidad — ObraGest

Esta carpeta guarda la evidencia de ejecución de cada etapa.

## Convención

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

Cada archivo debe incluir:

- Fecha y hora de ejecución.
- Comando ejecutado.
- Resultado (código de salida y resumen).
- Responsable.
- Observaciones o enlaces a capturas.

## Reglas

1. No se guardan secretos, tokens ni contraseñas reales.
2. Las capturas deben mostrar el resultado, no datos sensibles.
3. Si una prueba falla, se guarda el log y se registra el defecto asociado.
4. La evidencia se actualiza al repetir la prueba después de una corrección.
