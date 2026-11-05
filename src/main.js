/**
 * FoodTrack - Main SPA Controller
 * Catering Industrial, Comedores de Planta & Viandas Corporativas
 * AppSec Zero-Trust & Screen Wake Lock API Compliant
 */

import { EmployeeRegistry } from './core/employeeRegistry.js';
import { MenuProductionEngine } from './core/menuProductionEngine.js';
import { HaccpThermalSentinel } from './core/haccpThermalSentinel.js';
import { MealValidationService } from './services/mealValidationService.js';
import { CorporateBillingService } from './services/corporateBillingService.js';
import { WhatsAppMenuNotifier } from './services/whatsAppMenuNotifier.service.js';
import { FoodTrackCache } from './services/foodTrackCache.service.js';
import { Sanitizer } from './utils/sanitizer.js';
import { formatARS, formatDate, formatDateTime, evaluateHaccpTemp, getDietaryBadge } from './utils/formatters.js';

export class FoodTrackApp {
  constructor() {
    this.cache = new FoodTrackCache();
    this.employeeRegistry = new EmployeeRegistry();
    this.menuEngine = new MenuProductionEngine();
    this.haccpSentinel = new HaccpThermalSentinel();
    this.validationService = new MealValidationService(this.employeeRegistry, this.menuEngine);
    this.billingService = new CorporateBillingService(this.validationService, this.employeeRegistry);

    this.currentTab = 'dashboard';
    this.wakeLock = null;
    this.lastTotemScanResult = null;

    this.init();
  }

  init() {
    this.seedDemoDataIfAllowed();
    this.bindEvents();
    this.setupWakeLock();
    this.render();
  }

  seedDemoDataIfAllowed() {
    if (this.cache.isPurged()) return;

    // 1. Seed Client Companies
    const c1 = this.employeeRegistry.registerCompany({
      id: 'PLANT-FORD',
      name: 'Ford Argentina - Planta Pacheco',
      plantAddress: 'Henry Ford y Ruta Panamericana, Pacheco',
      contactPerson: 'Lic. Laura Martínez (RRHH)',
      contactPhone: '+5491144556677',
      contractMealPrice: 8800
    });

    const c2 = this.employeeRegistry.registerCompany({
      id: 'PLANT-ARCOR',
      name: 'Arcor Alimentos - Planta San Fernando',
      plantAddress: 'Av. Libertador 2200, San Fernando',
      contactPerson: 'Ing. Carlos Rossi (Relaciones Laborales)',
      contactPhone: '+5491166778899',
      contractMealPrice: 8500
    });

    // 2. Seed Employees with various shifts & dietary profiles
    const e1 = this.employeeRegistry.registerEmployee({
      id: 'EMP-101',
      dni: '32189456',
      fullName: 'Horacio Darío Martínez',
      companyId: c1.id,
      shift: 'Mañana',
      sector: 'Montaje de Carrocerías',
      dietaryProfile: 'Estándar',
      subsidyPercentage: 80,
      phone: '+5491133445566'
    });

    const e2 = this.employeeRegistry.registerEmployee({
      id: 'EMP-102',
      dni: '28456123',
      fullName: 'Mariana Soledad Gómez',
      companyId: c1.id,
      shift: 'Mañana',
      sector: 'Control de Calidad Final',
      dietaryProfile: 'Sin TACC (Celíaco)', // Ley 26.588
      subsidyPercentage: 80,
      phone: '+5491155667788'
    });

    const e3 = this.employeeRegistry.registerEmployee({
      id: 'EMP-103',
      dni: '35789012',
      fullName: 'Esteban Gabriel Ramos',
      companyId: c1.id,
      shift: 'Tarde',
      sector: 'Pintura y Sellado',
      dietaryProfile: 'Hiposódico',
      subsidyPercentage: 80,
      phone: '+5491177889900'
    });

    const e4 = this.employeeRegistry.registerEmployee({
      id: 'EMP-104',
      dni: '40123987',
      fullName: 'Sofía Belén Navarro',
      companyId: c2.id,
      shift: 'Mañana',
      sector: 'Envasado y Packaging',
      dietaryProfile: 'Vegetariano',
      subsidyPercentage: 75,
      phone: '+5491122334455'
    });

    // 3. Seed Menu for Today
    const todayIso = new Date().toISOString().slice(0, 10);
    this.menuEngine.registerDailyMenu({
      date: todayIso,
      title: 'Menú Ejecutivo Industrial - Día Miércoles',
      cutOffHour: 16,
      options: [
        { id: 'DISH-1', name: 'Milanesa con Puré de Papas Rústico', type: 'traditional', caloriesKcal: 720, isCeliacSafe: false },
        { id: 'DISH-2', name: 'Pechuga Grillé con Vegetales al Vapor', type: 'light', caloriesKcal: 480, isCeliacSafe: false },
        { id: 'DISH-3', name: 'Risotto de Hongos y Calabaza Asada', type: 'vegetarian', caloriesKcal: 520, isCeliacSafe: false },
        { id: 'DISH-4', name: 'Barqueta Hermética Sin TACC (Pechuga + Arroz Yamani)', type: 'celiac_special', caloriesKcal: 540, isCeliacSafe: true }
      ]
    });

    // Record pre-selections
    this.menuEngine.recordEmployeeSelection({
      employeeId: e1.id,
      employeeDni: e1.dni,
      date: todayIso,
      shift: 'Mañana',
      selectedDishId: 'DISH-1',
      forceAfterCutoff: true
    });

    this.menuEngine.recordEmployeeSelection({
      employeeId: e2.id,
      employeeDni: e2.dni,
      date: todayIso,
      shift: 'Mañana',
      selectedDishId: 'DISH-4',
      forceAfterCutoff: true
    });

    // 4. Seed Validated Meal Dispensations
    this.validationService.validateAndDispenseMeal({
      dni: e1.dni,
      shiftDate: todayIso,
      shift: 'Mañana',
      totemDevice: 'Totem-Línea-1'
    });

    // 5. Seed HACCP Thermal Logs
    this.haccpSentinel.recordThermalCheck({
      containerId: 'CARRO-HOT-01',
      containerType: 'Carro Térmico Caliente (Gastronorm)',
      companyId: c1.id,
      destinationPlant: c1.name,
      stage: 'kitchen_dispatch',
      foodCategory: 'hot',
      measuredTempC: 72.5,
      inspectorName: 'Chef Matías Albarracín'
    });

    this.haccpSentinel.recordThermalCheck({
      containerId: 'CARRO-HOT-01',
      containerType: 'Carro Térmico Caliente (Gastronorm)',
      companyId: c1.id,
      destinationPlant: c1.name,
      stage: 'plant_arrival',
      foodCategory: 'hot',
      measuredTempC: 66.8,
      inspectorName: 'Téc. Seguridad Bromatológica'
    });
  }

