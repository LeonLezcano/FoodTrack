/**
 * FoodTrack - Totem Meal Validation & Anti-Double-Ration Engine
 * Engine #245 (ePOD/Totem Scan) & Engine #159 (Crypto Hash Audit Ledger)
 * Eliminates billing disputes between Catering and Corporate HR.
 */

import { sha256 } from '../utils/cryptoSeal.js';
import { getDietaryBadge } from '../utils/formatters.js';

export class MealValidationService {
  constructor(employeeRegistry, menuProductionEngine) {
    this.employeeRegistry = employeeRegistry;
    this.menuEngine = menuProductionEngine;
    this.transactions = new Map(); // txId -> transaction
    this.dailyShiftConsumed = new Set(); // Key: `${employeeId}_${shiftDate}_${shift}`
    this.idCounter = 100;
  }

  generateTxId() {
    this.idCounter += 1;
    return `TX-${this.idCounter}-${Date.now().toString(36).slice(-4)}`;
  }

  /**
   * Validación en Línea de Servicio del Comedor (<1 segundo)
   */
  validateAndDispenseMeal({
    dni,
    shiftDate = new Date().toISOString().slice(0, 10),
    shift = 'Mañana',
    totemDevice = 'Totem-Línea-1'
  }) {
    if (!dni) {
      return {
        allowed: false,
        error: 'Debe ingresar o escanear el DNI del operario'
      };
    }

    const employee = this.employeeRegistry.findByDni(dni);
    if (!employee) {
      return {
        allowed: false,
        error: `Operario no empadronado con DNI: ${dni}. Diríjase a RRHH.`
      };
    }

    if (employee.status !== 'active') {
      return {
        allowed: false,
        error: `Operario ${employee.fullName} en estado ${employee.status} (Inactivo para comedor).`
      };
    }

    // Anti-Double-Ration Check
    const consumptionKey = `${employee.id}_${shiftDate}_${shift}`;
    if (this.dailyShiftConsumed.has(consumptionKey)) {
      // Find prior transaction for details
      let priorTx = null;
      for (const tx of this.transactions.values()) {
        if (tx.consumptionKey === consumptionKey) {
          priorTx = tx;
          break;
        }
      }

      return {
        allowed: false,
        isDoubleRationAttempt: true,
        employeeName: employee.fullName,
        dni: employee.dni,
        company: employee.companyName,
        shift,
        error: `⛔ ACCESO DENEGADO: Ración ya consumida en el Turno ${shift} a las ${priorTx ? new Date(priorTx.timestamp).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : 'anteriormente'}.`
      };
    }

    // Retrieve chosen dish from pre-selection or default
    const preSelection = this.menuEngine ? this.menuEngine.getSelection(employee.id, shiftDate, shift) : null;
    const dishServed = preSelection ? preSelection.dishName : 'Menú Tradicional del Día';

    const dietaryBadge = getDietaryBadge(employee.dietaryProfile);
    const txId = this.generateTxId();
    const nowIso = new Date().toISOString();

    // Company meal contract price
    const company = this.employeeRegistry.getCompany(employee.companyId);
    const unitPrice = company ? company.contractMealPrice : 8500;
    const companySubsidyAmount = Math.round(unitPrice * (employee.subsidyPercentage / 100));
    const employeeCopayAmount = unitPrice - companySubsidyAmount;

    // Cryptographic Seal (Engine #159)
    const sealPayload = JSON.stringify({
      txId,
      employeeId: employee.id,
      dni: employee.dni,
      companyId: employee.companyId,
      shiftDate,
      shift,
      dishServed,
      dietaryProfile: employee.dietaryProfile,
      unitPrice,
      timestamp: nowIso
    });
    const hashSeal = sha256(sealPayload);

    const transaction = {
      id: txId,
      consumptionKey,
      employeeId: employee.id,
      employeeName: employee.fullName,
      dni: employee.dni,
      companyId: employee.companyId,
      companyName: employee.companyName,
      sector: employee.sector,
      shiftDate,
      shift,
      dishServed,
      dietaryProfile: employee.dietaryProfile,
      dietaryBadge,
      unitPrice,
      companySubsidyAmount,
      employeeCopayAmount,
      totemDevice,
      timestamp: nowIso,
      hashSeal
    };

    this.transactions.set(txId, transaction);
    this.dailyShiftConsumed.add(consumptionKey);

    return {
      allowed: true,
      transaction,
      employeeName: employee.fullName,
      dni: employee.dni,
      companyName: employee.companyName,
      dishServed,
      dietaryBadge,
      hasMedicalAlert: dietaryBadge.isMedicalAlert,
      message: `✅ Ración habilitada para ${employee.fullName}`
    };
  }

  getTransaction(txId) {
    return this.transactions.get(txId) || null;
  }

  listTransactions(filter = {}) {
    let result = Array.from(this.transactions.values());

    if (filter.companyId) {
      result = result.filter(t => t.companyId === filter.companyId);
    }
    if (filter.shiftDate) {
      result = result.filter(t => t.shiftDate === filter.shiftDate);
    }
    if (filter.shift) {
      result = result.filter(t => t.shift === filter.shift);
    }

    return result;
  }

  verifyTransactionIntegrity(txId) {
    const tx = this.transactions.get(txId);
    if (!tx) throw new Error(`Transacción no encontrada: ${txId}`);

    const sealPayload = JSON.stringify({
      txId: tx.id,
      employeeId: tx.employeeId,
      dni: tx.dni,
      companyId: tx.companyId,
      shiftDate: tx.shiftDate,
      shift: tx.shift,
      dishServed: tx.dishServed,
      dietaryProfile: tx.dietaryProfile,
      unitPrice: tx.unitPrice,
      timestamp: tx.timestamp
    });

    const expectedHash = sha256(sealPayload);
    const matches = expectedHash === tx.hashSeal;

    return {
      txId,
      isTampered: !matches,
      hashMatches: matches,
      currentHash: expectedHash,
      storedSeal: tx.hashSeal
    };
  }
}
