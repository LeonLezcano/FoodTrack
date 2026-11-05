/**
 * FoodTrack - Corporate Billing & HR Copay Settlement Engine
 * Engine #134 (Corporate Billing Batches) & Engine #132 (Copay Payroll Settlement)
 * Zero-External-Dependencies Universal CSV Exporter with UTF-8 BOM (Directiva 17)
 */

import { sha256 } from '../utils/cryptoSeal.js';
import { formatARS } from '../utils/formatters.js';

export class CorporateBillingService {
  constructor(mealValidationService, employeeRegistry) {
    this.validationService = mealValidationService;
    this.employeeRegistry = employeeRegistry;
    this.batches = new Map();
    this.batchCounter = 100;
  }

  generateBatchId() {
    this.batchCounter += 1;
    return `LOT-${this.batchCounter}-${Date.now().toString(36).slice(-4)}`;
  }

  generateMonthlyBatch({ companyId, periodYearMonth }) {
    if (!companyId || !periodYearMonth) {
      throw new Error('Empresa y Período (AAAA-MM) son obligatorios');
    }

    const company = this.employeeRegistry.getCompany(companyId);
    const companyName = company ? company.name : companyId;

    // Filter transactions for this company and month
    const allTx = this.validationService.listTransactions({ companyId });
    const eligibleTx = allTx.filter(tx => tx.shiftDate.startsWith(periodYearMonth));

    if (eligibleTx.length === 0) {
      throw new Error(`No hay transacciones registradas para ${companyName} en el período ${periodYearMonth}`);
    }

    // Verify all transactions are sealed with no tampering
    const auditAnomalies = [];
    eligibleTx.forEach(tx => {
      const check = this.validationService.verifyTransactionIntegrity(tx.id);
      if (check.isTampered) {
        auditAnomalies.push(`Transacción ${tx.id} adulterada (Fallo de integridad criptográfica)`);
      }
    });

    const totalMeals = eligibleTx.length;
    const totalGrossAmount = eligibleTx.reduce((sum, t) => sum + (t.unitPrice || 0), 0);
    const totalCompanySubsidy = eligibleTx.reduce((sum, t) => sum + (t.companySubsidyAmount || 0), 0);
    const totalEmployeeCopay = eligibleTx.reduce((sum, t) => sum + (t.employeeCopayAmount || 0), 0);

    // Breakdown by shift
    const shiftBreakdown = { 'Mañana': 0, 'Tarde': 0, 'Noche': 0 };
    // Breakdown by diet
    const dietBreakdown = {};

    eligibleTx.forEach(t => {
      shiftBreakdown[t.shift] = (shiftBreakdown[t.shift] || 0) + 1;
      const diet = t.dietaryProfile || 'Estándar';
      dietBreakdown[diet] = (dietBreakdown[diet] || 0) + 1;
    });

    const batchId = this.generateBatchId();
    const generatedAt = new Date().toISOString();

    const batch = {
      id: batchId,
      companyId,
      companyName,
      period: periodYearMonth,
      generatedAt,
      totalMeals,
      totalGrossAmount,
      totalCompanySubsidy,
      totalEmployeeCopay,
      shiftBreakdown,
      dietBreakdown,
      auditStatus: auditAnomalies.length === 0 ? 'audited_zero_disputes' : 'requires_review',
      auditAnomalies,
      transactions: eligibleTx.map(t => ({
        txId: t.id,
        employeeName: t.employeeName,
        dni: t.dni,
        sector: t.sector,
        shiftDate: t.shiftDate,
        shift: t.shift,
        dishServed: t.dishServed,
        dietaryProfile: t.dietaryProfile,
        unitPrice: t.unitPrice,
        subsidy: t.companySubsidyAmount,
        copay: t.employeeCopayAmount,
        timestamp: t.timestamp,
        hashSeal: t.hashSeal
      })),
      batchHash: null
    };

    // Batch seal
    const payload = JSON.stringify({
      batchId,
      companyId,
      period: batch.period,
      totalMeals,
      totalCompanySubsidy,
      generatedAt
    });
    batch.batchHash = sha256(payload);

    this.batches.set(batchId, batch);
    return batch;
  }

  getBatch(batchId) {
    return this.batches.get(batchId) || null;
  }

  listBatches() {
    return Array.from(this.batches.values());
  }

  /**
   * Exportación Universal en CSV con BOM UTF-8 (\uFEFF) para Excel en Windows (Directiva 17)
   */
  exportBatchCSV(batchId) {
    const batch = this.batches.get(batchId);
    if (!batch) throw new Error(`Lote no encontrado: ${batchId}`);

    const lines = [];
    lines.push(`LIQUIDACIÓN MENSUAL DE COMEDOR INDUSTRIAL - FOODTRACK`);
    lines.push(`Lote ID;${batch.id}`);
    lines.push(`Empresa / Planta;${batch.companyName}`);
    lines.push(`Período;${batch.period}`);
    lines.push(`Total Raciones Certificadas;${batch.totalMeals}`);
    lines.push(`Subsidio Total a Facturar Empresa;${formatARS(batch.totalCompanySubsidy)}`);
    lines.push(`Total Descuento Copago Nómina RRHH;${formatARS(batch.totalEmployeeCopay)}`);
    lines.push(`Estado Auditoría;${batch.auditStatus}`);
    lines.push(`Sello Hash Lote;${batch.batchHash}`);
    lines.push(``);
    lines.push(`DETALLE INDIVIDUAL DE SERVICIO DE COMEDOR (CERO DISPUTAS)`);
    lines.push(`ID Transacción;Fecha;Hora;Turno;Operario;DNI;Sector;Plato Servido;Dieta;Precio ARS;Subsidio Empresa;Copago Operario;Sello Criptográfico SHA-256`);

    batch.transactions.forEach(t => {
      const timeStr = new Date(t.timestamp).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
      lines.push(
        `"${t.txId}";"${t.shiftDate}";"${timeStr}";"${t.shift}";"${t.employeeName}";"${t.dni}";"${t.sector}";"${t.dishServed}";"${t.dietaryProfile}";"${t.unitPrice}";"${t.subsidy}";"${t.copay}";"${t.hashSeal}"`
      );
    });

    return '\uFEFF' + lines.join('\r\n');
  }
}