  setupWakeLock() {
    if ('wakeLock' in navigator) {
      document.addEventListener('visibilitychange', async () => {
        if (this.wakeLock !== null && document.visibilityState === 'visible') {
          try {
            this.wakeLock = await navigator.wakeLock.request('screen');
          } catch (err) {
            console.warn('Wake Lock auto re-engagement warning:', err);
          }
        }
      });
    }
  }

  async toggleWakeLock() {
    if (!('wakeLock' in navigator)) {
      this.showToast('Wake Lock no soportado en este navegador', 'warning');
      return;
    }

    try {
      if (this.wakeLock) {
        await this.wakeLock.release();
        this.wakeLock = null;
        this.showToast('Modo Tótem / Pantalla Activa desactivado', 'info');
      } else {
        this.wakeLock = await navigator.wakeLock.request('screen');
        this.wakeLock.addEventListener('release', () => {
          this.wakeLock = null;
          this.updateWakeLockButton();
        });
        this.showToast('Modo Tótem activado (Pantalla siempre activa)', 'success');
      }
      this.updateWakeLockButton();
    } catch (e) {
      this.showToast(`Error de sensor WakeLock: ${e.message}`, 'warning');
    }
  }

  updateWakeLockButton() {
    const btn = document.getElementById('wakeLockBtn');
    if (!btn) return;
    if (this.wakeLock) {
      btn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white flex items-center gap-1.5 shadow-md';
      btn.textContent = '☀️ Pantalla Activa: ON';
    } else {
      btn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5 border border-slate-700';
      btn.textContent = '🌙 Modo Tótem: OFF';
    }
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    const colors = {
      success: 'bg-emerald-600 text-white',
      error: 'bg-rose-600 text-white',
      warning: 'bg-amber-600 text-white',
      info: 'bg-indigo-600 text-white'
    };

    toast.className = `p-3 rounded-xl shadow-xl text-sm font-medium flex items-center gap-2 transform transition-all duration-300 translate-y-2 ${colors[type] || colors.info}`;
    toast.textContent = message;

    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-x-full');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  bindEvents() {
    document.addEventListener('click', (e) => {
      const tabTarget = e.target.closest('[data-tab]');
      if (tabTarget) {
        const tab = tabTarget.getAttribute('data-tab');
        this.switchTab(tab);
        return;
      }

      const actionTarget = e.target.closest('[data-action]');
      if (actionTarget) {
        const action = actionTarget.getAttribute('data-action');
        this.handleAction(action, actionTarget);
      }
    });

    const wakeBtn = document.getElementById('wakeLockBtn');
    if (wakeBtn) {
      wakeBtn.addEventListener('click', () => this.toggleWakeLock());
    }
  }

  switchTab(tab) {
    this.currentTab = tab;
    document.querySelectorAll('[data-tab]').forEach(el => {
      if (el.getAttribute('data-tab') === tab) {
        el.className = 'px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 flex items-center gap-2';
      } else {
        el.className = 'px-4 py-2 rounded-xl text-sm font-semibold bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800/80 flex items-center gap-2 transition-colors';
      }
    });
    this.render();
  }

  handleAction(action, target) {
    if (action === 'close-modal') {
      this.closeModal();
    } else if (action === 'open-haccp-modal') {
      this.openHaccpModal();
    } else if (action === 'save-haccp-log') {
      this.handleSaveHaccpLog();
    } else if (action === 'open-employee-modal') {
      this.openEmployeeModal();
    } else if (action === 'register-employee') {
      this.handleRegisterEmployee();
    } else if (action === 'totem-scan-dni') {
      this.handleTotemScan();
    } else if (action === 'totem-numpad-key') {
      const key = target.getAttribute('data-key');
      this.handleTotemNumpadKey(key);
    } else if (action === 'totem-clear') {
      const input = document.getElementById('totemDniInput');
      if (input) input.value = '';
    } else if (action === 'generate-batch') {
      this.handleGenerateBatch();
    } else if (action === 'export-batch-csv') {
      const batchId = target.getAttribute('data-id');
      this.handleExportBatchCsv(batchId);
    }
  }

  closeModal() {
    const modal = document.getElementById('mainModal');
    if (modal) modal.classList.add('hidden');
  }

  // --- TOTEM NUMPAD & SCAN ---

