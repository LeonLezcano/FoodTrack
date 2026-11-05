/**
 * FoodTrack - HACCP Thermal Sentinel & Food Safety Engine
 * Critical Control Point (PCC) Thermal Log & Danger Zone Defense
 */

import { evaluateHaccpTemp } from '../utils/formatters.js';

export class HaccpThermalSentinel {
  constructor() {
    this.logs = new Map();
    this.idCounter = 100;
  }

  generateLogId() {
    this.idCounter += 1;
    return `HACCP-${this.idCounter}-${Date.now().toString(36).slice(-4)}`;
  }

  /**
   * Registro térmico en salida de Cocina Central o Recepción en Planta
   */
  recordThermalCheck({
    containerId,
    containerType = 'Carro Térmico Caliente (Gastronorm)',
    companyId,
    destinationPlant,
    stage = 'kitchen_dispatch', // 'kitchen_dispatch' | 'plant_arrival'
    foodCategory = 'hot', // 'hot' | 'cold'
    measuredTempC,
    inspectorName = 'Auditor de Calidad',
    notes = ''
  }) {
    if (!containerId || measuredTempC === undefined) {
      throw new Error('ID de contenedor y temperatura medida en °C son obligatorios');
    }

    const evaluation = evaluateHaccpTemp(measuredTempC, foodCategory);
    const logId = this.generateLogId();

    const entry = {
      id: logId,
      containerId: String(containerId).trim(),
      containerType,
      companyId: companyId || 'General',
      destinationPlant: destinationPlant || 'Planta Industrial',
      stage,
      foodCategory,
      measuredTempC: Number(measuredTempC),
      evaluationStatus: evaluation.status, // 'safe', 'warning', 'danger'
      evaluationMessage: evaluation.message,
      inspectorName: String(inspectorName).trim(),
      requiresRegeneration: evaluation.status === 'danger' && foodCategory === 'hot',
      isColdChainBroken: evaluation.status === 'danger' && foodCategory === 'cold',
      notes: notes || '',
      recordedAt: new Date().toISOString()
    };

    this.logs.set(logId, entry);
    return entry;
  }

  getLog(id) {
    return this.logs.get(id) || null;
  }

  listLogs(filter = {}) {
    let result = Array.from(this.logs.values());

    if (filter.companyId) {
      result = result.filter(l => l.companyId === filter.companyId);
    }
    if (filter.stage) {
      result = result.filter(l => l.stage === filter.stage);
    }
    if (filter.status) {
      result = result.filter(l => l.evaluationStatus === filter.status);
    }

    return result;
  }

  getThermalAuditSummary(companyId = null) {
    const list = this.listLogs(companyId ? { companyId } : {});
    const safeCount = list.filter(l => l.evaluationStatus === 'safe').length;
    const warningCount = list.filter(l => l.evaluationStatus === 'warning').length;
    const dangerCount = list.filter(l => l.evaluationStatus === 'danger').length;

    const complianceRate = list.length > 0
      ? Math.round((safeCount / list.length) * 100)
      : 100;

    return {
      totalChecks: list.length,
      safeCount,
      warningCount,
      dangerCount,
      complianceRate, // 0-100%
      haccpStatus: dangerCount === 0 ? 'HACCP Compliant (Cadena Óptima)' : 'Alerta Bromatológica Activa'
    };
  }
}
