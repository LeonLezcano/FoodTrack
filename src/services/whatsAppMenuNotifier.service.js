/**
 * FoodTrack - WhatsApp E.164 Menu Notification Engine
 * Engine #108 & #157 (Operario & Plant Communication)
 */

export class WhatsAppMenuNotifier {
  static cleanPhoneNumber(phone) {
    if (!phone) return '';
    let cleaned = phone.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '549' + cleaned.slice(1);
    } else if (cleaned.startsWith('+549')) {
      cleaned = cleaned.slice(1);
    } else if (cleaned.startsWith('+')) {
      cleaned = cleaned.slice(1);
    }
    if (!cleaned.startsWith('549') && cleaned.length === 10) {
      cleaned = '549' + cleaned;
    }
    return cleaned;
  }

  static generateMenuSelectionUrl({ phone, employeeName, date, companyName, menuOptions = [] }) {
    const cleanPhone = this.cleanPhoneNumber(phone);
    const optionsText = menuOptions.length > 0
      ? menuOptions.map((o, idx) => `• Opción ${idx + 1}: ${o.name} (${o.type})`).join('\n')
      : '• Menú Tradicional\n• Menú Saludable Light\n• Menú Vegetariano';

    const text =
      `🍽️ *FoodTrack - Elección de Menú para el ${date}*\n\n` +
      `Hola *${employeeName || 'Operario'}*, ya podés elegir tu almuerzo/cena en el comedor de *${companyName}*.\n\n` +
      `📋 *Opciones Disponibles:*\n${optionsText}\n\n` +
      `⏱️ *Horario de Corte (Cut-Off):* Hoy hasta las 16:00 hs.\n` +
      `_¡Cuidemos los alimentos! Cero Desperdicio FoodTrack._`;

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  }

  static generateCutOffReminderUrl({ phone, employeeName, date }) {
    const cleanPhone = this.cleanPhoneNumber(phone);
    const text =
      `⏰ *¡ATENCIÓN! Cierre de Pedidos de Comida - FoodTrack*\n\n` +
      `Estimado/a *${employeeName}*, faltan pocos minutos para el cierre del horario de corte (16:00 hs) para el servicio del ${date}.\n\n` +
      `Si aún no elegiste tu menú, hacelo ahora para garantizar tu plato preferido y evitar la asignación automática.\n` +
      `_FoodTrack Concesiones Gastronómicas._`;

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  }

  static generateHaccpAlertUrl({ phone, auditorName, containerId, plantName, tempC, stage }) {
    const cleanPhone = this.cleanPhoneNumber(phone);
    const text =
      `🚨 *ALERTA BROMATOLÓGICA HACCP - FOODTRACK*\n\n` +
      `Inspector: *${auditorName}*\n` +
      `Contenedor: *${containerId}*\n` +
      `Destino: *${plantName}*\n` +
      `Etapa: *${stage === 'kitchen_dispatch' ? 'Salida de Cocina' : 'Recepción en Planta'}*\n` +
      `Temperatura Registrada: *${tempC}°C*\n\n` +
      `⚠️ *Acción Requerida:* Desvío térmico detectado. Proceder a regeneración forzada o aislamiento del lote.\n` +
      `_Inocuidad Alimentaria Garantizada FoodTrack._`;

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  }
}