  handleTotemNumpadKey(key) {
    const input = document.getElementById('totemDniInput');
    if (!input) return;
    if (key === 'BACK') {
      input.value = input.value.slice(0, -1);
    } else {
      if (input.value.length < 9) {
        input.value += key;
      }
    }
  }

  handleTotemScan() {
    const input = document.getElementById('totemDniInput');
    const dni = input?.value.trim();
    const shift = document.getElementById('totemShiftSelect')?.value || 'Mañana';
    const todayIso = new Date().toISOString().slice(0, 10);

    if (!dni) {
      this.showToast('Ingrese o escanee el DNI del operario', 'warning');
      return;
    }

    const result = this.validationService.validateAndDispenseMeal({
      dni,
      shiftDate: todayIso,
      shift,
      totemDevice: 'Totem-Línea-1'
    });

    this.lastTotemScanResult = result;
    if (input) input.value = '';

    if (result.allowed) {
      this.showToast(result.message, 'success');
    } else {
      this.showToast(result.error, 'error');
    }

    this.render();
  }

  // --- HACCP MODAL & SAVE ---

  openHaccpModal() {
    const modal = document.getElementById('mainModal');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');

    title.textContent = '🌡️ Registro Bromatológico HACCP (Punto Crítico de Control)';

    const companies = this.employeeRegistry.listCompanies();
    const compOptions = companies.map(c => `<option value="${c.id}">${Sanitizer.escapeHTML(c.name)}</option>`).join('');

    const html = `
      <form id="haccpForm" class="space-y-4">
        <div class="bg-indigo-950/40 border border-indigo-800/60 p-3 rounded-xl text-indigo-200 text-xs">
          <strong>Estándar HACCP:</strong> Comida caliente debe despacharse y recibirse a ≥ 65°C. Ensaladas y postres deben conservarse a ≤ 4°C.
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-400 mb-1">ID Contenedor / Carro</label>
            <input type="text" id="haccpContainerId" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200" placeholder="Ej: CARRO-HOT-02" required />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-400 mb-1">Tipo de Contenedor</label>
            <select id="haccpContainerType" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200">
              <option value="Carro Térmico Caliente (Gastronorm)">Carro Térmico Caliente (Gastronorm)</option>
              <option value="Conservadora Isotérmica Frío">Conservadora Isotérmica Frío</option>
              <option value="Caja Hermética Sin TACC">Caja Hermética Sin TACC</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-400 mb-1">Categoría</label>
            <select id="haccpFoodCategory" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200">
              <option value="hot">Plato Caliente (≥ 65°C)</option>
              <option value="cold">Ensalada / Frío (≤ 4°C)</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-400 mb-1">Temperatura Medida (°C)</label>
            <input type="number" step="0.1" id="haccpTempMeasured" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 font-bold" placeholder="Ej: 68.5" required />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-400 mb-1">Etapa de Control</label>
            <select id="haccpStage" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200">
              <option value="kitchen_dispatch">Salida de Cocina Central</option>
              <option value="plant_arrival">Recepción en Comedor de Planta</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-400 mb-1">Planta de Destino</label>
            <select id="haccpCompanySelect" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200">
              ${compOptions}
            </select>
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-400 mb-1">Inspector / Auditor Bromatológico</label>
          <input type="text" id="haccpInspectorName" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200" value="Chef Matías Albarracín" required />
        </div>

        <div class="flex justify-end gap-3 pt-3 border-t border-slate-800">
          <button type="button" data-action="close-modal" class="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700">Cancelar</button>
          <button type="button" data-action="save-haccp-log" class="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30">Guardar Control Térmico</button>
        </div>
      </form>
    `;

    Sanitizer.safeSetInnerHTML(body, html);
    modal.classList.remove('hidden');
  }

  handleSaveHaccpLog() {
    const containerId = document.getElementById('haccpContainerId')?.value;
    const containerType = document.getElementById('haccpContainerType')?.value;
    const foodCategory = document.getElementById('haccpFoodCategory')?.value;
    const measuredTempC = Number(document.getElementById('haccpTempMeasured')?.value);
    const stage = document.getElementById('haccpStage')?.value;
    const companyId = document.getElementById('haccpCompanySelect')?.value;
    const inspectorName = document.getElementById('haccpInspectorName')?.value;

    if (!containerId || isNaN(measuredTempC)) {
      this.showToast('Complete los campos obligatorios de temperatura', 'warning');
      return;
    }

    const company = this.employeeRegistry.getCompany(companyId);

    try {
      const entry = this.haccpSentinel.recordThermalCheck({
        containerId,
        containerType,
        companyId,
        destinationPlant: company ? company.name : companyId,
        stage,
        foodCategory,
        measuredTempC,
        inspectorName
      });

      this.closeModal();
      this.showToast(`Control Térmico ${entry.id} guardado (${entry.evaluationMessage})`, entry.evaluationStatus === 'danger' ? 'error' : 'success');
      this.render();
    } catch (e) {
      this.showToast(e.message, 'error');
    }
  }

  // --- EMPLOYEE MODAL & SAVE ---

