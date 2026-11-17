/**
 * FoodTrack - Main SPA Controller
 * Catering Industrial, Comedores de Planta y Viandas Corporativas
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
import { iconSvg } from './utils/icons.js';
import { formatARS, formatDateTime, getDietaryBadge } from './utils/formatters.js';

export class FoodTrackApp {
  constructor() {
    this.cache = new FoodTrackCache();
    this.initRegistries();

    this.currentTab = 'dashboard';
    this.wakeLock = null;
    this.lastTotemScanResult = null;
    this.isLoading = false;
    this.lastError = null;
    this.lastFocusedElement = null;

    this.init();
  }

  initRegistries() {
    this.employeeRegistry = new EmployeeRegistry();
    this.menuEngine = new MenuProductionEngine();
    this.haccpSentinel = new HaccpThermalSentinel();
    this.validationService = new MealValidationService(this.employeeRegistry, this.menuEngine);
    this.billingService = new CorporateBillingService(this.validationService, this.employeeRegistry);
  }

  init() {
    this.isLoading = true;
    this.render();

    try {
      const saved = this.cache.loadState();
      if (saved && typeof saved === 'object') {
        this.restoreState(saved);
      } else {
        this.seedDemoDataIfAllowed();
      }
      this.bindEvents();
      this.setupWakeLock();
    } catch (err) {
      this.lastError = err?.message || 'Error al inicializar el estado local de FoodTrack.';
    } finally {
      this.isLoading = false;
      this.render();
    }
  }

  serializeState() {
    return {
      schemaVersion: 1,
      companies: Array.from(this.employeeRegistry.companies.values()),
      employees: Array.from(this.employeeRegistry.employees.values()),
      menus: Array.from(this.menuEngine.menus.values()),
      dailySelections: Array.from(this.menuEngine.dailySelections.values()),
      transactions: Array.from(this.validationService.transactions.values()),
      dailyShiftConsumed: Array.from(this.validationService.dailyShiftConsumed.values()),
      haccpLogs: Array.from(this.haccpSentinel.logs.values()),
      batches: Array.from(this.billingService.batches.values())
    };
  }

  persistState() {
    try {
      this.cache.saveState(this.serializeState());
    } catch (err) {
      this.lastError = err?.message || 'No se pudo guardar el estado local.';
    }
  }

  restoreState(saved) {
    this.initRegistries();
    (saved.companies || []).forEach((c) => {
      this.employeeRegistry.companies.set(c.id, c);
    });
    (saved.employees || []).forEach((e) => {
      this.employeeRegistry.employees.set(e.id, e);
    });
    (saved.menus || []).forEach((m) => {
      this.menuEngine.menus.set(m.date, m);
    });
    (saved.dailySelections || []).forEach((s) => {
      this.menuEngine.dailySelections.set(s.id, s);
    });
    (saved.transactions || []).forEach((t) => {
      this.validationService.transactions.set(t.id, t);
    });
    (saved.dailyShiftConsumed || []).forEach((k) => {
      this.validationService.dailyShiftConsumed.add(k);
    });
    (saved.haccpLogs || []).forEach((l) => {
      this.haccpSentinel.logs.set(l.id, l);
    });
    (saved.batches || []).forEach((b) => {
      this.billingService.batches.set(b.id, b);
    });
  }

  hasDemoData() {
    const lists = [
      this.employeeRegistry.listCompanies(),
      this.employeeRegistry.listEmployees(),
      Array.from(this.menuEngine.menus.values()),
      this.validationService.listTransactions(),
      this.haccpSentinel.listLogs()
    ];
    return lists.some((arr) => arr.some((item) => item.isDemo === true));
  }

  purgeDemoData() {
    this.cache.clear();
    this.initRegistries();
    this.lastTotemScanResult = null;
    this.lastError = null;
    this.showToast('Datos [DEMO] purgados. El sistema quedó limpio para operación real.', 'info');
    this.render();
  }

  seedDemoDataIfAllowed() {
    if (this.cache.isPurged()) return;

    // 1. Seed Demo Client Companies
    const c1 = this.employeeRegistry.registerCompany({
      id: 'PLANT-FORD',
      name: 'Ford Argentina - Planta Pacheco',
      plantAddress: 'Henry Ford y Ruta Panamericana, Pacheco',
      contactPerson: 'Lic. Laura Martínez (RRHH)',
      contactPhone: '+5491144556677',
      contractMealPrice: 8800
    });
    c1.isDemo = true;

    const c2 = this.employeeRegistry.registerCompany({
      id: 'PLANT-ARCOR',
      name: 'Arcor Alimentos - Planta San Fernando',
      plantAddress: 'Av. Libertador 2200, San Fernando',
      contactPerson: 'Ing. Carlos Rossi (Relaciones Laborales)',
      contactPhone: '+5491166778899',
      contractMealPrice: 8500
    });
    c2.isDemo = true;

    // 2. Seed Demo Employees
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
    e1.isDemo = true;

    const e2 = this.employeeRegistry.registerEmployee({
      id: 'EMP-102',
      dni: '28456123',
      fullName: 'Mariana Soledad Gómez',
      companyId: c1.id,
      shift: 'Mañana',
      sector: 'Control de Calidad Final',
      dietaryProfile: 'Sin TACC (Celíaco)',
      subsidyPercentage: 80,
      phone: '+5491155667788'
    });
    e2.isDemo = true;

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
    e3.isDemo = true;

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
    e4.isDemo = true;

    // 3. Seed Demo Menu for Today
    const todayIso = new Date().toISOString().slice(0, 10);
    const demoMenu = this.menuEngine.registerDailyMenu({
      date: todayIso,
      title: 'Menú Ejecutivo Industrial - Servicio Diario',
      cutOffHour: 16,
      options: [
        { id: 'DISH-1', name: 'Milanesa con Puré de Papas Rústico', type: 'traditional', caloriesKcal: 720, isCeliacSafe: false },
        { id: 'DISH-2', name: 'Pechuga Grillé con Vegetales al Vapor', type: 'light', caloriesKcal: 480, isCeliacSafe: false },
        { id: 'DISH-3', name: 'Risotto de Hongos y Calabaza Asada', type: 'vegetarian', caloriesKcal: 520, isCeliacSafe: false },
        { id: 'DISH-4', name: 'Barqueta Hermética Sin TACC (Pechuga + Arroz Yamani)', type: 'celiac_special', caloriesKcal: 540, isCeliacSafe: true }
      ]
    });
    demoMenu.isDemo = true;

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

    // 4. Seed Demo Validated Meal Dispensation
    const demoTxRes = this.validationService.validateAndDispenseMeal({
      dni: e1.dni,
      shiftDate: todayIso,
      shift: 'Mañana',
      totemDevice: 'Totem-Linea-1'
    });
    if (demoTxRes?.transaction) {
      demoTxRes.transaction.isDemo = true;
    }

    // 5. Seed Demo HACCP Thermal Logs
    const h1 = this.haccpSentinel.recordThermalCheck({
      containerId: 'CARRO-HOT-01',
      containerType: 'Carro Térmico Caliente (Gastronorm)',
      companyId: c1.id,
      destinationPlant: c1.name,
      stage: 'kitchen_dispatch',
      foodCategory: 'hot',
      measuredTempC: 72.5,
      inspectorName: 'Chef Matías Albarracín'
    });
    h1.isDemo = true;

    const h2 = this.haccpSentinel.recordThermalCheck({
      containerId: 'CARRO-HOT-01',
      containerType: 'Carro Térmico Caliente (Gastronorm)',
      companyId: c1.id,
      destinationPlant: c1.name,
      stage: 'plant_arrival',
      foodCategory: 'hot',
      measuredTempC: 66.8,
      inspectorName: 'Téc. Seguridad Bromatológica'
    });
    h2.isDemo = true;

    this.persistState();
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
      btn.className = 'px-3.5 py-2 min-h-[44px] rounded-lg text-xs font-bold bg-[#047857] hover:bg-[#065f46] text-white flex items-center gap-2 transition-colors';
      Sanitizer.safeSetInnerHTML(
        btn,
        `${iconSvg('sun', 'w-4 h-4 shrink-0')}<span>Pantalla Activa: ON</span>`
      );
    } else {
      btn.className = 'px-3.5 py-2 min-h-[44px] rounded-lg text-xs font-semibold bg-[#241e1a] hover:bg-[#2e2520] text-[#e3d7cf] flex items-center gap-2 border border-[#3d322b] transition-colors';
      Sanitizer.safeSetInnerHTML(
        btn,
        `${iconSvg('moon', 'w-4 h-4 shrink-0')}<span class="hidden sm:inline">Modo Tótem:</span><span>OFF</span>`
      );
    }
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    const colors = {
      success: 'bg-[#047857] text-white border border-emerald-500',
      error: 'bg-[#be123c] text-white border border-rose-400',
      warning: 'bg-[#92400e] text-amber-100 border border-amber-500',
      info: 'bg-[#c2410c] text-white border border-[#fb923c]'
    };

    toast.className = `p-3 rounded-lg shadow-xl text-sm font-medium flex items-center gap-2 transform transition-all duration-200 ${colors[type] || colors.info}`;
    toast.textContent = message;

    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('opacity-0');
      setTimeout(() => toast.remove(), 250);
    }, 4000);
  }

  bindEvents() {
    if (this._eventsBound) return;
    this._eventsBound = true;

    document.addEventListener('click', (e) => {
      const modal = document.getElementById('mainModal');
      if (modal && !modal.classList.contains('hidden') && e.target === modal) {
        this.closeModal();
        return;
      }

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

    document.addEventListener('submit', (e) => {
      const form = e.target;
      if (!form || !form.id) return;

      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        this.showToast('Revise los campos obligatorios antes de continuar', 'warning');
        return;
      }

      if (form.id === 'haccpForm') {
        this.handleSaveHaccpLog();
      } else if (form.id === 'newEmpForm') {
        this.handleRegisterEmployee();
      } else if (form.id === 'companyForm') {
        this.handleRegisterCompany();
      } else if (form.id === 'menuForm') {
        this.handleRegisterMenu();
      } else if (form.id === 'totemForm') {
        this.handleTotemScan();
      }
    });

    document.addEventListener('keydown', (e) => {
      const modal = document.getElementById('mainModal');
      if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
        e.preventDefault();
        this.closeModal();
        return;
      }

      const tabEl = e.target.closest('[role="tab"][data-tab]');
      if (tabEl && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        const tabs = Array.from(document.querySelectorAll('[role="tab"][data-tab]'));
        const idx = tabs.indexOf(tabEl);
        if (idx >= 0 && tabs.length > 0) {
          e.preventDefault();
          const nextIdx = e.key === 'ArrowRight'
            ? (idx + 1) % tabs.length
            : (idx - 1 + tabs.length) % tabs.length;
          const nextTab = tabs[nextIdx];
          nextTab.focus();
          this.switchTab(nextTab.getAttribute('data-tab'));
        }
      }
    });

    const wakeBtn = document.getElementById('wakeLockBtn');
    if (wakeBtn) {
      wakeBtn.addEventListener('click', () => this.toggleWakeLock());
    }
  }

  switchTab(tab) {
    this.currentTab = tab;
    document.querySelectorAll('[data-tab]').forEach((el) => {
      const isActive = el.getAttribute('data-tab') === tab;
      if (el.getAttribute('role') === 'tab') {
        el.setAttribute('aria-selected', isActive ? 'true' : 'false');
        if (isActive) {
          el.className = 'px-3.5 py-2 min-h-[44px] rounded-lg text-xs font-bold bg-[#c2410c] text-white flex items-center gap-2 transition-colors';
        } else {
          el.className = 'px-3.5 py-2 min-h-[44px] rounded-lg text-xs font-semibold bg-[#1b1714] hover:bg-[#241e1a] text-[#c7b8ad] hover:text-[#fdf8f4] border border-[#2e2520] flex items-center gap-2 transition-colors';
        }
      }
    });
    this.render();
  }

  handleAction(action, target) {
    if (action === 'close-modal') {
      this.closeModal();
    } else if (action === 'open-haccp-modal') {
      this.openHaccpModal();
    } else if (action === 'open-employee-modal') {
      this.openEmployeeModal();
    } else if (action === 'open-company-modal') {
      this.openCompanyModal();
    } else if (action === 'open-menu-modal') {
      this.openMenuModal();
    } else if (action === 'purge-demo') {
      this.purgeDemoData();
    } else if (action === 'dismiss-error') {
      this.lastError = null;
      this.render();
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

  openModalWithFocus(titleText, bodyHtml) {
    const modal = document.getElementById('mainModal');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    if (!modal || !title || !body) return;

    this.lastFocusedElement = document.activeElement;
    title.textContent = titleText;
    Sanitizer.safeSetInnerHTML(body, bodyHtml);
    modal.classList.remove('hidden');

    const firstInput = modal.querySelector('input, select, textarea, button[type="submit"], button[data-action="close-modal"]');
    if (firstInput && typeof firstInput.focus === 'function') {
      firstInput.focus();
    }
  }

  closeModal() {
    const modal = document.getElementById('mainModal');
    if (modal) modal.classList.add('hidden');
    if (this.lastFocusedElement && typeof this.lastFocusedElement.focus === 'function') {
      this.lastFocusedElement.focus();
      this.lastFocusedElement = null;
    }
  }

  // --- TOTEM NUMPAD & SCAN ---

  handleTotemNumpadKey(key) {
    const input = document.getElementById('totemDniInput');
    if (!input) return;
    if (key === 'BACK') {
      input.value = input.value.slice(0, -1);
    } else if (input.value.length < 9) {
      input.value += key;
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
      totemDevice: 'Totem-Linea-1'
    });

    this.lastTotemScanResult = result;
    if (input) input.value = '';

    if (result.allowed) {
      this.persistState();
      this.showToast(result.message, 'success');
    } else {
      this.showToast(result.error, 'error');
    }

    this.render();
  }

  // --- COMPANY MODAL & SAVE ---

  openCompanyModal() {
    const html = `
      <form id="companyForm" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label for="compId" class="block text-xs font-semibold text-[#c7b8ad] mb-1">Código de Planta</label>
            <input type="text" id="compId" class="w-full bg-[#12100e] border border-[#3d322b] rounded-lg px-3 py-2 text-sm text-[#fdf8f4]" placeholder="Ej: PLANT-01" required />
          </div>
          <div>
            <label for="compPrice" class="block text-xs font-semibold text-[#c7b8ad] mb-1">Valor Vianda (ARS)</label>
            <input type="number" id="compPrice" min="1" step="1" class="w-full bg-[#12100e] border border-[#3d322b] rounded-lg px-3 py-2 text-sm text-[#fdf8f4] tabular-nums" value="8800" required />
          </div>
        </div>
        <div>
          <label for="compName" class="block text-xs font-semibold text-[#c7b8ad] mb-1">Razón Social / Planta</label>
          <input type="text" id="compName" class="w-full bg-[#12100e] border border-[#3d322b] rounded-lg px-3 py-2 text-sm text-[#fdf8f4]" placeholder="Ej: Planta Industrial Norte" required />
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label for="compContact" class="block text-xs font-semibold text-[#c7b8ad] mb-1">Contacto RRHH</label>
            <input type="text" id="compContact" class="w-full bg-[#12100e] border border-[#3d322b] rounded-lg px-3 py-2 text-sm text-[#fdf8f4]" placeholder="Nombre y apellido" />
          </div>
          <div>
            <label for="compPhone" class="block text-xs font-semibold text-[#c7b8ad] mb-1">Teléfono</label>
            <input type="tel" id="compPhone" class="w-full bg-[#12100e] border border-[#3d322b] rounded-lg px-3 py-2 text-sm text-[#fdf8f4]" placeholder="+54911..." />
          </div>
        </div>
        <div class="flex flex-wrap justify-end gap-3 pt-3 border-t border-[#2e2520]">
          <button type="button" data-action="close-modal" class="px-4 py-2 min-h-[44px] rounded-lg text-xs font-semibold bg-[#241e1a] text-[#e3d7cf] hover:bg-[#2e2520] border border-[#3d322b]">Cancelar</button>
          <button type="submit" class="px-4 py-2 min-h-[44px] rounded-lg text-xs font-bold bg-[#c2410c] hover:bg-[#9a3412] text-white">Guardar Planta</button>
        </div>
      </form>
    `;
    this.openModalWithFocus('Registrar Planta / Empresa Cliente', html);
  }

  handleRegisterCompany() {
    const id = document.getElementById('compId')?.value;
    const name = document.getElementById('compName')?.value;
    const contractMealPrice = Number(document.getElementById('compPrice')?.value);
    const contactPerson = document.getElementById('compContact')?.value;
    const contactPhone = document.getElementById('compPhone')?.value;

    try {
      const comp = this.employeeRegistry.registerCompany({
        id,
        name,
        contractMealPrice,
        contactPerson,
        contactPhone
      });
      this.persistState();
      this.closeModal();
      this.showToast(`Planta ${comp.name} registrada`, 'success');
      this.render();
    } catch (e) {
      this.showToast(e.message, 'error');
    }
  }

  // --- MENU MODAL & SAVE ---

  openMenuModal() {
    const todayIso = new Date().toISOString().slice(0, 10);
    const html = `
      <form id="menuForm" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label for="menuDate" class="block text-xs font-semibold text-[#c7b8ad] mb-1">Fecha de Servicio</label>
            <input type="date" id="menuDate" class="w-full bg-[#12100e] border border-[#3d322b] rounded-lg px-3 py-2 text-sm text-[#fdf8f4]" value="${todayIso}" required />
          </div>
          <div>
            <label for="menuCutOff" class="block text-xs font-semibold text-[#c7b8ad] mb-1">Hora Cut-Off</label>
            <input type="number" id="menuCutOff" min="0" max="23" class="w-full bg-[#12100e] border border-[#3d322b] rounded-lg px-3 py-2 text-sm text-[#fdf8f4]" value="16" required />
          </div>
        </div>
        <div>
          <label for="menuTitle" class="block text-xs font-semibold text-[#c7b8ad] mb-1">Título del Menú</label>
          <input type="text" id="menuTitle" class="w-full bg-[#12100e] border border-[#3d322b] rounded-lg px-3 py-2 text-sm text-[#fdf8f4]" value="Menú Diario de Planta" required />
        </div>
        <div>
          <label for="menuDishTrad" class="block text-xs font-semibold text-[#c7b8ad] mb-1">Plato Tradicional</label>
          <input type="text" id="menuDishTrad" class="w-full bg-[#12100e] border border-[#3d322b] rounded-lg px-3 py-2 text-sm text-[#fdf8f4]" placeholder="Ej: Pollo al horno con papas" required />
        </div>
        <div>
          <label for="menuDishLight" class="block text-xs font-semibold text-[#c7b8ad] mb-1">Plato Light / Vegetariano</label>
          <input type="text" id="menuDishLight" class="w-full bg-[#12100e] border border-[#3d322b] rounded-lg px-3 py-2 text-sm text-[#fdf8f4]" placeholder="Ej: Ensalada completa con legumbres" required />
        </div>
        <div>
          <label for="menuDishCeliac" class="block text-xs font-semibold text-[#c7b8ad] mb-1">Opción Sin TACC (Ley 26.588)</label>
          <input type="text" id="menuDishCeliac" class="w-full bg-[#12100e] border border-[#3d322b] rounded-lg px-3 py-2 text-sm text-[#fdf8f4]" placeholder="Ej: Barqueta hermética Sin TACC" required />
        </div>
        <div class="flex flex-wrap justify-end gap-3 pt-3 border-t border-[#2e2520]">
          <button type="button" data-action="close-modal" class="px-4 py-2 min-h-[44px] rounded-lg text-xs font-semibold bg-[#241e1a] text-[#e3d7cf] hover:bg-[#2e2520] border border-[#3d322b]">Cancelar</button>
          <button type="submit" class="px-4 py-2 min-h-[44px] rounded-lg text-xs font-bold bg-[#c2410c] hover:bg-[#9a3412] text-white">Publicar Menú</button>
        </div>
      </form>
    `;
    this.openModalWithFocus('Cargar Menú Diario de Cocina', html);
  }

  handleRegisterMenu() {
    const date = document.getElementById('menuDate')?.value;
    const cutOffHour = Number(document.getElementById('menuCutOff')?.value) || 16;
    const title = document.getElementById('menuTitle')?.value;
    const trad = document.getElementById('menuDishTrad')?.value;
    const light = document.getElementById('menuDishLight')?.value;
    const celiac = document.getElementById('menuDishCeliac')?.value;

    try {
      this.menuEngine.registerDailyMenu({
        date,
        title,
        cutOffHour,
        options: [
          { id: 'DISH-1', name: trad, type: 'traditional', isCeliacSafe: false },
          { id: 'DISH-2', name: light, type: 'light', isCeliacSafe: false },
          { id: 'DISH-3', name: celiac, type: 'celiac_special', isCeliacSafe: true }
        ]
      });
      this.persistState();
      this.closeModal();
      this.showToast(`Menú para ${date} publicado`, 'success');
      this.render();
    } catch (e) {
      this.showToast(e.message, 'error');
    }
  }

  // --- HACCP MODAL & SAVE ---

  openHaccpModal() {
    const companies = this.employeeRegistry.listCompanies();
    const compOptions = companies.length > 0
      ? companies.map((c) => `<option value="${Sanitizer.escapeHTML(c.id)}">${Sanitizer.escapeHTML(c.name)}</option>`).join('')
      : '<option value="GENERAL">Planta General (Sin empresa asignada)</option>';

    const html = `
      <form id="haccpForm" class="space-y-4">
        <div class="bg-[#2c1f18] border border-[#4a3224] p-3 rounded-lg text-[#fed7aa] text-xs">
          <strong>Estándar HACCP:</strong> Comida caliente debe despacharse y recibirse a ≥ 65°C. Ensaladas y postres deben conservarse a ≤ 4°C.
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label for="haccpContainerId" class="block text-xs font-semibold text-[#c7b8ad] mb-1">ID Contenedor / Carro</label>
            <input type="text" id="haccpContainerId" class="w-full bg-[#12100e] border border-[#3d322b] rounded-lg px-3 py-2 text-sm text-[#fdf8f4]" placeholder="Ej: CARRO-HOT-02" required />
          </div>
          <div>
            <label for="haccpContainerType" class="block text-xs font-semibold text-[#c7b8ad] mb-1">Tipo de Contenedor</label>
            <select id="haccpContainerType" class="w-full bg-[#12100e] border border-[#3d322b] rounded-lg px-3 py-2 text-sm text-[#fdf8f4]">
              <option value="Carro Térmico Caliente (Gastronorm)">Carro Térmico Caliente (Gastronorm)</option>
              <option value="Conservadora Isotérmica Frío">Conservadora Isotérmica Frío</option>
              <option value="Caja Hermética Sin TACC">Caja Hermética Sin TACC</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label for="haccpFoodCategory" class="block text-xs font-semibold text-[#c7b8ad] mb-1">Categoría</label>
            <select id="haccpFoodCategory" class="w-full bg-[#12100e] border border-[#3d322b] rounded-lg px-3 py-2 text-sm text-[#fdf8f4]">
              <option value="hot">Plato Caliente (≥ 65°C)</option>
              <option value="cold">Ensalada / Frío (≤ 4°C)</option>
            </select>
          </div>
          <div>
            <label for="haccpTempMeasured" class="block text-xs font-semibold text-[#c7b8ad] mb-1">Temperatura Medida (°C)</label>
            <input type="number" step="0.1" id="haccpTempMeasured" class="w-full bg-[#12100e] border border-[#3d322b] rounded-lg px-3 py-2 text-sm text-[#fdf8f4] font-bold tabular-nums" placeholder="Ej: 68.5" required />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label for="haccpStage" class="block text-xs font-semibold text-[#c7b8ad] mb-1">Etapa de Control</label>
            <select id="haccpStage" class="w-full bg-[#12100e] border border-[#3d322b] rounded-lg px-3 py-2 text-sm text-[#fdf8f4]">
              <option value="kitchen_dispatch">Salida de Cocina Central</option>
              <option value="plant_arrival">Recepción en Comedor de Planta</option>
            </select>
          </div>
          <div>
            <label for="haccpCompanySelect" class="block text-xs font-semibold text-[#c7b8ad] mb-1">Planta de Destino</label>
            <select id="haccpCompanySelect" class="w-full bg-[#12100e] border border-[#3d322b] rounded-lg px-3 py-2 text-sm text-[#fdf8f4]">
              ${compOptions}
            </select>
          </div>
        </div>

        <div>
          <label for="haccpInspectorName" class="block text-xs font-semibold text-[#c7b8ad] mb-1">Inspector / Auditor Bromatológico</label>
          <input type="text" id="haccpInspectorName" class="w-full bg-[#12100e] border border-[#3d322b] rounded-lg px-3 py-2 text-sm text-[#fdf8f4]" placeholder="Nombre del inspector" required />
        </div>

        <div class="flex flex-wrap justify-end gap-3 pt-3 border-t border-[#2e2520]">
          <button type="button" data-action="close-modal" class="px-4 py-2 min-h-[44px] rounded-lg text-xs font-semibold bg-[#241e1a] text-[#e3d7cf] hover:bg-[#2e2520] border border-[#3d322b]">Cancelar</button>
          <button type="submit" class="px-4 py-2 min-h-[44px] rounded-lg text-xs font-bold bg-[#c2410c] hover:bg-[#9a3412] text-white">Guardar Control Térmico</button>
        </div>
      </form>
    `;

    this.openModalWithFocus('Registro Bromatológico HACCP (Punto Crítico de Control)', html);
  }

  handleSaveHaccpLog() {
    const containerId = document.getElementById('haccpContainerId')?.value;
    const containerType = document.getElementById('haccpContainerType')?.value;
    const foodCategory = document.getElementById('haccpFoodCategory')?.value;
    const measuredTempRaw = document.getElementById('haccpTempMeasured')?.value;
    const measuredTempC = Number(measuredTempRaw);
    const stage = document.getElementById('haccpStage')?.value;
    const companyId = document.getElementById('haccpCompanySelect')?.value;
    const inspectorName = document.getElementById('haccpInspectorName')?.value;

    if (!containerId || measuredTempRaw === '' || isNaN(measuredTempC)) {
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

      this.persistState();
      this.closeModal();
      this.showToast(`Control Térmico ${entry.id} guardado (${entry.evaluationMessage})`, entry.evaluationStatus === 'danger' ? 'error' : 'success');
      this.render();
    } catch (e) {
      this.showToast(e.message, 'error');
    }
  }

  // --- EMPLOYEE MODAL & SAVE ---

  openEmployeeModal() {
    const companies = this.employeeRegistry.listCompanies();
    if (companies.length === 0) {
      this.showToast('Registre primero una planta o empresa cliente', 'warning');
      this.openCompanyModal();
      return;
    }

    const compOptions = companies.map((c) => `<option value="${Sanitizer.escapeHTML(c.id)}">${Sanitizer.escapeHTML(c.name)}</option>`).join('');

    const html = `
      <form id="newEmpForm" class="space-y-3">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label for="nempFullName" class="block text-xs font-semibold text-[#c7b8ad] mb-1">Nombre Completo</label>
            <input type="text" id="nempFullName" class="w-full bg-[#12100e] border border-[#3d322b] rounded-lg px-3 py-2 text-sm text-[#fdf8f4]" placeholder="Ej: Roberto Carlos Paz" required />
          </div>
          <div>
            <label for="nempDni" class="block text-xs font-semibold text-[#c7b8ad] mb-1">DNI</label>
            <input type="text" id="nempDni" class="w-full bg-[#12100e] border border-[#3d322b] rounded-lg px-3 py-2 text-sm text-[#fdf8f4] tabular-nums" placeholder="Ej: 33901844" required />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label for="nempCompany" class="block text-xs font-semibold text-[#c7b8ad] mb-1">Empresa / Planta</label>
            <select id="nempCompany" class="w-full bg-[#12100e] border border-[#3d322b] rounded-lg px-3 py-2 text-sm text-[#fdf8f4]">
              ${compOptions}
            </select>
          </div>
          <div>
            <label for="nempShift" class="block text-xs font-semibold text-[#c7b8ad] mb-1">Turno Habitual</label>
            <select id="nempShift" class="w-full bg-[#12100e] border border-[#3d322b] rounded-lg px-3 py-2 text-sm text-[#fdf8f4]">
              <option value="Mañana">Mañana (06:00 - 14:00)</option>
              <option value="Tarde">Tarde (14:00 - 22:00)</option>
              <option value="Noche">Noche (22:00 - 06:00)</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label for="nempSector" class="block text-xs font-semibold text-[#c7b8ad] mb-1">Sector / Área</label>
            <input type="text" id="nempSector" class="w-full bg-[#12100e] border border-[#3d322b] rounded-lg px-3 py-2 text-sm text-[#fdf8f4]" placeholder="Ej: Mecánica / Chapería" />
          </div>
          <div>
            <label for="nempSubsidy" class="block text-xs font-semibold text-[#c7b8ad] mb-1">Subsidio Empresa (%)</label>
            <input type="number" id="nempSubsidy" min="0" max="100" class="w-full bg-[#12100e] border border-[#3d322b] rounded-lg px-3 py-2 text-sm text-[#fdf8f4] tabular-nums" value="80" />
          </div>
        </div>

        <div>
          <label for="nempDiet" class="block text-xs font-semibold text-[#c7b8ad] mb-1">Régimen Dietético / Alerta Médica</label>
          <select id="nempDiet" class="w-full bg-[#12100e] border border-[#3d322b] rounded-lg px-3 py-2 text-sm text-[#fdf8f4]">
            <option value="Estándar">Estándar (Sin restricciones)</option>
            <option value="Sin TACC (Celíaco)">Sin TACC (Celíaco - Ley 26.588)</option>
            <option value="Hiposódico">Hiposódico (Sin Sal)</option>
            <option value="Diabético">Diabético (Control Carbohidratos)</option>
            <option value="Vegetariano">Vegetariano</option>
          </select>
        </div>

        <div>
          <label for="nempPhone" class="block text-xs font-semibold text-[#c7b8ad] mb-1">Teléfono Móvil (WhatsApp)</label>
          <input type="tel" id="nempPhone" class="w-full bg-[#12100e] border border-[#3d322b] rounded-lg px-3 py-2 text-sm text-[#fdf8f4]" placeholder="+54911..." />
        </div>

        <div class="flex flex-wrap justify-end gap-3 pt-3 border-t border-[#2e2520]">
          <button type="button" data-action="close-modal" class="px-4 py-2 min-h-[44px] rounded-lg text-xs font-semibold bg-[#241e1a] text-[#e3d7cf] hover:bg-[#2e2520] border border-[#3d322b]">Cancelar</button>
          <button type="submit" class="px-4 py-2 min-h-[44px] rounded-lg text-xs font-bold bg-[#c2410c] hover:bg-[#9a3412] text-white">Guardar Operario</button>
        </div>
      </form>
    `;

    this.openModalWithFocus('Empadronar Nuevo Operario en Comedor', html);
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

      this.persistState();
      this.closeModal();
      this.showToast(`Operario ${emp.fullName} empadronado con éxito`, 'success');
      this.render();
    } catch (e) {
      this.showToast(e.message, 'error');
    }
  }

  // --- BATCH & CSV EXPORT ---

  handleGenerateBatch() {
    const compId = document.getElementById('billingCompanySelect')?.value;
    const period = document.getElementById('billingPeriodInput')?.value || new Date().toISOString().slice(0, 7);

    if (!compId) {
      this.showToast('Debe registrar y seleccionar una planta cliente primero', 'warning');
      return;
    }

    try {
      const batch = this.billingService.generateMonthlyBatch({
        companyId: compId,
        periodYearMonth: period
      });

      this.persistState();
      this.showToast(`Lote ${batch.id} para ${batch.companyName} generado (${batch.totalMeals} raciones)`, 'success');
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

  // --- SHARED CHROME HELPERS ---

  renderDemoBanner() {
    if (!this.hasDemoData()) return '';
    return `
      <div class="bg-[#2c1f18] border border-[#4a3224] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex items-start sm:items-center gap-3 text-xs text-[#fed7aa]">
          ${iconSvg('alert', 'w-5 h-5 shrink-0 text-[#fb923c]')}
          <div>
            <span class="font-bold">[DEMO] Modo Demostración Activo:</span>
            <span>Los registros iniciales son ficticios para evaluación operativa. Puede purgarlos para iniciar con su padrón real.</span>
          </div>
        </div>
        <button type="button" data-action="purge-demo" class="px-3.5 py-2 min-h-[44px] rounded-lg bg-[#241e1a] hover:bg-[#141210] text-[#fdf8f4] border border-[#4a3224] text-xs font-bold flex items-center gap-2 shrink-0">
          ${iconSvg('trash', 'w-4 h-4')}
          <span>Purgar Datos Demo</span>
        </button>
      </div>
    `;
  }

  renderErrorBanner() {
    if (!this.lastError) return '';
    return `
      <div role="alert" class="bg-[#4c0519] border border-rose-700 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-100">
        <div class="flex items-center gap-2">
          ${iconSvg('alert', 'w-4 h-4 shrink-0 text-rose-300')}
          <span>${Sanitizer.escapeHTML(this.lastError)}</span>
        </div>
        <button type="button" data-action="dismiss-error" class="px-3 py-1.5 min-h-[44px] rounded-lg bg-[#241e1a] text-[#fdf8f4] border border-rose-700 font-semibold">
          Cerrar aviso
        </button>
      </div>
    `;
  }

  demoTag(item) {
    return item?.isDemo
      ? '<span class="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#2c1f18] text-[#fed7aa] border border-[#4a3224]">[DEMO]</span>'
      : '';
  }

  // --- RENDER TABS ---

  render() {
    const mainView = document.getElementById('mainView');
    if (!mainView) return;

    if (this.isLoading) {
      Sanitizer.safeSetInnerHTML(mainView, `
        <div role="status" aria-live="polite" class="bg-[#1b1714] border border-[#2e2520] rounded-xl p-8 text-center space-y-2">
          <h1 class="text-[#fdf8f4]">Cargando FoodTrack</h1>
          <p class="text-xs text-[#c7b8ad]">Sincronizando registros locales de comedor...</p>
        </div>
      `);
      return;
    }

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
    const batches = this.billingService.listBatches();
    const haccpSummary = this.haccpSentinel.getThermalAuditSummary();

    const todayIso = new Date().toISOString().slice(0, 10);
    const todayTx = transactions.filter((t) => t.shiftDate === todayIso);
    const totalSubsidy = transactions.reduce((sum, t) => sum + (t.companySubsidyAmount || 0), 0);
    const verifiedCount = transactions.filter((t) => !this.validationService.verifyTransactionIntegrity(t.id).isTampered).length;

    const billingSubtitle = transactions.length === 0
      ? 'Sin movimientos registrados'
      : `${batches.length} lotes emitidos | ${verifiedCount}/${transactions.length} sellos SHA-256 válidos`;

    const html = `
      <div class="space-y-6">
        ${this.renderErrorBanner()}
        ${this.renderDemoBanner()}

        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 class="text-[#fdf8f4]">Panel General de Comedores</h1>
            <p class="text-xs text-[#c7b8ad]">Estado operativo diario de raciones, inocuidad térmica HACCP y conciliación B2B.</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button type="button" data-action="open-company-modal" class="px-3.5 py-2 min-h-[44px] rounded-lg bg-[#241e1a] hover:bg-[#2e2520] text-[#e3d7cf] border border-[#3d322b] text-xs font-semibold flex items-center gap-1.5">
              ${iconSvg('plus', 'w-4 h-4')}
              <span>Nueva Planta</span>
            </button>
            <button type="button" data-action="open-employee-modal" class="px-3.5 py-2 min-h-[44px] rounded-lg bg-[#c2410c] hover:bg-[#9a3412] text-white text-xs font-bold flex items-center gap-1.5">
              ${iconSvg('plus', 'w-4 h-4')}
              <span>Nuevo Operario</span>
            </button>
          </div>
        </div>

        <!-- Metrics -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-[#1b1714] p-5 rounded-xl border border-[#2e2520]">
            <div class="text-xs font-semibold text-[#c7b8ad] uppercase tracking-wider">Raciones Servidas Hoy</div>
            <div class="text-3xl font-extrabold text-emerald-400 mt-2 tabular-nums">${todayTx.length}</div>
            <div class="text-xs text-[#c7b8ad] mt-1 tabular-nums">${transactions.length} acumuladas registradas</div>
          </div>

          <div class="bg-[#1b1714] p-5 rounded-xl border border-[#2e2520]">
            <div class="text-xs font-semibold text-[#c7b8ad] uppercase tracking-wider">Operarios en Padrón</div>
            <div class="text-3xl font-extrabold text-[#fdf8f4] mt-2 tabular-nums">${employees.length}</div>
            <div class="text-xs text-[#fb923c] mt-1 tabular-nums">${companies.length} plantas corporativas</div>
          </div>

          <div class="bg-[#1b1714] p-5 rounded-xl border border-[#2e2520]">
            <div class="text-xs font-semibold text-[#c7b8ad] uppercase tracking-wider">Inocuidad HACCP</div>
            <div class="text-3xl font-extrabold text-[#fdf8f4] mt-2 tabular-nums">${haccpSummary.complianceRate}%</div>
            <div class="text-xs ${haccpSummary.dangerCount === 0 ? 'text-emerald-400' : 'text-rose-400'} mt-1">${Sanitizer.escapeHTML(haccpSummary.haccpStatus)}</div>
          </div>

          <div class="bg-[#1b1714] p-5 rounded-xl border border-[#2e2520]">
            <div class="text-xs font-semibold text-[#c7b8ad] uppercase tracking-wider">Subsidio B2B Acumulado</div>
            <div class="text-2xl font-extrabold text-[#fdf8f4] mt-2 tabular-nums">${formatARS(totalSubsidy)}</div>
            <div class="text-xs text-[#c7b8ad] mt-1">${Sanitizer.escapeHTML(billingSubtitle)}</div>
          </div>
        </div>

        <!-- Banner Action -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="bg-[#1b1714] p-5 rounded-xl border border-[#4a3224] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 class="text-base font-bold text-[#fdf8f4] flex items-center gap-2">
                ${iconSvg('totem', 'w-4 h-4 text-[#fb923c]')}
                <span>Tótem de Autoservicio en Línea</span>
              </h2>
              <p class="text-xs text-[#e3d7cf] mt-1">Validación por DNI, bloqueo de doble ración en turno y alertas Sin TACC.</p>
            </div>
            <button type="button" data-tab="totem" class="px-4 py-2.5 min-h-[44px] rounded-lg bg-[#c2410c] hover:bg-[#9a3412] text-white font-bold text-xs whitespace-nowrap shrink-0">
              Abrir Tótem
            </button>
          </div>

          <div class="bg-[#1b1714] p-5 rounded-xl border border-[#235835] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 class="text-base font-bold text-[#fdf8f4] flex items-center gap-2">
                ${iconSvg('production', 'w-4 h-4 text-emerald-400')}
                <span>Planificación de Cocina Central</span>
              </h2>
              <p class="text-xs text-[#e3d7cf] mt-1">Cálculo de raciones solicitadas por turno más margen de contingencia configurable.</p>
            </div>
            <button type="button" data-tab="production" class="px-4 py-2.5 min-h-[44px] rounded-lg bg-[#047857] hover:bg-[#065f46] text-white font-bold text-xs whitespace-nowrap shrink-0">
              Ver Batch de Cocina
            </button>
          </div>
        </div>

        <!-- Recent Transactions -->
        <div class="bg-[#1b1714] rounded-xl border border-[#2e2520] p-5">
          <h2 class="text-sm font-bold text-[#fdf8f4] mb-4">Últimas Viandas Validadas en Línea de Servicio</h2>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="text-[#c7b8ad] border-b border-[#2e2520] uppercase text-[11px] tracking-wider">
                <tr>
                  <th class="pb-3 pr-3">ID Transacción</th>
                  <th class="pb-3 pr-3">Operario</th>
                  <th class="pb-3 pr-3">Empresa / Planta</th>
                  <th class="pb-3 pr-3">Turno</th>
                  <th class="pb-3 pr-3">Plato Servido</th>
                  <th class="pb-3 pr-3">Régimen Dietético</th>
                  <th class="pb-3">Sello SHA-256</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#2e2520] text-[#e3d7cf]">
                ${transactions.length === 0 ? `
                  <tr>
                    <td colspan="7" class="py-8 text-center text-[#c7b8ad]">
                      <div class="space-y-3">
                        <p>No hay viandas validadas registradas en este período.</p>
                        <button type="button" data-tab="totem" class="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-lg bg-[#c2410c] hover:bg-[#9a3412] text-white text-xs font-bold">
                          ${iconSvg('totem', 'w-4 h-4')}
                          <span>Registrar Fichaje en Tótem</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ` : ''}
                ${transactions.map((t) => `
                  <tr>
                    <td class="py-3 pr-3 font-mono font-semibold text-[#fb923c]">${Sanitizer.escapeHTML(t.id)}${this.demoTag(t)}</td>
                    <td class="py-3 pr-3 font-medium text-[#fdf8f4]">${Sanitizer.escapeHTML(t.employeeName)} <span class="text-[#c7b8ad] font-mono">(${Sanitizer.escapeHTML(t.dni)})</span></td>
                    <td class="py-3 pr-3">${Sanitizer.escapeHTML(t.companyName)}</td>
                    <td class="py-3 pr-3"><span class="px-2 py-0.5 rounded-md text-[11px] bg-[#241e1a] border border-[#3d322b] text-[#e3d7cf]">${Sanitizer.escapeHTML(t.shift)}</span></td>
                    <td class="py-3 pr-3 font-medium text-[#fdf8f4]">${Sanitizer.escapeHTML(t.dishServed)}</td>
                    <td class="py-3 pr-3">
                      <span class="inline-block px-2 py-0.5 rounded-md text-[11px] ${t.dietaryBadge?.className || 'bg-[#241e1a] text-[#e3d7cf] border border-[#3d322b]'}">
                        ${Sanitizer.escapeHTML(t.dietaryBadge?.label || t.dietaryProfile)}
                      </span>
                    </td>
                    <td class="py-3 font-mono text-[11px] text-emerald-400" title="${Sanitizer.escapeHTML(t.hashSeal || '')}">
                      <span class="inline-flex items-center gap-1">
                        ${iconSvg('lock', 'w-3.5 h-3.5 shrink-0')}
                        <span>${t.hashSeal ? Sanitizer.escapeHTML(t.hashSeal.slice(0, 10)) + '...' : '-'}</span>
                      </span>
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
    const employeesCount = this.employeeRegistry.listEmployees().length;

    const html = `
      <div class="max-w-3xl mx-auto space-y-6">
        ${this.renderErrorBanner()}
        ${this.renderDemoBanner()}

        <div class="text-center space-y-1">
          <h1 class="text-[#fdf8f4] flex items-center justify-center gap-2">
            ${iconSvg('totem', 'w-6 h-6 text-[#fb923c]')}
            <span>Tótem de Autoservicio de Comedor</span>
          </h1>
          <p class="text-xs text-[#c7b8ad]">Ingrese el número de DNI mediante el teclado táctil para validar el retiro de vianda.</p>
        </div>

        ${employeesCount === 0 ? `
          <div class="bg-[#1b1714] border border-[#4a3224] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p class="text-xs text-[#fed7aa]">No hay operarios empadronados para validar en el tótem.</p>
            <button type="button" data-action="open-employee-modal" class="px-4 py-2 min-h-[44px] rounded-lg bg-[#c2410c] hover:bg-[#9a3412] text-white text-xs font-bold shrink-0">
              Empadronar Operario
            </button>
          </div>
        ` : ''}

        <!-- Scan Input & Visual Display -->
        <form id="totemForm" class="bg-[#1b1714] border border-[#2e2520] rounded-xl p-5 sm:p-6 space-y-5">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2e2520] pb-4">
            <div class="flex items-center gap-2 text-xs text-emerald-400 font-semibold">
              ${iconSvg('check', 'w-4 h-4 shrink-0')}
              <span>Línea 1 | Estado: Activa</span>
            </div>
            <div class="flex items-center gap-2">
              <label for="totemShiftSelect" class="text-xs font-semibold text-[#c7b8ad]">Turno:</label>
              <select id="totemShiftSelect" class="bg-[#12100e] border border-[#3d322b] rounded-lg px-3 py-2 text-xs text-[#fdf8f4]">
                <option value="Mañana" selected>Mañana (06:00 - 14:00)</option>
                <option value="Tarde">Tarde (14:00 - 22:00)</option>
                <option value="Noche">Noche (22:00 - 06:00)</option>
              </select>
            </div>
          </div>

          <!-- DNI Display Box -->
          <div>
            <label for="totemDniInput" class="sr-only">DNI del Operario</label>
            <input type="text" id="totemDniInput" class="w-full bg-[#12100e] border-2 border-[#4a3224] rounded-xl py-4 px-6 text-3xl font-mono font-bold text-center text-[#fdf8f4] tracking-widest tabular-nums focus:border-[#fb923c]" placeholder="INGRESE DNI" readonly />
          </div>

          <!-- Interactive Numpad for Touchscreen Totem -->
          <div class="grid grid-cols-3 gap-3 max-w-xs mx-auto">
            ${['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => `
              <button type="button" data-action="totem-numpad-key" data-key="${k}" class="h-14 min-h-[48px] rounded-lg bg-[#241e1a] hover:bg-[#2e2520] active:bg-[#3d322b] text-[#fdf8f4] text-xl font-bold border border-[#3d322b] transition-colors">
                ${k}
              </button>
            `).join('')}
            <button type="button" data-action="totem-clear" class="h-14 min-h-[48px] rounded-lg bg-[#241e1a] hover:bg-[#2e2520] text-rose-300 text-xs font-bold border border-[#3d322b] transition-colors">
              BORRAR
            </button>
            <button type="button" data-action="totem-numpad-key" data-key="0" class="h-14 min-h-[48px] rounded-lg bg-[#241e1a] hover:bg-[#2e2520] active:bg-[#3d322b] text-[#fdf8f4] text-xl font-bold border border-[#3d322b] transition-colors">
              0
            </button>
            <button type="button" data-action="totem-numpad-key" data-key="BACK" aria-label="Borrar último dígito" class="h-14 min-h-[48px] rounded-lg bg-[#241e1a] hover:bg-[#2e2520] text-amber-300 text-xs font-bold border border-[#3d322b] transition-colors">
              ATRÁS
            </button>
          </div>

          <button type="submit" class="w-full py-4 min-h-[48px] rounded-lg bg-[#047857] hover:bg-[#065f46] text-white font-extrabold text-base tracking-wide uppercase transition-colors">
            Validar Retiro de Vianda
          </button>
        </form>

        <!-- Result Feedback Banner (flattened without nested cards) -->
        ${res ? `
          <div role="status" aria-live="polite" class="p-6 rounded-xl border ${res.allowed ? 'bg-[#1b3524] border-[#235835]' : 'bg-[#4c0519] border-rose-700'}">
            ${res.allowed ? `
              <div class="space-y-4 text-center">
                <div class="flex justify-center text-emerald-300">
                  ${iconSvg('check', 'w-10 h-10')}
                </div>
                <div>
                  <h2 class="text-xl font-extrabold text-[#fdf8f4]">${Sanitizer.escapeHTML(res.employeeName)}</h2>
                  <p class="text-xs text-emerald-200 font-medium">${Sanitizer.escapeHTML(res.companyName)}</p>
                </div>

                <div class="border-t border-[#235835] pt-4 max-w-md mx-auto text-left space-y-2.5">
                  <div class="flex justify-between gap-2 text-xs">
                    <span class="text-[#e3d7cf]">Plato a Entregar:</span>
                    <span class="font-bold text-[#fdf8f4] text-right">${Sanitizer.escapeHTML(res.dishServed)}</span>
                  </div>

                  ${res.hasMedicalAlert ? `
                    <div class="py-2 px-3 rounded-lg ${res.dietaryBadge?.className || 'bg-[#3d280a] text-amber-200'} text-xs font-bold text-center">
                      ${Sanitizer.escapeHTML(res.dietaryBadge?.label || 'ALERTA DE DIETA MÉDICA')}
                    </div>
                  ` : ''}

                  <div class="text-[11px] font-mono text-[#e3d7cf] text-center pt-2 border-t border-[#235835]">
                    Sello SHA-256: ${Sanitizer.escapeHTML(res.transaction?.hashSeal?.slice(0, 16) || '')}...
                  </div>
                </div>
              </div>
            ` : `
              <div class="space-y-2 text-center">
                <div class="flex justify-center text-rose-300">
                  ${iconSvg('ban', 'w-10 h-10')}
                </div>
                <h2 class="text-lg font-bold text-rose-200">${Sanitizer.escapeHTML(res.error)}</h2>
                <p class="text-xs text-[#e3d7cf]">Si considera que es un error, consulte con la jefatura de personal o el supervisor del comedor.</p>
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
        ${this.renderErrorBanner()}
        ${this.renderDemoBanner()}

        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 class="text-[#fdf8f4]">Cocina Central y Planificación</h1>
            <p class="text-xs text-[#c7b8ad]">Cálculo de lotes de cocción según selecciones registradas y margen de contingencia.</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <span class="px-3 py-2 rounded-lg bg-[#1b1714] border border-[#2e2520] text-xs text-[#e3d7cf] font-mono tabular-nums">
              Fecha: ${todayIso}
            </span>
            <button type="button" data-action="open-menu-modal" class="px-3.5 py-2 min-h-[44px] rounded-lg bg-[#c2410c] hover:bg-[#9a3412] text-white text-xs font-bold flex items-center gap-1.5">
              ${iconSvg('plus', 'w-4 h-4')}
              <span>${menu ? 'Actualizar Menú' : 'Cargar Menú de Hoy'}</span>
            </button>
          </div>
        </div>

        ${!menu ? `
          <div class="bg-[#1b1714] p-8 rounded-xl border border-[#2e2520] text-center space-y-3">
            <h2 class="text-base font-bold text-[#fdf8f4]">Sin menú publicado para hoy (${todayIso})</h2>
            <p class="text-xs text-[#c7b8ad]">Cargue las opciones del día para calcular los lotes de producción de cocina.</p>
            <button type="button" data-action="open-menu-modal" class="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-lg bg-[#c2410c] hover:bg-[#9a3412] text-white text-xs font-bold">
              ${iconSvg('plus', 'w-4 h-4')}
              <span>Cargar Menú del Día</span>
            </button>
          </div>
        ` : `
          <!-- Production Metrics -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="bg-[#1b1714] p-5 rounded-xl border border-[#2e2520]">
              <div class="text-xs text-[#c7b8ad] uppercase font-semibold">Raciones Solicitadas</div>
              <div class="text-3xl font-extrabold text-[#fdf8f4] mt-1 tabular-nums">${batch.totalRequested}</div>
              <div class="text-xs text-[#c7b8ad] mt-1">Cut-off configurado: ${menu.cutOffHour}:00 hs</div>
            </div>

            <div class="bg-[#1b1714] p-5 rounded-xl border border-[#2e2520]">
              <div class="text-xs text-[#c7b8ad] uppercase font-semibold">Contingencia (+${batch.contingencyPct}%)</div>
              <div class="text-3xl font-extrabold text-amber-400 mt-1 tabular-nums">+${batch.totalContingency}</div>
              <div class="text-xs text-[#c7b8ad] mt-1">Margen calculado para imprevistos</div>
            </div>

            <div class="bg-[#1b1714] p-5 rounded-xl border border-[#2e2520]">
              <div class="text-xs text-[#c7b8ad] uppercase font-semibold">Total a Cocinar en Batch</div>
              <div class="text-3xl font-extrabold text-emerald-400 mt-1 tabular-nums">${batch.totalBatch}</div>
              <div class="text-xs text-[#c7b8ad] mt-1 tabular-nums">${batch.totalRequested} solicitadas + ${batch.totalContingency} contingencia</div>
            </div>
          </div>

          <!-- Dishes Production Sheet (flat rows inside section) -->
          <div class="bg-[#1b1714] rounded-xl border border-[#2e2520] p-5 space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-2 border-b border-[#2e2520] pb-3">
              <h2 class="text-sm font-bold text-[#fdf8f4]">Planilla de Cocina y Armado de Barquetas (Turno Mañana)${this.demoTag(menu)}</h2>
              <span class="text-xs text-[#c7b8ad]">${Sanitizer.escapeHTML(menu.title)}</span>
            </div>
            <div class="divide-y divide-[#2e2520]">
              ${batch.dishes.map((d) => `
                <div class="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span class="text-[11px] font-mono text-[#fb923c]">${Sanitizer.escapeHTML(d.dishId)}</span>
                    <h3 class="text-sm font-bold text-[#fdf8f4]">${Sanitizer.escapeHTML(d.dishName)}</h3>
                    <div class="text-xs text-[#c7b8ad]">Tipo: <span class="capitalize">${Sanitizer.escapeHTML(d.dishType)}</span></div>
                  </div>
                  <div class="sm:text-right">
                    <div class="text-2xl font-black text-emerald-400 tabular-nums">${d.totalProductionBatch} <span class="text-xs font-normal text-[#c7b8ad]">raciones</span></div>
                    <div class="text-xs text-[#c7b8ad] tabular-nums">${d.requestedCount} pedidos + ${d.contingencyCount} margen</div>
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
    const companies = this.employeeRegistry.listCompanies();

    const html = `
      <div class="space-y-5">
        ${this.renderErrorBanner()}
        ${this.renderDemoBanner()}

        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 class="text-[#fdf8f4]">Padrón de Operarios por Planta</h1>
            <p class="text-xs text-[#c7b8ad]">Gestión de turnos, subsidios y dietas médicas especiales (Sin TACC Ley 26.588).</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button type="button" data-action="open-company-modal" class="px-3.5 py-2 min-h-[44px] rounded-lg bg-[#241e1a] hover:bg-[#2e2520] text-[#e3d7cf] border border-[#3d322b] font-semibold text-xs flex items-center gap-1.5">
              ${iconSvg('plus', 'w-4 h-4')}
              <span>Nueva Planta</span>
            </button>
            <button type="button" data-action="open-employee-modal" class="px-4 py-2 min-h-[44px] rounded-lg bg-[#c2410c] hover:bg-[#9a3412] text-white font-bold text-xs flex items-center gap-1.5">
              ${iconSvg('plus', 'w-4 h-4')}
              <span>Nuevo Operario</span>
            </button>
          </div>
        </div>

        ${employees.length === 0 ? `
          <div class="bg-[#1b1714] rounded-xl border border-[#2e2520] p-8 text-center space-y-3">
            <h2 class="text-base font-bold text-[#fdf8f4]">No hay operarios empadronados</h2>
            <p class="text-xs text-[#c7b8ad]">
              ${companies.length === 0
                ? 'Registre primero una planta cliente y luego empadronar operarios para habilitar el tótem.'
                : 'Empadrone al primer operario para habilitar el retiro de viandas y alertas médicas.'}
            </p>
            <div class="flex flex-wrap justify-center gap-3 pt-1">
              ${companies.length === 0 ? `
                <button type="button" data-action="open-company-modal" class="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-lg bg-[#c2410c] hover:bg-[#9a3412] text-white text-xs font-bold">
                  ${iconSvg('plus', 'w-4 h-4')}
                  <span>Registrar Planta Cliente</span>
                </button>
              ` : `
                <button type="button" data-action="open-employee-modal" class="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-lg bg-[#c2410c] hover:bg-[#9a3412] text-white text-xs font-bold">
                  ${iconSvg('plus', 'w-4 h-4')}
                  <span>Empadronar Primer Operario</span>
                </button>
              `}
            </div>
          </div>
        ` : `
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${employees.map((e) => {
              const badge = getDietaryBadge(e.dietaryProfile);
              const cleanedPhone = WhatsAppMenuNotifier.cleanPhoneNumber(e.phone);
              const hasValidPhone = Boolean(cleanedPhone && cleanedPhone.length >= 10);

              return `
                <article class="bg-[#1b1714] rounded-xl border border-[#2e2520] p-5 flex flex-col justify-between">
                  <div>
                    <div class="flex flex-wrap justify-between items-start gap-2">
                      <div>
                        <span class="text-[11px] font-mono text-[#fb923c]">${Sanitizer.escapeHTML(e.id)}${this.demoTag(e)}</span>
                        <h2 class="text-base font-bold text-[#fdf8f4]">${Sanitizer.escapeHTML(e.fullName)}</h2>
                        <div class="text-xs font-mono text-[#e3d7cf] tabular-nums">DNI: ${Sanitizer.escapeHTML(e.dni)}</div>
                      </div>
                      <span class="px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#241e1a] border border-[#3d322b] text-[#e3d7cf]">
                        Turno ${Sanitizer.escapeHTML(e.shift)}
                      </span>
                    </div>

                    <div class="mt-4 space-y-2 text-xs">
                      <div class="flex justify-between gap-2 text-[#c7b8ad]">
                        <span>Planta:</span>
                        <span class="font-medium text-[#fdf8f4] text-right truncate max-w-[180px]">${Sanitizer.escapeHTML(e.companyName)}</span>
                      </div>

                      <div class="flex justify-between gap-2 text-[#c7b8ad]">
                        <span>Sector:</span>
                        <span class="font-medium text-[#fdf8f4] text-right">${Sanitizer.escapeHTML(e.sector)}</span>
                      </div>

                      <div class="flex justify-between gap-2 text-[#c7b8ad]">
                        <span>Subsidio Empresa:</span>
                        <span class="font-bold text-emerald-400 tabular-nums">${e.subsidyPercentage}%</span>
                      </div>

                      <div class="pt-3 border-t border-[#2e2520] flex items-center justify-between gap-2">
                        <span class="text-[11px] text-[#c7b8ad] uppercase font-semibold">Perfil:</span>
                        <span class="px-2.5 py-1 rounded-md text-[11px] ${badge.className}">
                          ${Sanitizer.escapeHTML(badge.label)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div class="mt-4 pt-3 border-t border-[#2e2520] flex justify-between items-center gap-2 text-xs">
                    ${hasValidPhone ? `
                      <a href="${Sanitizer.sanitizeURL('https://wa.me/' + cleanedPhone)}" target="_blank" rel="noopener noreferrer" class="text-emerald-400 hover:underline inline-flex items-center gap-1.5 font-semibold min-h-[44px]">
                        ${iconSvg('message', 'w-4 h-4')}
                        <span>Notificar Menú</span>
                      </a>
                    ` : `
                      <span class="text-[#c7b8ad] inline-flex items-center gap-1.5 min-h-[44px]" aria-disabled="true">
                        ${iconSvg('message', 'w-4 h-4')}
                        <span>Sin teléfono WhatsApp</span>
                      </span>
                    `}
                    <span class="text-xs font-semibold text-emerald-400">Activo</span>
                  </div>
                </article>
              `;
            }).join('')}
          </div>
        `}
      </div>
    `;

    Sanitizer.safeSetInnerHTML(container, html);
  }

  renderHaccp(container) {
    const logs = this.haccpSentinel.listLogs();
    const summary = this.haccpSentinel.getThermalAuditSummary();

    const html = `
      <div class="space-y-6">
        ${this.renderErrorBanner()}
        ${this.renderDemoBanner()}

        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 class="text-[#fdf8f4]">Auditoría Bromatológica HACCP</h1>
            <p class="text-xs text-[#c7b8ad]">Control de temperatura en despacho desde cocina central y recepción en planta.</p>
          </div>
          <button type="button" data-action="open-haccp-modal" class="px-4 py-2 min-h-[44px] rounded-lg bg-[#c2410c] hover:bg-[#9a3412] text-white font-bold text-xs flex items-center gap-1.5 shrink-0">
            ${iconSvg('plus', 'w-4 h-4')}
            <span>Nuevo Control Térmico</span>
          </button>
        </div>

        <!-- HACCP Status Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-[#1b1714] p-5 rounded-xl border border-[#2e2520]">
            <div class="text-xs text-[#c7b8ad] uppercase font-semibold">Controles Realizados</div>
            <div class="text-3xl font-extrabold text-[#fdf8f4] mt-1 tabular-nums">${summary.totalChecks}</div>
            <div class="text-xs text-[#c7b8ad] mt-1">Carros y Conservadoras</div>
          </div>

          <div class="bg-[#1b1714] p-5 rounded-xl border border-[#2e2520]">
            <div class="text-xs text-[#c7b8ad] uppercase font-semibold">Temperaturas Seguras</div>
            <div class="text-3xl font-extrabold text-emerald-400 mt-1 tabular-nums">${summary.safeCount}</div>
            <div class="text-xs text-emerald-400 mt-1">≥ 65°C / ≤ 4°C</div>
          </div>

          <div class="bg-[#1b1714] p-5 rounded-xl border border-[#2e2520]">
            <div class="text-xs text-[#c7b8ad] uppercase font-semibold">En Margen de Alerta</div>
            <div class="text-3xl font-extrabold text-amber-400 mt-1 tabular-nums">${summary.warningCount}</div>
            <div class="text-xs text-[#c7b8ad] mt-1">Consumo inmediato</div>
          </div>

          <div class="bg-[#1b1714] p-5 rounded-xl border border-[#2e2520]">
            <div class="text-xs text-[#c7b8ad] uppercase font-semibold">Desvíos Críticos</div>
            <div class="text-3xl font-extrabold text-rose-400 mt-1 tabular-nums">${summary.dangerCount}</div>
            <div class="text-xs text-[#c7b8ad] mt-1">Regeneración obligatoria</div>
          </div>
        </div>

        <!-- HACCP Log Table -->
        <div class="bg-[#1b1714] rounded-xl border border-[#2e2520] p-5">
          <h2 class="text-sm font-bold text-[#fdf8f4] mb-4">Registro Histórico de Puntos Críticos de Control (PCC)</h2>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="text-[#c7b8ad] border-b border-[#2e2520] uppercase text-[11px] tracking-wider">
                <tr>
                  <th class="pb-3 pr-3">ID Registro</th>
                  <th class="pb-3 pr-3">Contenedor</th>
                  <th class="pb-3 pr-3">Destino</th>
                  <th class="pb-3 pr-3">Etapa</th>
                  <th class="pb-3 pr-3">Temp. Medida</th>
                  <th class="pb-3 pr-3">Estado Bromatológico</th>
                  <th class="pb-3 pr-3">Inspector</th>
                  <th class="pb-3">Fecha y Hora</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#2e2520] text-[#e3d7cf]">
                ${logs.length === 0 ? `
                  <tr>
                    <td colspan="8" class="py-8 text-center text-[#c7b8ad]">
                      <div class="space-y-3">
                        <p>No hay controles térmicos registrados aún.</p>
                        <button type="button" data-action="open-haccp-modal" class="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-lg bg-[#c2410c] hover:bg-[#9a3412] text-white text-xs font-bold">
                          ${iconSvg('plus', 'w-4 h-4')}
                          <span>Registrar Primer Control Térmico</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ` : ''}
                ${logs.map((l) => `
                  <tr>
                    <td class="py-3 pr-3 font-mono font-semibold text-[#fb923c]">${Sanitizer.escapeHTML(l.id)}${this.demoTag(l)}</td>
                    <td class="py-3 pr-3 font-medium text-[#fdf8f4]">${Sanitizer.escapeHTML(l.containerId)} <span class="text-[11px] text-[#c7b8ad]">(${Sanitizer.escapeHTML(l.containerType)})</span></td>
                    <td class="py-3 pr-3">${Sanitizer.escapeHTML(l.destinationPlant)}</td>
                    <td class="py-3 pr-3"><span class="px-2 py-0.5 rounded-md text-[11px] bg-[#241e1a] border border-[#3d322b] text-[#e3d7cf]">${l.stage === 'kitchen_dispatch' ? 'Salida Cocina' : 'Llegada Planta'}</span></td>
                    <td class="py-3 pr-3 font-bold text-sm tabular-nums ${l.evaluationStatus === 'safe' ? 'text-emerald-400' : l.evaluationStatus === 'warning' ? 'text-amber-400' : 'text-rose-400'}">${l.measuredTempC}°C</td>
                    <td class="py-3 pr-3">
                      <span class="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${
                        l.evaluationStatus === 'safe' ? 'bg-[#1b3524] text-emerald-200 border-[#235835]' :
                        l.evaluationStatus === 'warning' ? 'bg-[#3d280a] text-amber-200 border-amber-700' :
                        'bg-[#4c0519] text-rose-200 border-rose-700'
                      }">
                        ${Sanitizer.escapeHTML(l.evaluationMessage)}
                      </span>
                    </td>
                    <td class="py-3 pr-3 text-[#e3d7cf]">${Sanitizer.escapeHTML(l.inspectorName)}</td>
                    <td class="py-3 text-[#c7b8ad] font-mono text-[11px] tabular-nums">${formatDateTime(l.recordedAt)}</td>
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
        ${this.renderErrorBanner()}
        ${this.renderDemoBanner()}

        <div>
          <h1 class="text-[#fdf8f4]">Liquidación B2B y Conciliación</h1>
          <p class="text-xs text-[#c7b8ad]">Generación mensual de lotes de comedor con desglose de subsidio corporativo y copago por nómina.</p>
        </div>

        <!-- Generator -->
        <div class="bg-[#1b1714] rounded-xl border border-[#2e2520] p-5 space-y-4">
          <h2 class="text-sm font-bold text-[#fdf8f4] border-b border-[#2e2520] pb-3">Generar Lote de Facturación Mensual</h2>
          ${companies.length === 0 ? `
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2 text-xs text-[#c7b8ad]">
              <span>No hay plantas clientes registradas para generar lotes de facturación.</span>
              <button type="button" data-action="open-company-modal" class="px-4 py-2 min-h-[44px] rounded-lg bg-[#c2410c] hover:bg-[#9a3412] text-white font-bold shrink-0">
                Registrar Planta Cliente
              </button>
            </div>
          ` : `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label for="billingCompanySelect" class="block text-xs font-semibold text-[#c7b8ad] mb-1">Empresa / Planta Cliente</label>
                <select id="billingCompanySelect" class="w-full bg-[#12100e] border border-[#3d322b] rounded-lg px-3 py-2 text-sm text-[#fdf8f4]">
                  ${companies.map((c) => `<option value="${Sanitizer.escapeHTML(c.id)}">${Sanitizer.escapeHTML(c.name)}</option>`).join('')}
                </select>
              </div>
              <div>
                <label for="billingPeriodInput" class="block text-xs font-semibold text-[#c7b8ad] mb-1">Período Mensual (AAAA-MM)</label>
                <input type="month" id="billingPeriodInput" class="w-full bg-[#12100e] border border-[#3d322b] rounded-lg px-3 py-2 text-sm text-[#fdf8f4]" value="${new Date().toISOString().slice(0, 7)}" />
              </div>
              <div class="flex items-end">
                <button type="button" data-action="generate-batch" class="w-full py-2.5 min-h-[44px] rounded-lg bg-[#c2410c] hover:bg-[#9a3412] text-white font-bold text-xs flex items-center justify-center gap-2">
                  ${iconSvg('check', 'w-4 h-4')}
                  <span>Generar y Auditar Lote B2B</span>
                </button>
              </div>
            </div>
          `}
        </div>

        <!-- Batches List -->
        <div class="bg-[#1b1714] rounded-xl border border-[#2e2520] p-5 space-y-4">
          <h2 class="text-sm font-bold text-[#fdf8f4]">Lotes Conciliados Listos para Facturación RRHH</h2>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="text-[#c7b8ad] border-b border-[#2e2520] uppercase text-[11px] tracking-wider">
                <tr>
                  <th class="pb-3 pr-3">ID Lote</th>
                  <th class="pb-3 pr-3">Empresa</th>
                  <th class="pb-3 pr-3">Período</th>
                  <th class="pb-3 pr-3">Raciones</th>
                  <th class="pb-3 pr-3">Subsidio Empresa</th>
                  <th class="pb-3 pr-3">Copago Nómina</th>
                  <th class="pb-3 pr-3">Estado Auditoría</th>
                  <th class="pb-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#2e2520] text-[#e3d7cf]">
                ${batches.length === 0 ? `
                  <tr>
                    <td colspan="8" class="py-8 text-center text-[#c7b8ad]">
                      No hay lotes generados aún. Seleccione una planta y período arriba para conciliar las raciones validadas.
                    </td>
                  </tr>
                ` : ''}
                ${batches.map((b) => `
                  <tr>
                    <td class="py-3 pr-3 font-mono font-semibold text-[#fb923c]">${Sanitizer.escapeHTML(b.id)}</td>
                    <td class="py-3 pr-3 font-medium text-[#fdf8f4]">${Sanitizer.escapeHTML(b.companyName)}</td>
                    <td class="py-3 pr-3 font-mono tabular-nums">${Sanitizer.escapeHTML(b.period)}</td>
                    <td class="py-3 pr-3 font-bold tabular-nums">${b.totalMeals}</td>
                    <td class="py-3 pr-3 font-bold text-emerald-400 tabular-nums">${formatARS(b.totalCompanySubsidy)}</td>
                    <td class="py-3 pr-3 text-[#e3d7cf] tabular-nums">${formatARS(b.totalEmployeeCopay)}</td>
                    <td class="py-3 pr-3">
                      <span class="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${b.auditStatus === 'audited_zero_disputes' ? 'bg-[#1b3524] text-emerald-200 border border-[#235835]' : 'bg-[#3d280a] text-amber-200 border border-amber-700'}">
                        ${b.auditStatus === 'audited_zero_disputes' ? 'Integridad SHA-256 Verificada' : 'Requiere Revisión'}
                      </span>
                    </td>
                    <td class="py-3 text-right">
                      <button type="button" data-action="export-batch-csv" data-id="${Sanitizer.escapeHTML(b.id)}" class="px-3 py-1.5 min-h-[44px] rounded-lg bg-[#241e1a] hover:bg-[#2e2520] text-[#fdf8f4] border border-[#3d322b] font-semibold text-xs inline-flex items-center gap-1.5 ml-auto">
                        ${iconSvg('download', 'w-4 h-4')}
                        <span>Exportar CSV Excel</span>
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
