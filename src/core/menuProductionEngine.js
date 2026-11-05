/**
 * FoodTrack - Menu Catalog & Kitchen Production Batch Engine
 * Engine #121 (Asset/Batch Optimization) & Zero Food Waste Algorithm
 */

export class MenuProductionEngine {
  constructor() {
    this.menus = new Map(); // menuId -> menu details
    this.dailySelections = new Map(); // selectionId -> { employeeId, date, shift, selectedDishId, createdAt }
    this.idCounter = 100;
  }

  generateMenuId() {
    this.idCounter += 1;
    return `MENU-${this.idCounter}-${Date.now().toString(36).slice(-4)}`;
  }

  registerDailyMenu({ date, title, options, cutOffHour = 16 }) {
    if (!date || !options || !Array.isArray(options) || options.length === 0) {
      throw new Error('Fecha y lista de opciones de platos son obligatorios');
    }

    const menuId = this.generateMenuId();
    const menu = {
      id: menuId,
      date, // 'YYYY-MM-DD'
      title: title || `Menú del Día ${date}`,
      cutOffHour: Number(cutOffHour) || 16, // Default 16:00 hs of prior day
      options: options.map((opt, idx) => ({
        id: opt.id || `DISH-${idx + 1}`,
        name: String(opt.name).trim(),
        type: opt.type || 'traditional', // 'traditional', 'light', 'vegetarian', 'celiac_special'
        caloriesKcal: Number(opt.caloriesKcal) || 650,
        allergens: Array.isArray(opt.allergens) ? opt.allergens : [],
        isCeliacSafe: Boolean(opt.isCeliacSafe),
        description: opt.description || ''
      })),
      createdAt: new Date().toISOString()
    };

    this.menus.set(date, menu);
    return menu;
  }

  getMenuForDate(date) {
    return this.menus.get(date) || null;
  }

  isCutOffClosed(targetDateIso, cutOffHour = 16, now = new Date()) {
    // Cut-off is at cutOffHour:00 on the day BEFORE the meal service
    const target = new Date(targetDateIso);
    if (isNaN(target.getTime())) return false;

    const cutOffDate = new Date(target);
    cutOffDate.setDate(cutOffDate.getDate() - 1);
    cutOffDate.setHours(cutOffHour, 0, 0, 0);

    return now > cutOffDate;
  }

  recordEmployeeSelection({ employeeId, employeeDni, date, shift, selectedDishId, forceAfterCutoff = false }) {
    if (!employeeId || !date || !selectedDishId) {
      throw new Error('Operario, fecha y plato seleccionado son obligatorios');
    }

    const menu = this.getMenuForDate(date);
    if (!menu) {
      throw new Error(`No hay menú publicado para la fecha ${date}`);
    }

    const dish = menu.options.find(o => o.id === selectedDishId);
    if (!dish) {
      throw new Error(`Plato inválido: ${selectedDishId}`);
    }

    // Check cut-off unless forced by manager
    if (!forceAfterCutoff && this.isCutOffClosed(date, menu.cutOffHour)) {
      throw new Error(`El horario límite de elección para el ${date} ha vencido (Cut-off: 16:00 hs del día previo). Se asignará menú del día por defecto.`);
    }

    // Key to prevent multiple choices per employee on same date & shift
    const selectionKey = `${employeeId}_${date}_${shift || 'Mañana'}`;

    const selection = {
      id: selectionKey,
      employeeId,
      employeeDni: String(employeeDni || '').trim(),
      date,
      shift: shift || 'Mañana',
      selectedDishId,
      dishName: dish.name,
      dishType: dish.type,
      updatedAt: new Date().toISOString()
    };

    this.dailySelections.set(selectionKey, selection);
    return selection;
  }

  getSelection(employeeId, date, shift = 'Mañana') {
    return this.dailySelections.get(`${employeeId}_${date}_${shift}`) || null;
  }

  /**
   * Cálculo de Batch de Producción para Cocina Central (Cero Desperdicio)
   * Suma elecciones reales + 3% de contingencia para emergencias de planta
   */
  calculateKitchenProductionBatch({ date, shift = 'Mañana', companyId = null, contingencyPct = 3 }) {
    const menu = this.getMenuForDate(date);
    if (!menu) throw new Error(`No hay menú configurado para la fecha ${date}`);

    // Filter selections for date & shift
    const matching = Array.from(this.dailySelections.values()).filter(s =>
      s.date === date && s.shift === shift
    );

    const dishCounts = {};
    menu.options.forEach(opt => {
      dishCounts[opt.id] = {
        dishId: opt.id,
        dishName: opt.name,
        dishType: opt.type,
        requestedCount: 0,
        contingencyCount: 0,
        totalProductionBatch: 0
      };
    });

    // Tally selections
    matching.forEach(sel => {
      if (dishCounts[sel.selectedDishId]) {
        dishCounts[sel.selectedDishId].requestedCount += 1;
      }
    });

    let totalRequested = 0;
    let totalContingency = 0;
    let totalBatch = 0;

    Object.values(dishCounts).forEach(item => {
      // Add contingency percentage (minimum 1 if requested > 0)
      const extra = item.requestedCount > 0
        ? Math.max(1, Math.ceil(item.requestedCount * (contingencyPct / 100)))
        : 0;
      
      item.contingencyCount = extra;
      item.totalProductionBatch = item.requestedCount + extra;

      totalRequested += item.requestedCount;
      totalContingency += extra;
      totalBatch += item.totalProductionBatch;
    });

    return {
      date,
      shift,
      companyId: companyId || 'Todas las Plantas',
      totalRequested,
      totalContingency,
      totalBatch,
      contingencyPct,
      dishes: Object.values(dishCounts),
      generatedAt: new Date().toISOString()
    };
  }
}