  openEmployeeModal() {
    const modal = document.getElementById('mainModal');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');

    title.textContent = 'Empadronar Nuevo Operario en Comedor';

    const companies = this.employeeRegistry.listCompanies();
    const compOptions = companies.map(c => `<option value="${c.id}">${Sanitizer.escapeHTML(c.name)}</option>`).join('');

    const html = `
      <form id="newEmpForm" class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-400 mb-1">Nombre Completo</label>
            <input type="text" id="nempFullName" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200" placeholder="Ej: Roberto Carlos Paz" required />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-400 mb-1">DNI</label>
            <input type="text" id="nempDni" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200" placeholder="Ej: 33901844" required />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-400 mb-1">Empresa / Planta</label>
            <select id="nempCompany" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200">
              ${compOptions}
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-400 mb-1">Turno Habitual</label>
            <select id="nempShift" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200">
              <option value="Mañana">Mañana (06:00 - 14:00)</option>
              <option value="Tarde">Tarde (14:00 - 22:00)</option>
              <option value="Noche">Noche (22:00 - 06:00)</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-400 mb-1">Sector / Área</label>
            <input type="text" id="nempSector" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200" placeholder="Ej: Mecánica / Chapería" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-400 mb-1">Subsidio Empresa (%)</label>
            <input type="number" id="nempSubsidy" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200" value="80" />
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-400 mb-1">Régimen Dietético / Alerta Médica</label>
          <select id="nempDiet" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200">
            <option value="Estándar">Estándar (Sin restricciones)</option>
            <option value="Sin TACC (Celíaco)">🌾❌ Sin TACC (Celíaco - Ley 26.588)</option>
            <option value="Hiposódico">🧂❌ Hiposódico (Sin Sal)</option>
            <option value="Diabético">🩺 Diabético (Control Carbohidratos)</option>
            <option value="Vegetariano">🌱 Vegetariano</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-400 mb-1">Teléfono Móvil (WhatsApp)</label>
          <input type="tel" id="nempPhone" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200" value="+5491100000000" />
        </div>

        <div class="flex justify-end gap-3 pt-3 border-t border-slate-800">
          <button type="button" data-action="close-modal" class="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700">Cancelar</button>
          <button type="button" data-action="register-employee" class="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30">Guardar Operario</button>
        </div>
      </form>
    `;

    Sanitizer.safeSetInnerHTML(body, html);
    modal.classList.remove('hidden');
  }

  handleRegisterEmployee() {
    const fullName = document.getElementById('nempFullName')?.value;
    const dni = document.getElementById('nempDni')?.value;
    const companyId = document.getElementById('nempCompany')?.value;
    const shift = document.getElementById('nempShift')?.value;
    const sector = document.getElementById('nempSector')?.value;
    const dietaryProfile = document.getElementById('nempDiet')?.value;
    const subsidyPercentage = Number(document.getElementById('nempSubsidy')?.value) || 80;
    const phone = document.getElementById('nempPhone')?.value;

    if (!fullName || !dni || !companyId) {
      this.showToast('Complete nombre, DNI y empresa del operario', 'warning');
      return;
    }

    try {
      const emp = this.employeeRegistry.registerEmployee({
        fullName,
        dni,
        companyId,
        shift,
        sector,
        dietaryProfile,
        subsidyPercentage,
        phone
      });

      this.closeModal();
      this.showToast(`Operario ${emp.fullName} empadronado con éxito`, 'success');
      this.render();
    } catch (e) {
      this.showToast(e.message, 'error');
    }
  }

  // --- BATCH & CSV EXPORT ---

  handleGenerateBatch() {
    const compId = document.getElementById('billingCompanySelect')?.value || 'PLANT-FORD';
    const period = document.getElementById('billingPeriodInput')?.value || new Date().toISOString().slice(0, 7);

    try {
      const batch = this.billingService.generateMonthlyBatch({
        companyId: compId,
        periodYearMonth: period
      });

      this.showToast(`Lote ${batch.id} para ${batch.companyName} generado (${batch.totalMeals} raciones - ${batch.auditStatus})`, 'success');
      this.render();
    } catch (e) {
      this.showToast(e.message, 'error');
    }
  }

  handleExportBatchCsv(batchId) {
    try {
      const csv = this.billingService.exportBatchCSV(batchId);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FoodTrack_Liquidacion_${batchId}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.showToast('CSV con BOM UTF-8 exportado exitosamente para Excel', 'success');
    } catch (e) {
      this.showToast(e.message, 'error');
    }
  }

  // --- RENDER TABS ---

  render() {
    const mainView = document.getElementById('mainView');
    if (!mainView) return;

    if (this.currentTab === 'dashboard') {
      this.renderDashboard(mainView);
    } else if (this.currentTab === 'totem') {
      this.renderTotem(mainView);
    } else if (this.currentTab === 'production') {
      this.renderProduction(mainView);
    } else if (this.currentTab === 'employees') {
      this.renderEmployees(mainView);
    } else if (this.currentTab === 'haccp') {
      this.renderHaccp(mainView);
    } else if (this.currentTab === 'billing') {
      this.renderBilling(mainView);
    }

    this.updateWakeLockButton();
  }

