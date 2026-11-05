/**
 * FoodTrack Formatters - Formato Gastronómico, Clínico y Financiero para Argentina
 */

export function formatARS(amount) {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
}

export function formatDate(isoString) {
  if (!isoString) return '-';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

export function formatDateTime(isoString) {
  if (!isoString) return '-';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Evaluación de Seguridad Bromatológica HACCP
 * Evalúa temperatura de despacho o recepción en grados Celsius
 * @param {number} tempC - Temperatura medida
 * @param {'hot'|'cold'} category - Tipo de plato ('hot' caliente o 'cold' ensalada/postre)
 */
export function evaluateHaccpTemp(tempC, category = 'hot') {
  const temp = Number(tempC);
  if (isNaN(temp)) {
    return {
      status: 'critical',
      message: 'Temperatura no válida o no registrada',
      color: 'text-rose-400 bg-rose-950/60 border-rose-800'
    };
  }

  if (category === 'hot') {
    // Comida caliente: Seguro >= 65°C
    if (temp >= 65) {
      return {
        status: 'safe',
        message: `Temperatura Segura (${temp}°C ≥ 65°C)`,
        color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800'
      };
    } else if (temp >= 60) {
      return {
        status: 'warning',
        message: `Margen Crítico (${temp}°C). Consumir antes de 60 min`,
        color: 'text-amber-400 bg-amber-950/60 border-amber-800'
      };
    } else {
      return {
        status: 'danger',
        message: `PELIGRO BACTERIANO (${temp}°C < 60°C). Regenerar de urgencia`,
        color: 'text-rose-400 bg-rose-950/60 border-rose-800'
      };
    }
  } else {
    // Comida fría / ensaladas: Seguro <= 4°C
    if (temp <= 4) {
      return {
        status: 'safe',
        message: `Cadena de Frío Óptima (${temp}°C ≤ 4°C)`,
        color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800'
      };
    } else if (temp <= 7) {
      return {
        status: 'warning',
        message: `Frío al Límite (${temp}°C)`,
        color: 'text-amber-400 bg-amber-950/60 border-amber-800'
      };
    } else {
      return {
        status: 'danger',
        message: `ROTURA DE CADENA DE FRÍO (${temp}°C > 7°C)`,
        color: 'text-rose-400 bg-rose-950/60 border-rose-800'
      };
    }
  }
}

/**
 * Retorna las clases de estilo y advertencia para dietas médicas
 */
export function getDietaryBadge(dietaryProfile) {
  const clean = String(dietaryProfile || 'Estándar').trim().toLowerCase();
  if (clean.includes('celíaco') || clean.includes('tacc')) {
    return {
      label: '🌾❌ SIN TACC (CELÍACO)',
      isMedicalAlert: true,
      className: 'bg-amber-950 text-amber-300 border border-amber-700 animate-pulse font-bold'
    };
  }
  if (clean.includes('hiposódico') || clean.includes('sal')) {
    return {
      label: '🧂❌ HIPOSÓDICO',
      isMedicalAlert: true,
      className: 'bg-blue-950 text-blue-300 border border-blue-700 font-bold'
    };
  }
  if (clean.includes('diabético') || clean.includes('azúcar')) {
    return {
      label: '🩺 DIABÉTICO',
      isMedicalAlert: true,
      className: 'bg-purple-950 text-purple-300 border border-purple-700 font-bold'
    };
  }
  if (clean.includes('vegetariano') || clean.includes('vegano')) {
    return {
      label: '🌱 VEGETARIANO',
      isMedicalAlert: false,
      className: 'bg-emerald-950 text-emerald-300 border border-emerald-800'
    };
  }
  return {
    label: '🍽️ MENÚ ESTÁNDAR',
    isMedicalAlert: false,
    className: 'bg-slate-800 text-slate-300 border border-slate-700'
  };
}
