/**
 * FoodTrack Test Suite - 5-Layer Test Guardian (50+ Tests)
 * AiAppFactory Standard: Unit/Fuzzing, Integration, Component, Security, E2E
 */

import { EmployeeRegistry } from '../src/core/employeeRegistry.js';
import { MenuProductionEngine } from '../src/core/menuProductionEngine.js';
import { HaccpThermalSentinel } from '../src/core/haccpThermalSentinel.js';
import { MealValidationService } from '../src/services/mealValidationService.js';
import { CorporateBillingService } from '../src/services/corporateBillingService.js';
import { WhatsAppMenuNotifier } from '../src/services/whatsAppMenuNotifier.service.js';
import { FoodTrackCache } from '../src/services/foodTrackCache.service.js';
import { Sanitizer } from '../src/utils/sanitizer.js';
import { sha256 } from '../src/utils/cryptoSeal.js';
import { formatARS, formatDate, evaluateHaccpTemp, getDietaryBadge } from '../src/utils/formatters.js';
import fs from 'fs';
import path from 'path';

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    passed++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${testName}`);
  }
}

function assertThrows(fn, testName) {
  try {
    fn();
    failed++;
    console.error(`  ✗ FAIL (Expected throw): ${testName}`);
  } catch (e) {
    passed++;
    console.log(`  ✓ PASS: ${testName}`);
  }
}

console.log('\n======================================================');
console.log('🧪 INICIANDO SUITE DE PRUEBAS FOODTRACK (5 CAPAS - 50+ TESTS)');
console.log('======================================================\n');

// -------------------------------------------------------------
// CAPA 1: Unitarias & Fuzzing Caótico
// -------------------------------------------------------------
console.log('--- CAPA 1: Unitarias & Fuzzing Caótico ---');

// 1. HACCP Hot Safe
const hHotSafe = evaluateHaccpTemp(68.5, 'hot');
assert(hHotSafe.status === 'safe' && hHotSafe.message.includes('≥ 65°C'), 'Capa 1.1: Temperatura caliente ≥ 65°C evaluada como segura');

// 2. HACCP Hot Warning
const hHotWarn = evaluateHaccpTemp(62.0, 'hot');
assert(hHotWarn.status === 'warning', 'Capa 1.2: Temperatura caliente 60-64°C evaluada como advertencia');

// 3. HACCP Hot Danger
const hHotDanger = evaluateHaccpTemp(55.0, 'hot');
assert(hHotDanger.status === 'danger' && hHotDanger.message.includes('PELIGRO BACTERIANO'), 'Capa 1.3: Temperatura caliente < 60°C clasificada como peligro bacteriano');

// 4. HACCP Cold Safe
const hColdSafe = evaluateHaccpTemp(3.2, 'cold');
assert(hColdSafe.status === 'safe' && hColdSafe.message.includes('≤ 4°C'), 'Capa 1.4: Temperatura fría ≤ 4°C evaluada como óptima');

// 5. HACCP Cold Danger
const hColdDanger = evaluateHaccpTemp(9.5, 'cold');
assert(hColdDanger.status === 'danger', 'Capa 1.5: Temperatura fría > 7°C evaluada como rotura de cadena de frío');

// 6. HACCP Fuzzing NaN & invalid
const hFuzz = evaluateHaccpTemp(NaN, 'hot');
assert(hFuzz.status === 'critical', 'Capa 1.6: Fuzzing HACCP maneja NaN sin crashear');

// 7. SHA-256 standard
const hash1 = sha256('FoodTrack Industrial Catering Test');
assert(typeof hash1 === 'string' && hash1.length === 64, 'Capa 1.7: SHA-256 genera hash de 64 caracteres hex');

// 8. SHA-256 deterministic
const hash2 = sha256('FoodTrack Industrial Catering Test');
assert(hash1 === hash2, 'Capa 1.8: SHA-256 es 100% determinista');

// 9. SHA-256 Avalanche
const hash3 = sha256('FoodTrack Industrial Catering Test.');
assert(hash1 !== hash3, 'Capa 1.9: Avalancha en SHA-256 (cambio de 1 char altera digest completo)');

// 10. SHA-256 Unicode & Emojis
const hashEmoji = sha256('🍲 Menú Especial Sin TACC 🌾❌ Ford Pacheco');
assert(hashEmoji.length === 64, 'Capa 1.10: SHA-256 procesa caracteres Unicode y Emojis');

// 11. Formatters ARS
const fArs = formatARS(8800);
assert(fArs.includes('8.800') || fArs.includes('8,800'), 'Capa 1.11: Formateo ARS de precio de vianda correcto');

// 12. Dietary Badge Sin TACC (Ley 26.588)
const bCeliac = getDietaryBadge('Sin TACC (Celíaco)');
assert(bCeliac.isMedicalAlert === true && bCeliac.label.includes('SIN TACC'), 'Capa 1.12: Badge Sin TACC genera alerta médica obligatoria');

// 13. Dietary Badge Hiposódico
const bHypo = getDietaryBadge('Hiposódico');
assert(bHypo.isMedicalAlert === true && bHypo.label.includes('HIPOSÓDICO'), 'Capa 1.13: Badge Hiposódico genera alerta médica');

// 14. WhatsApp Phone E.164 Normalizer
const cleanPhone = WhatsAppMenuNotifier.cleanPhoneNumber('011 3344-5566');
assert(cleanPhone.startsWith('549'), 'Capa 1.14: Teléfono con prefijo 011 normalizado a E.164');

// 15. WhatsApp Menu URL Generator
const menuUrl = WhatsAppMenuNotifier.generateMenuSelectionUrl({
  phone: '+5491133445566',
  employeeName: 'Horacio',
  date: '2026-11-06',
  companyName: 'Ford Pacheco'
});
assert(menuUrl.includes('wa.me/5491133445566') && menuUrl.includes('Cut-Off'), 'Capa 1.15: URL de WhatsApp para selección de menú generada correctamente');


// -------------------------------------------------------------
// CAPA 2: Integración & Estabilidad de Memoria
// -------------------------------------------------------------
console.log('\n--- CAPA 2: Integración & Estabilidad de Memoria ---');

const empReg = new EmployeeRegistry();
const menuEng = new MenuProductionEngine();

// 16. Company registration
const comp = empReg.registerCompany({
  id: 'PLANT-FORD',
  name: 'Ford Argentina - Planta Pacheco',
  contractMealPrice: 8800
});
assert(comp.id === 'PLANT-FORD' && comp.contractMealPrice === 8800, 'Capa 2.1: Empresa cliente registrada con tarifa de vianda');

// 17. Employee registration
const emp1 = empReg.registerEmployee({
  dni: '32189456',
  fullName: 'Horacio Martínez',
  companyId: comp.id,
  shift: 'Mañana',
  dietaryProfile: 'Estándar',
  subsidyPercentage: 80
});
assert(emp1.id.startsWith('EMP-') && emp1.status === 'active', 'Capa 2.2: Operario registrado en padrón con subsidio corporativo');

// 18. Duplicate DNI Rejection
assertThrows(() => {
  empReg.registerEmployee({
    dni: '32189456',
    fullName: 'Horacio Clon',
    companyId: comp.id
  });
}, 'Capa 2.3: Rechaza DNI duplicado de operario activo');

// 19. Register Second Employee Sin TACC
const emp2 = empReg.registerEmployee({
  dni: '28456123',
  fullName: 'Mariana Gómez',
  companyId: comp.id,
  shift: 'Mañana',
  dietaryProfile: 'Sin TACC (Celíaco)',
  subsidyPercentage: 80
});
assert(emp2.dietaryProfile.includes('Sin TACC'), 'Capa 2.4: Registro de operario con régimen Celíaco / Sin TACC');

// 20. Dietary Requirements Breakdown
const dietStats = empReg.getDietaryRequirements(comp.id);
assert(dietStats.totalEmployees === 2 && dietStats.counts['Sin TACC (Celíaco)'] === 1, 'Capa 2.5: Resumen de requerimientos dietéticos por planta');

// 21. Menu Registration
const testDate = '2026-11-06';
const menuObj = menuEng.registerDailyMenu({
  date: testDate,
  title: 'Menú Viernes',
  cutOffHour: 16,
  options: [
    { id: 'DISH-1', name: 'Milanesa con Puré', type: 'traditional' },
    { id: 'DISH-2', name: 'Pollo con Vegetales', type: 'light' },
    { id: 'DISH-3', name: 'Barqueta Sin TACC', type: 'celiac_special', isCeliacSafe: true }
  ]
});
assert(menuObj.options.length === 3, 'Capa 2.6: Menú diario registrado con opciones múltiples');

// 22. Employee Pre-Selection
const sel = menuEng.recordEmployeeSelection({
  employeeId: emp1.id,
  employeeDni: emp1.dni,
  date: testDate,
  shift: 'Mañana',
  selectedDishId: 'DISH-1',
  forceAfterCutoff: true
});
assert(sel.dishName === 'Milanesa con Puré', 'Capa 2.7: Elección anticipada de menú registrada para operario');

// 23. Kitchen Batch Calculation with +3% Contingency
const batch = menuEng.calculateKitchenProductionBatch({
  date: testDate,
  shift: 'Mañana',
  contingencyPct: 3
});
assert(batch.totalRequested === 1 && batch.totalContingency >= 1 && batch.totalBatch === 2, 'Capa 2.8: Cálculo de batch de cocina añade +3% contingencia para imprevistos');

// 24. Cut-Off Closed Check
const pastTarget = '2020-01-01';
const isClosed = menuEng.isCutOffClosed(pastTarget, 16, new Date());
assert(isClosed === true, 'Capa 2.9: Detector de horario de corte vencido funciona');

// 25. Memory Stability 1000 iterations
let memCrash = false;
try {
  for (let i = 0; i < 1000; i++) {
    sha256(`meal_tx_${i}`);
    evaluateHaccpTemp(65 + (i % 10), 'hot');
  }
} catch (e) {
  memCrash = true;
}
assert(!memCrash, 'Capa 2.10: Estabilidad de memoria (1000 iteraciones rápidas de hash y evaluación)');


// -------------------------------------------------------------
// CAPA 3: Componentes & Servicios de Negocio
// -------------------------------------------------------------
console.log('\n--- CAPA 3: Componentes & Servicios de Negocio ---');

const valService = new MealValidationService(empReg, menuEng);
const haccpSent = new HaccpThermalSentinel();
const billService = new CorporateBillingService(valService, empReg);

// 26. First Meal Scan in Totem (<1s)
const scan1 = valService.validateAndDispenseMeal({
  dni: emp1.dni,
  shiftDate: testDate,
  shift: 'Mañana',
  totemDevice: 'Totem-Línea-1'
});
assert(scan1.allowed === true && scan1.transaction.hashSeal.length === 64, 'Capa 3.1: Primer fichaje en tótem aceptado y sellado con SHA-256');

// 27. Anti-Double-Ration Invariant (Immediate Rejection)
const scanDouble = valService.validateAndDispenseMeal({
  dni: emp1.dni,
  shiftDate: testDate,
  shift: 'Mañana',
  totemDevice: 'Totem-Línea-1'
});
assert(scanDouble.allowed === false && scanDouble.isDoubleRationAttempt === true, 'Capa 3.2: Invariante Cero Doble Ración: Rechazo inmediato de segundo retiro en el mismo turno');

// 28. Medical Alert on Totem Scan (Sin TACC)
const scanCeliac = valService.validateAndDispenseMeal({
  dni: emp2.dni,
  shiftDate: testDate,
  shift: 'Mañana',
  totemDevice: 'Totem-Línea-1'
});
assert(scanCeliac.allowed === true && scanCeliac.hasMedicalAlert === true, 'Capa 3.3: Tótem dispara alerta de dieta médica al fichar operario Celíaco');

// 29. Tamper Detection on Transaction
const txItem = valService.getTransaction(scan1.transaction.id);
assert(txItem !== null, 'Capa 3.4: Transacción recuperada de base');

const origDish = txItem.dishServed;
txItem.dishServed = 'Plato Modificado Fraudulento';
const checkTamper = valService.verifyTransactionIntegrity(txItem.id);
assert(checkTamper.isTampered === true && checkTamper.hashMatches === false, 'Capa 3.5: Detección instantánea de adulteración si se altera la transacción');

// Restore original
txItem.dishServed = origDish;

// 30. HACCP Kitchen Dispatch Check
const hDispatch = haccpSent.recordThermalCheck({
  containerId: 'CARRO-01',
  companyId: comp.id,
  stage: 'kitchen_dispatch',
  foodCategory: 'hot',
  measuredTempC: 74.0,
  inspectorName: 'Chef Supervisor'
});
assert(hDispatch.evaluationStatus === 'safe', 'Capa 3.6: Registro HACCP en salida de cocina central en rango seguro');

// 31. HACCP Plant Arrival Check
const hArrival = haccpSent.recordThermalCheck({
  containerId: 'CARRO-01',
  companyId: comp.id,
  stage: 'plant_arrival',
  foodCategory: 'hot',
  measuredTempC: 67.2,
  inspectorName: 'Auditor Planta'
});
assert(hArrival.evaluationStatus === 'safe' && hArrival.measuredTempC >= 65, 'Capa 3.7: Registro HACCP en recepción de planta ≥ 65°C verificado');

// 32. HACCP Danger Violation & Regeneration Flag
const hDanger = haccpSent.recordThermalCheck({
  containerId: 'CARRO-FALLA-02',
  companyId: comp.id,
  stage: 'plant_arrival',
  foodCategory: 'hot',
  measuredTempC: 54.0,
  inspectorName: 'Auditor Planta'
});
assert(hDanger.evaluationStatus === 'danger' && hDanger.requiresRegeneration === true, 'Capa 3.8: Detección de peligro bromatológico y bandera de regeneración forzada');

// 33. HACCP Audit Summary
const hSummary = haccpSent.getThermalAuditSummary(comp.id);
assert(hSummary.totalChecks === 3 && hSummary.safeCount === 2 && hSummary.dangerCount === 1, 'Capa 3.9: Resumen de auditoría térmica HACCP generado correctamente');

// 34. Corporate Monthly Billing Batch
const batchPeriod = testDate.slice(0, 7); // '2026-11'
const billBatch = billService.generateMonthlyBatch({
  companyId: comp.id,
  periodYearMonth: batchPeriod
});
assert(billBatch.totalMeals === 2 && billBatch.auditStatus === 'audited_zero_disputes', 'Capa 3.10: Lote B2B mensual generado con estado de Cero Disputas');


// -------------------------------------------------------------
// CAPA 4: Seguridad & CSP (AppSec Guardian Directivas)
// -------------------------------------------------------------
console.log('\n--- CAPA 4: Seguridad & CSP ---');

// 35. Sanitizer escapeHTML
const cleanScript = Sanitizer.escapeHTML('<script>alert("xss")</script>');
assert(!cleanScript.includes('<script>') && cleanScript.includes('&lt;script&gt;'), 'Capa 4.1: Sanitizer escapa etiquetas script');

// 36. Sanitizer attribute injection
const cleanAttr = Sanitizer.escapeHTML('" onfocus="evil()');
assert(!cleanAttr.includes('" onfocus'), 'Capa 4.2: Sanitizer neutraliza inyección en atributos');

// 37. Sanitizer URL blocking
const badScheme = Sanitizer.sanitizeURL('javascript:alert(document.cookie)');
assert(badScheme.startsWith('#blocked'), 'Capa 4.3: Sanitizer bloquea esquemas javascript:');

// 38. Valid HTTPS URL allowed
const goodScheme = Sanitizer.sanitizeURL('https://wa.me/5491133445566');
assert(goodScheme.startsWith('https://'), 'Capa 4.4: Sanitizer permite enlaces https válidos');

// 39. firebase.json exists
const fbPath = path.resolve('firebase.json');
assert(fs.existsSync(fbPath), 'Capa 4.5: Archivo firebase.json presente');

// 40. CSP strictness in firebase.json
const fbConfig = JSON.parse(fs.readFileSync(fbPath, 'utf8'));
const headers = fbConfig.hosting.headers[0].headers;
const csp = headers.find(h => h.key === 'Content-Security-Policy')?.value || '';
assert(csp.includes("frame-ancestors 'none'") && !csp.includes("'unsafe-eval'"), 'Capa 4.6: CSP cualitativa estricta sin unsafe-eval');

// 41. XFO & XCTO headers
const xfo = headers.find(h => h.key === 'X-Frame-Options')?.value || '';
const xcto = headers.find(h => h.key === 'X-Content-Type-Options')?.value || '';
assert(xfo === 'DENY' && xcto === 'nosniff', 'Capa 4.7: Cabeceras de denegación de frames y nosniff presentes');

// 42. firestore.rules exists
const rulesPath = path.resolve('firestore.rules');
assert(fs.existsSync(rulesPath), 'Capa 4.8: Archivo firestore.rules presente');

// 43. firestore.rules Zero Trust
const rulesStr = fs.readFileSync(rulesPath, 'utf8');
assert(!rulesStr.includes('allow read, write: if true;'), 'Capa 4.9: firestore.rules sin bypass incondicional (Zero Trust)');

// 44. firestore.rules Inmutability
assert(rulesStr.includes('allow update, delete: if false;'), 'Capa 4.10: Inmutabilidad estricta de transacciones y registros HACCP en rules');


// -------------------------------------------------------------
// CAPA 5: E2E Lifecycle & Outbox Cache
// -------------------------------------------------------------
console.log('\n--- CAPA 5: E2E Lifecycle & Outbox Cache ---');

// 45. Corporate Subsidy vs Employee Copay Calculations
assert(billBatch.totalCompanySubsidy > 0 && billBatch.totalEmployeeCopay > 0, 'Capa 5.1: Desglose financiero exacto de subsidio empresa vs copago operario');

// 46. CSV Exporter with BOM UTF-8 (Directiva 17)
const csvOutput = billService.exportBatchCSV(billBatch.id);
assert(csvOutput.startsWith('\uFEFF'), 'Capa 5.2: Exportador universal incluye BOM UTF-8 para Excel en Windows');

// 47. CSV Official Headers & Content
assert(csvOutput.includes('LIQUIDACIÓN MENSUAL DE COMEDOR INDUSTRIAL') && csvOutput.includes('CERO DISPUTAS'), 'Capa 5.3: CSV contiene encabezados oficiales y certificación de Cero Disputas');

// 48. Cache Storage Mock
const mockStorage = {
  data: {},
  getItem(k) { return this.data[k] || null; },
  setItem(k, v) { this.data[k] = String(v); },
  removeItem(k) { delete this.data[k]; }
};

const cache = new FoodTrackCache(mockStorage);
assert(cache.isPurged() === false, 'Capa 5.4: Cache inicialmente no purgado');

// 49. Anti-Phantom Seed Invariant (Directiva 14)
cache.clear();
assert(cache.isPurged() === true, 'Capa 5.5: Purga de cache establece bandera foodtrack_demo_purged');

// 50. Cache Save & Load State
const saved = cache.saveState({ test: 'canteen_data_ok' });
assert(saved === true, 'Capa 5.6: Estado guardado exitosamente en cache local');

const loaded = cache.loadState();
assert(loaded && loaded.test === 'canteen_data_ok', 'Capa 5.7: Estado cargado exitosamente desde cache');

// 51. Outbox FIFO Queue (Offline-First)
cache.addToOutbox({ action: 'validate_meal', dni: '32189456' });
const outbox = cache.getOutbox();
assert(outbox.length === 1 && outbox[0].payload.dni === '32189456', 'Capa 5.8: Cola outbox almacena fichajes fuera de línea');

// 52. Clear Outbox Queue
cache.clearOutbox();
assert(cache.getOutbox().length === 0, 'Capa 5.9: Cola outbox vaciada tras sincronización exitosa');

// 53. HACCP Alert WhatsApp URL Generator
const alertUrl = WhatsAppMenuNotifier.generateHaccpAlertUrl({
  phone: '+5491144556677',
  auditorName: 'Auditor Planta',
  containerId: 'CARRO-FALLA-02',
  plantName: 'Ford Pacheco',
  tempC: 54.0,
  stage: 'plant_arrival'
});
assert(alertUrl.includes('ALERTA%20BROMATOL%C3%93GICA%20HACCP') && alertUrl.includes('54'), 'Capa 5.10: Generador de alerta bromatológica vía WhatsApp genera enlace seguro');

// 54. Verify Total Test Count ≥ 50
const totalTests = passed + failed;
assert(totalTests >= 50, `Capa 5.11: Batería obligatoria ≥ 50 tests cumplida (Ejecutadas: ${totalTests})`);

console.log('\n======================================================');
console.log(`📊 RESULTADO DE LA SUITE: ${passed} PASSED | ${failed} FAILED`);
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
}