  renderDashboard(container) {
    const employees = this.employeeRegistry.listEmployees();
    const companies = this.employeeRegistry.listCompanies();
    const transactions = this.validationService.listTransactions();
    const haccpSummary = this.haccpSentinel.getThermalAuditSummary();

    const todayIso = new Date().toISOString().slice(0, 10);
    const todayTx = transactions.filter(t => t.shiftDate === todayIso);
    const totalSubsidy = transactions.reduce((sum, t) => sum + (t.companySubsidyAmount || 0), 0);

    const html = `
      <div class="space-y-6">
        <!-- Metrics -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl">
            <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Raciones Servidas Hoy</div>
            <div class="text-3xl font-extrabold text-emerald-400 mt-2">${todayTx.length}</div>
            <div class="text-xs text-slate-400 mt-1">${transactions.length} acumuladas mes</div>
          </div>

          <div class="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl">
            <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Operarios en Padrón</div>
            <div class="text-3xl font-extrabold text-white mt-2">${employees.length}</div>
            <div class="text-xs text-indigo-400 mt-1">${companies.length} plantas corporativas</div>
          </div>

          <div class="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl">
            <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Inocuidad HACCP</div>
            <div class="text-3xl font-extrabold text-white mt-2">${haccpSummary.complianceRate}%</div>
            <div class="text-xs text-emerald-400 mt-1">${haccpSummary.haccpStatus}</div>
          </div>

          <div class="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl">
            <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Subsidio B2B Acumulado</div>
            <div class="text-2xl font-extrabold text-white mt-2">${formatARS(totalSubsidy)}</div>
            <div class="text-xs text-slate-400 mt-1">Cero Disputas Facturación</div>
          </div>
        </div>

        <!-- Banner Action -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="bg-gradient-to-r from-indigo-950/50 to-slate-900 p-5 rounded-2xl border border-indigo-800/40 flex items-center justify-between">
            <div>
              <h3 class="text-base font-bold text-white flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Tótem de Autoservicio en Línea (< 1s)
              </h3>
              <p class="text-xs text-slate-300 mt-1">Validación instantánea, prevención de doble ración y alerta de dietas Sin TACC.</p>
            </div>
            <button data-tab="totem" class="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 whitespace-nowrap">
              Abrir Tótem
            </button>
          </div>

          <div class="bg-gradient-to-r from-emerald-950/50 to-slate-900 p-5 rounded-2xl border border-emerald-800/40 flex items-center justify-between">
            <div>
              <h3 class="text-base font-bold text-white">Cocina Central Cero Desperdicio</h3>
              <p class="text-xs text-slate-300 mt-1">Cálculo exacto de raciones por turno + 3% contingencia antes del cut-off 16:00 hs.</p>
            </div>
            <button data-tab="production" class="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/30 whitespace-nowrap">
              Ver Batch de Cocina
            </button>
          </div>
        </div>

        <!-- Recent Transactions -->
        <div class="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 shadow-xl">
          <h3 class="text-sm font-bold text-white mb-4">Últimas Viandas Validadas en Línea de Servicio</h3>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="text-slate-400 border-b border-slate-800 uppercase text-[10px] tracking-wider">
                <tr>
                  <th class="pb-3">ID Transacción</th>
                  <th class="pb-3">Operario</th>
                  <th class="pb-3">Empresa / Planta</th>
                  <th class="pb-3">Turno</th>
                  <th class="pb-3">Plato Servido</th>
                  <th class="pb-3">Régimen Dietético</th>
                  <th class="pb-3">Sello SHA-256</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/60 text-slate-300">
                ${transactions.length === 0 ? '<tr><td colspan="7" class="py-4 text-center text-slate-500">No hay viandas validadas aún</td></tr>' : ''}
                ${transactions.map(t => `
                  <tr>
                    <td class="py-3 font-mono font-semibold text-indigo-400">${t.id}</td>
                    <td class="py-3 font-medium text-white">${Sanitizer.escapeHTML(t.employeeName)} <span class="text-slate-500">(${t.dni})</span></td>
                    <td class="py-3">${Sanitizer.escapeHTML(t.companyName)}</td>
                    <td class="py-3"><span class="px-2 py-0.5 rounded-md text-[10px] bg-slate-800 text-slate-300">${t.shift}</span></td>
                    <td class="py-3 font-medium text-slate-200">${Sanitizer.escapeHTML(t.dishServed)}</td>
                    <td class="py-3">
                      <span class="px-2 py-0.5 rounded-full text-[10px] ${t.dietaryBadge?.className || 'bg-slate-800 text-slate-300'}">
                        ${t.dietaryBadge?.label || t.dietaryProfile}
                      </span>
                    </td>
                    <td class="py-3 font-mono text-[10px] text-emerald-400" title="${t.hashSeal}">
                      🔒 ${t.hashSeal ? t.hashSeal.slice(0, 10) + '...' : '-'}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    Sanitizer.safeSetInnerHTML(container, html);
  }

