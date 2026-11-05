# 🍲 FoodTrack — Catering Industrial, Comedores de Planta & Cero Desperdicio

> Plataforma integral de gestión para concesiones gastronómicas en fábricas, parques industriales y yacimientos. Erradica las disputas de facturación con Recursos Humanos mediante validación en línea de autoservicio (< 1s), elimina el fraude de la doble ración con sellado SHA-256, automatiza la planificación de cocina con cut-off para cero desperdicio y audita la cadena térmica HACCP.

[![Version](https://img.shields.io/badge/version-v1.0.00-emerald.svg)](version.json)
[![Security Rating](https://img.shields.io/badge/AppSec_Guardian-100%2F100-emerald.svg)](firebase.json)
[![Tests Passing](https://img.shields.io/badge/tests-56%2F56_PASS-emerald.svg)](tests/run_tests.js)
[![Zero Waste](https://img.shields.io/badge/Cocina-Cero_Desperdicio_%2B3%25_Contingencia-blue.svg)](src/core/menuProductionEngine.js)
[![HACCP](https://img.shields.io/badge/Bromatolog%C3%ADa-HACCP_%E2%89%A565%C2%B0C_%2F_%E2%89%A44%C2%B0C-purple.svg)](src/core/haccpThermalSentinel.js)
[![Ley 26.588](https://img.shields.io/badge/Alerta_M%C3%A9dica-Sin_TACC_(Cel%C3%ADaco)-amber.svg)](src/core/employeeRegistry.js)

---

## 🎯 El Problema que Resuelve en el Mercado

Las empresas concesionarias de comedores de planta y viandas corporativas en Argentina (proveedores de plantas automotrices, siderúrgicas, alimenticias, químicas, mineras y petroleras) enfrentan tres problemas operativos que desgastan sus márgenes y relaciones comerciales:

1. **Disputas de Facturación y el Fraude de la Doble Ración:**
   Al final del mes, Recursos Humanos compara las viandas facturadas con los fichajes de molinete y aplica débitos arbitrarios alegando diferencias. Además, operarios de turnos rotativos retiran dos veces su comida si no hay un control biométrico en la línea.
2. **Desperdicio Alimentario por Descoordinación de Menús ($15-25\% de merma):**
   Cocinar sin saber cuántos operarios van a comer genera sobrantes que terminan en la basura, o peor, que falte comida en el turno noche, provocando medidas de fuerza sindicales con los gremios (UOM, SMATA, Alimentación, Camioneros).
3. **Riesgo Bromatológico y Cruces Dietéticos (Ley 26.588 Sin TACC):**
   Si un operario celíaco recibe una vianda con trazas de gluten o la comida caliente llega a menos de $60^\circ$C proliferando bacterias (*Salmonella, E. coli*), la concesión enfrenta clausuras y demandas laborales.

---

## 💡 Soluciones Implementadas en FoodTrack

### 1. 🥗 Tótem de Autoservicio en Línea (< 1s) (Engine #245 & #159)
- **Validación Instantánea:** El operario ingresa su DNI o escanea su credencial en el tótem de pantalla táctil al entrar al comedor.
- **Invariante Cero Doble Ración:** Bloqueo automático e inmediato si el operario ya retiró su vianda en el turno activo, mostrando la hora exacta de la transacción previa.
- **Alerta Visual de Dietas Médicas:** Si el operario tiene perfil `Sin TACC (Celíaco)`, `Hiposódico` o `Diabético`, la pantalla emite una alerta destacada para que el cocinero entregue la barqueta hermética correspondiente.
- **Sello Inmutable SHA-256:** Cada vianda retirada genera un hash criptográfico auditado, eliminando cualquier discrepancia con la gerencia de Recursos Humanos.

### 2. 🍳 Planificación de Cocina Cero Desperdicio (Cut-Off 16:00 hs)
- Los operarios eligen su menú (Tradicional, Light o Vegetariano) hasta las 16:00 hs del día previo vía web o bot de WhatsApp.
- La cocina central recibe el cálculo del lote de cocción exacto más un **$+3\%$ de contingencia** (calculado con `Math.ceil`), cubriendo roturas accidentales o visitas de planta sin desperdiciar comida.

### 3. 🌡️ Auditoría Térmica HACCP (Inocuidad Alimentaria)
- Registro de Puntos Críticos de Control (PCC) en grados Celsius en salida de cocina y llegada a planta:
  - **Comida Caliente:** Seguro $\ge 65^\circ$C | Advertencia $60-64^\circ$C | Peligro bacteriano $< 60^\circ$C (dispara regeneración forzada).
  - **Ensaladas / Frío:** Seguro $\le 4^\circ$C | Límite $5-7^\circ$C | Peligro $> 7^\circ$C.

### 4. 💰 Liquidación Mensual B2B & Conciliación Cero Disputas
- Agrupación por planta industrial (Ford, Arcor, etc.).
- Desglose exacto de subsidio a facturar a la empresa (ej. 80%) y copago a descontar por recibo de sueldo de los operarios (ej. 20%).
- Exportación oficial en formato CSV con codificación **UTF-8 BOM (`\uFEFF`)** para compatibilidad nativa con Excel en Windows sin dependencias externas (Directiva 17).

---

## 🏗️ Arquitectura de Software

```
FoodTrack/
├── src/
│   ├── core/
│   │   ├── employeeRegistry.js         # Padrón de operarios, plantas, turnos y dietas médicas
│   │   ├── menuProductionEngine.js     # Menú rotativo, cut-off 16:00 hs y batch de cocina +3%
│   │   └── haccpThermalSentinel.js     # Control bromatológico HACCP caliente/frío y desvíos
│   ├── services/
│   │   ├── mealValidationService.js    # Fichaje tótem <1s, anti-doble ración y sello SHA-256
│   │   ├── corporateBillingService.js  # Lotes mensuales B2B, subsidio vs copago y CSV BOM
│   │   ├── whatsAppMenuNotifier.service.js # Enlaces wa.me E.164 para menú, corte y alertas HACCP
│   │   └── foodTrackCache.service.js   # Offline-first con outbox FIFO y anti-phantom seed
│   ├── utils/
│   │   ├── cryptoSeal.js               # Motor SHA-256 sincrónico puro sin dependencias
│   │   ├── formatters.js               # Formato ARS, fechas, badges dietéticos y evaluación HACCP
│   │   └── sanitizer.js                # Sanitizador Zero-Sink DOM con DOMParser y replaceChildren
│   └── main.js                         # SPA reactiva, Modo Tótem con WakeLock y gestión de comedor
├── tests/
│   └── run_tests.js                    # Arnés de pruebas de 5 capas (56 tests PASS)
├── index.html                          # Interfaz táctil moderna para línea de servicio y desktop
├── firebase.json                       # Cabeceras estrictas CSP, XFO, HSTS
├── firestore.rules                     # Reglas RBAC para cocina, operarios y RRHH
├── version.json                        # Versión semántica v1.0.00
└── package.json
```

---

## 🧪 Arnés de Pruebas Multi-Capa (56 Tests PASS)

```bash
node tests/run_tests.js
```
- **Capa 1 (Unitarias & Fuzzing):** Evaluación HACCP caliente ($\ge 65^\circ$C) y frío ($\le 4^\circ$C), fuzzing con NaN/negativos, avalancha SHA-256, Unicode/Emojis, formateadores ARS, badges dietéticos y normalizador E.164.
- **Capa 2 (Integración & Memoria):** Registro de empresas y tarifas, operarios con subsidio, bloqueo de DNI duplicado, requerimientos dietéticos por planta, cálculo de batch $+3\%$, cut-off y prueba de estrés de memoria (1.000 ciclos).
- **Capa 3 (Servicios & Componentes):** Fichaje en tótem, rechazo inmediato de doble ración, alerta de dieta Sin TACC, sello SHA-256, detección de adulteración, control térmico HACCP y lote B2B mensual.
- **Capa 4 (Seguridad & CSP):** Sanitizer XSS, bloqueo de `javascript:` y `data:`, cabeceras estrictas en `firebase.json` y reglas en `firestore.rules`.
- **Capa 5 (E2E):** Flujo completo de empresa $\to$ menú $\to$ selección $\to$ batch cocina $\to$ HACCP $\to$ tótem $\to$ liquidación B2B $\to$ exportación CSV BOM $\to$ outbox cache.

---

## 🛡️ Auditoría de Seguridad (AppSec Guardian)

```bash
node ../AiAppFactory/tools/security-guardian/index.mjs .
```
- **Puntaje:** `100/100`
- **Vulnerabilidades:** 0 Críticas | 0 Altas | 0 Medias | 0 Bajas.
- **Zero-Sink DOM:** Cumplimiento estricto mediante `replaceChildren()` y `DOMParser`.

---

## 🚀 Despliegue y Ejecución Local

```bash
# Iniciar servidor estático
python -m http.server 5210
# Abrir en navegador
http://localhost:5210
```

---

*Desarrollado con el estándar de excelencia de AiAppFactory · Zero Fake Features · Testing-First.*