  renderTotem(container) {
    const res = this.lastTotemScanResult;

    const html = `
      <div class="max-w-3xl mx-auto space-y-6">
        <div class="text-center space-y-1">
          <h2 class="text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2">
            <span>🥗</span> Tótem de Autoservicio de Comedor
          </h2>
          <p class="text-xs text-slate-400">Acerque su tarjeta, escanee su código QR o ingrese su número de DNI para retirar la bandeja.</p>
        </div>

        <!-- Scan Input & Visual Display -->
        <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
          <div class="flex items-center justify-between border-b border-slate-800 pb-4">
            <div class="flex items-center gap-2 text-xs text-slate-400">
              <span class="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></span>
              <span>Línea 1 · Activa</span>
            </div>
            <div class="flex items-center gap-2">
              <label class="text-xs text-slate-400">Turno:</label>
              <select id="totemShiftSelect" class="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1 text-xs text-white">
                <option value="Mañana" selected>Mañana (06:00 - 14:00)</option>
                <option value="Tarde">Tarde (14:00 - 22:00)</option>
                <option value="Noche">Noche (22:00 - 06:00)</option>
              </select>
            </div>
          </div>

          <!-- DNI Display Box -->
          <div class="relative">
            <input type="text" id="totemDniInput" class="w-full bg-slate-950 border-2 border-indigo-600/60 rounded-2xl py-4 px-6 text-3xl font-mono font-bold text-center text-white tracking-widest focus:outline-none focus:border-indigo-400 shadow-inner" placeholder="INGRESE DNI" readonly />
          </div>

          <!-- Interactive Numpad for Touchscreen Totem -->
          <div class="grid grid-cols-3 gap-3 max-w-xs mx-auto">
            ${['1','2','3','4','5','6','7','8','9'].map(k => `
              <button data-action="totem-numpad-key" data-key="${k}" class="h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white text-xl font-bold border border-slate-700 shadow-md transition-all">
                ${k}
              </button>
            `).join('')}
            <button data-action="totem-clear" class="h-14 rounded-2xl bg-slate-800/60 hover:bg-slate-700 text-rose-400 text-sm font-bold border border-slate-700">
              BORRAR
            </button>
            <button data-action="totem-numpad-key" data-key="0" class="h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white text-xl font-bold border border-slate-700 shadow-md transition-all">
              0
            </button>
            <button data-action="totem-numpad-key" data-key="BACK" class="h-14 rounded-2xl bg-slate-800/60 hover:bg-slate-700 text-amber-400 text-sm font-bold border border-slate-700">
              ⌫
            </button>
          </div>

          <button data-action="totem-scan-dni" class="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 active:scale-98 text-white font-extrabold text-base shadow-xl shadow-emerald-600/30 tracking-wide uppercase transition-all">
            Validar Retiro de Vianda
          </button>
        </div>

        <!-- Result Feedback Banner -->
        ${res ? `
          <div class="p-6 rounded-3xl border ${res.allowed ? 'bg-emerald-950/60 border-emerald-600/60' : 'bg-rose-950/60 border-rose-600/60'} shadow-2xl transition-all">
            ${res.allowed ? `
              <div class="space-y-4 text-center">
                <div class="text-4xl">✅</div>
                <div>
                  <h3 class="text-xl font-extrabold text-white">${Sanitizer.escapeHTML(res.employeeName)}</h3>
                  <p class="text-xs text-emerald-300 font-medium">${Sanitizer.escapeHTML(res.companyName)}</p>
                </div>

                <div class="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 max-w-md mx-auto text-left space-y-2">
                  <div class="flex justify-between text-xs">
                    <span class="text-slate-400">Plato a Entregar:</span>
                    <span class="font-bold text-white">${Sanitizer.escapeHTML(res.dishServed)}</span>
                  </div>

                  ${res.hasMedicalAlert ? `
                    <div class="p-3 rounded-xl ${res.dietaryBadge?.className || 'bg-amber-950 text-amber-300'} text-xs font-bold text-center">
                      ${res.dietaryBadge?.label || 'ALERTA DE DIETA MÉDICA'}
                    </div>
                  ` : ''}

                  <div class="text-[10px] font-mono text-slate-500 text-center pt-1 border-t border-slate-800">
                    Sello Criptográfico: ${res.transaction?.hashSeal?.slice(0, 16)}...
                  </div>
                </div>
              </div>
            ` : `
              <div class="space-y-2 text-center">
                <div class="text-4xl">⛔</div>
                <h3 class="text-lg font-bold text-rose-300">${Sanitizer.escapeHTML(res.error)}</h3>
                <p class="text-xs text-slate-400">Si considera que es un error, por favor consulte con la jefatura de personal o el supervisor del comedor.</p>
              </div>
            `}
          </div>
        ` : ''}
      </div>
    `;

    Sanitizer.safeSetInnerHTML(container, html);
  }

  renderProduction(container) {
    const todayIso = new Date().toISOString().slice(0, 10);
    const menu = this.menuEngine.getMenuForDate(todayIso);
    const batch = menu ? this.menuEngine.calculateKitchenProductionBatch({ date: todayIso, shift: 'Mañana' }) : null;

    const html = `
      <div class="space-y-6">
        <div class="flex justify-between items-center">
          <div>
            <h2 class="text-lg font-bold text-white">Cocina Central & Planificación Cero Desperdicio</h2>
            <p class="text-xs text-slate-400">Cálculo automático de lotes de cocción exactos + 3% de contingencia según elecciones anticipadas.</p>
          </div>
          <div class="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 font-mono">
            Fecha de Servicio: ${todayIso}
          </div>
        </div>

        ${!menu ? `
          <div class="bg-slate-900 p-8 rounded-2xl border border-slate-800 text-center text-slate-500">
            No hay menú cargado para la fecha de hoy
          </div>
        ` : `
          <!-- Production Metrics -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl">
              <div class="text-xs text-slate-400 uppercase font-semibold">Raciones Solicitadas</div>
              <div class="text-3xl font-extrabold text-white mt-1">${batch.totalRequested}</div>
              <div class="text-xs text-slate-400 mt-1">Pedidos antes de cut-off 16:00 hs</div>
            </div>

            <div class="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl">
              <div class="text-xs text-slate-400 uppercase font-semibold">Contingencia Segura (+3%)</div>
              <div class="text-3xl font-extrabold text-amber-400 mt-1">+${batch.totalContingency}</div>
              <div class="text-xs text-slate-400 mt-1">Imprevistos de turno o rotura barqueta</div>
            </div>

            <div class="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl">
              <div class="text-xs text-slate-400 uppercase font-semibold">Total a Cocinar en Batch</div>
              <div class="text-3xl font-extrabold text-emerald-400 mt-1">${batch.totalBatch}</div>
              <div class="text-xs text-emerald-400 mt-1">0% Sobreproducción / Cero Desperdicio</div>
            </div>
          </div>

          <!-- Dishes Production Sheet -->
          <div class="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
            <h3 class="text-sm font-bold text-white border-b border-slate-800 pb-3">Planilla de Cocina & Armado de Barquetas (Turno Mañana)</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              ${batch.dishes.map(d => `
                <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
                  <div>
                    <span class="text-[10px] font-mono text-indigo-400">${d.dishId}</span>
                    <h4 class="text-sm font-bold text-white">${Sanitizer.escapeHTML(d.dishName)}</h4>
                    <div class="text-xs text-slate-400">Tipo: <span class="capitalize">${d.dishType}</span></div>
                  </div>
                  <div class="text-right">
                    <div class="text-2xl font-black text-emerald-400">${d.totalProductionBatch} <span class="text-xs font-normal text-slate-400">raciones</span></div>
                    <div class="text-[10px] text-slate-500">${d.requestedCount} pedidos + ${d.contingencyCount} margen</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `}
      </div>
    `;

    Sanitizer.safeSetInnerHTML(container, html);
  }

  renderEmployees(container) {
    const employees = this.employeeRegistry.listEmployees();

    const html = `
      <div class="space-y-4">
        <div class="flex justify-between items-center">
          <div>
            <h2 class="text-lg font-bold text-white">Padrón de Operarios por Planta</h2>
            <p class="text-xs text-slate-400">Gestión de turnos, subsidios y dietas médicas especiales (Sin TACC Ley 26.588).</p>
          </div>
          <button data-action="open-employee-modal" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-1.5">
            + Nuevo Operario
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${employees.map(e => {
            const badge = getDietaryBadge(e.dietaryProfile);
            return `
              <div class="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 shadow-xl flex flex-col justify-between">
                <div>
                  <div class="flex justify-between items-start">
                    <div>
                      <span class="text-[10px] font-mono text-indigo-400">${e.id}</span>
                      <h3 class="text-base font-bold text-white">${Sanitizer.escapeHTML(e.fullName)}</h3>
                      <div class="text-xs font-mono text-slate-300">DNI: ${Sanitizer.escapeHTML(e.dni)}</div>
                    </div>
                    <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">
                      Turno ${e.shift}
                    </span>
                  </div>

                  <div class="mt-4 space-y-2 text-xs">
                    <div class="flex justify-between text-slate-400">
                      <span>Planta:</span>
                      <span class="font-medium text-slate-200 truncate max-w-[170px]">${Sanitizer.escapeHTML(e.companyName)}</span>
                    </div>

                    <div class="flex justify-between text-slate-400">
                      <span>Sector:</span>
                      <span class="font-medium text-slate-200">${Sanitizer.escapeHTML(e.sector)}</span>
                    </div>

                    <div class="flex justify-between text-slate-400">
                      <span>Subsidio Empresa:</span>
                      <span class="font-bold text-emerald-400">${e.subsidyPercentage}%</span>
                    </div>

                    <div class="pt-2 border-t border-slate-800">
                      <div class="text-[10px] text-slate-500 uppercase font-semibold mb-1">Perfil Nutricional</div>
                      <div class="p-2 rounded-xl text-xs ${badge.className}">
                        ${badge.label}
                      </div>
                    </div>
                  </div>
                </div>

                <div class="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
                  <a href="${Sanitizer.sanitizeURL(WhatsAppMenuNotifier.cleanPhoneNumber(e.phone) ? 'https://wa.me/' + WhatsAppMenuNotifier.cleanPhoneNumber(e.phone) : '#')}" target="_blank" rel="noopener noreferrer" class="text-emerald-400 hover:underline flex items-center gap-1 font-semibold">
                    💬 Notificar Menú
                  </a>
                  <span class="text-[10px] text-slate-500">Activo</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    Sanitizer.safeSetInnerHTML(container, html);
  }

  renderHaccp(container) {
    const logs = this.haccpSentinel.listLogs();
    const summary = this.haccpSentinel.getThermalAuditSummary();

    const html = `
      <div class="space-y-6">
        <div class="flex justify-between items-center">
          <div>
            <h2 class="text-lg font-bold text-white">Auditoría Bromatológica HACCP</h2>
            <p class="text-xs text-slate-400">Control de temperatura en despacho desde cocina central y recepción en planta (Inocuidad alimentaria).</p>
          </div>
          <button data-action="open-haccp-modal" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-1.5">
            + Nuevo Control Térmico
          </button>
        </div>

        <!-- HACCP Status Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl">
            <div class="text-xs text-slate-400 uppercase font-semibold">Controles Realizados</div>
            <div class="text-3xl font-extrabold text-white mt-1">${summary.totalChecks}</div>
            <div class="text-xs text-slate-400 mt-1">Carros y Conservadoras</div>
          </div>

          <div class="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl">
            <div class="text-xs text-slate-400 uppercase font-semibold">Temperaturas Seguras</div>
            <div class="text-3xl font-extrabold text-emerald-400 mt-1">${summary.safeCount}</div>
            <div class="text-xs text-emerald-400 mt-1">≥ 65°C / ≤ 4°C</div>
          </div>

          <div class="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl">
            <div class="text-xs text-slate-400 uppercase font-semibold">En Margen de Alerta</div>
            <div class="text-3xl font-extrabold text-amber-400 mt-1">${summary.warningCount}</div>
            <div class="text-xs text-slate-400 mt-1">Consumo inmediato</div>
          </div>

          <div class="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl">
            <div class="text-xs text-slate-400 uppercase font-semibold">Desvíos Críticos</div>
            <div class="text-3xl font-extrabold text-rose-400 mt-1">${summary.dangerCount}</div>
            <div class="text-xs text-slate-400 mt-1">Regeneración obligatoria</div>
          </div>
        </div>

        <!-- HACCP Log Table -->
        <div class="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 shadow-xl">
          <h3 class="text-sm font-bold text-white mb-4">Registro Histórico de Puntos Críticos de Control (PCC)</h3>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="text-slate-400 border-b border-slate-800 uppercase text-[10px] tracking-wider">
                <tr>
                  <th class="pb-3">ID Registro</th>
                  <th class="pb-3">Contenedor</th>
                  <th class="pb-3">Destino</th>
                  <th class="pb-3">Etapa</th>
                  <th class="pb-3">Temp. Medida</th>
                  <th class="pb-3">Estado Bromatológico</th>
                  <th class="pb-3">Inspector</th>
                  <th class="pb-3">Fecha y Hora</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/60 text-slate-300">
                ${logs.length === 0 ? '<tr><td colspan="8" class="py-4 text-center text-slate-500">No hay controles térmicos registrados</td></tr>' : ''}
                ${logs.map(l => `
                  <tr>
                    <td class="py-3 font-mono font-semibold text-indigo-400">${l.id}</td>
                    <td class="py-3 font-medium text-white">${Sanitizer.escapeHTML(l.containerId)} <span class="text-[10px] text-slate-500">(${Sanitizer.escapeHTML(l.containerType)})</span></td>
                    <td class="py-3">${Sanitizer.escapeHTML(l.destinationPlant)}</td>
                    <td class="py-3"><span class="px-2 py-0.5 rounded-md text-[10px] bg-slate-800 text-slate-300">${l.stage === 'kitchen_dispatch' ? 'Salida Cocina' : 'Llegada Planta'}</span></td>
                    <td class="py-3 font-bold text-sm ${l.evaluationStatus === 'safe' ? 'text-emerald-400' : l.evaluationStatus === 'warning' ? 'text-amber-400' : 'text-rose-400'}">${l.measuredTempC}°C</td>
                    <td class="py-3">
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        l.evaluationStatus === 'safe' ? 'bg-emerald-950 text-emerald-300 border-emerald-800' :
                        l.evaluationStatus === 'warning' ? 'bg-amber-950 text-amber-300 border-amber-800' :
                        'bg-rose-950 text-rose-300 border-rose-800'
                      }">
                        ${Sanitizer.escapeHTML(l.evaluationMessage)}
                      </span>
                    </td>
                    <td class="py-3 text-slate-400">${Sanitizer.escapeHTML(l.inspectorName)}</td>
                    <td class="py-3 text-slate-500 font-mono text-[10px]">${formatDateTime(l.recordedAt)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    Sanitizer.safeSetInnerHTML(container, html);
  }

  renderBilling(container) {
    const batches = this.billingService.listBatches();
    const companies = this.employeeRegistry.listCompanies();

    const html = `
      <div class="space-y-6">
        <div>
          <h2 class="text-lg font-bold text-white">Liquidación B2B & Conciliación Cero Disputas</h2>
          <p class="text-xs text-slate-400">Generación mensual de lotes de comedor con desglose de subsidio corporativo y copago por nómina.</p>
        </div>

        <!-- Generator -->
        <div class="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
          <h3 class="text-sm font-bold text-white border-b border-slate-800 pb-3">Generar Lote de Facturación Mensual</h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1">Empresa / Planta Cliente</label>
              <select id="billingCompanySelect" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200">
                ${companies.map(c => `<option value="${c.id}">${Sanitizer.escapeHTML(c.name)}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1">Período Mensual (AAAA-MM)</label>
              <input type="month" id="billingPeriodInput" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200" value="${new Date().toISOString().slice(0, 7)}" />
            </div>
            <div class="flex items-end">
              <button data-action="generate-batch" class="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30">
                ⚡ Generar y Auditar Lote B2B
              </button>
            </div>
          </div>
        </div>

        <!-- Batches List -->
        <div class="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
          <h3 class="text-sm font-bold text-white">Lotes Conciliados Listos para Facturación RRHH</h3>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="text-slate-400 border-b border-slate-800 uppercase text-[10px] tracking-wider">
                <tr>
                  <th class="pb-3">ID Lote</th>
                  <th class="pb-3">Empresa</th>
                  <th class="pb-3">Período</th>
                  <th class="pb-3">Raciones</th>
                  <th class="pb-3">Subsidio Empresa</th>
                  <th class="pb-3">Copago Nómina</th>
                  <th class="pb-3">Estado Auditoría</th>
                  <th class="pb-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/60 text-slate-300">
                ${batches.length === 0 ? '<tr><td colspan="8" class="py-4 text-center text-slate-500">No hay lotes generados aún</td></tr>' : ''}
                ${batches.map(b => `
                  <tr>
                    <td class="py-3 font-mono font-semibold text-indigo-400">${b.id}</td>
                    <td class="py-3 font-medium text-white">${Sanitizer.escapeHTML(b.companyName)}</td>
                    <td class="py-3 font-mono">${b.period}</td>
                    <td class="py-3 font-bold">${b.totalMeals}</td>
                    <td class="py-3 font-bold text-emerald-400">${formatARS(b.totalCompanySubsidy)}</td>
                    <td class="py-3 text-slate-300">${formatARS(b.totalEmployeeCopay)}</td>
                    <td class="py-3">
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold ${b.auditStatus === 'audited_zero_disputes' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'}">
                        ${b.auditStatus === 'audited_zero_disputes' ? 'Cero Disputas Garantizado' : 'Requiere Revisión'}
                      </span>
                    </td>
                    <td class="py-3 text-right">
                      <button data-action="export-batch-csv" data-id="${b.id}" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center gap-1 ml-auto">
                        📥 Exportar CSV Excel
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    Sanitizer.safeSetInnerHTML(container, html);
  }
}

// Instantiate on DOM load
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    window.app = new FoodTrackApp();
  });
}
