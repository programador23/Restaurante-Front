export const defaultReceiptTemplate = {
  encabezado: 'COMPROBANTE NO FISCAL',
  contenido: `{{restaurante}}
RUT:
Giro:
Dirección:
Teléfono:

Fecha y hora: {{fecha}}
Mesa: {{mesa}}
--------------------------------
DETALLE
{{productos}}
--------------------------------
TOTAL CONSUMO: {{total}}

¡Gracias por su visita!`,
  pie: 'NO ES BOLETA TRIBUTARIA\nNO REEMPLAZA LA BOLETA ELECTRÓNICA',
};

const requiredMarkers = ['mesa', 'productos', 'total'];
const supportedMarkers = new Set(['restaurante', 'fecha', ...requiredMarkers]);

export function resolveReceiptTemplate(template) {
  if (template && template.encabezado === null && template.contenido === null && template.pie === null) {
    return { ...defaultReceiptTemplate };
  }
  if (!template || ['encabezado', 'contenido', 'pie'].some((key) => typeof template[key] !== 'string')) {
    throw new Error('La plantilla recibida no es válida.');
  }
  return template;
}

export function validateReceiptTemplate(template) {
  for (const marker of requiredMarkers) {
    if (!template.contenido.includes(`{{${marker}}}`)) {
      throw new Error(`El contenido debe incluir {{${marker}}}.`);
    }
  }
  for (const text of [template.encabezado, template.contenido, template.pie]) {
    for (const match of text.matchAll(/\{\{([^{}]+)}}/g)) {
      if (!supportedMarkers.has(match[1])) throw new Error(`Marcador no reconocido: ${match[0]}.`);
    }
  }
}

export function renderReceipt(template, group, restaurantName, date = new Date()) {
  validateReceiptTemplate(template);
  const money = (amount) => `$${new Intl.NumberFormat('es-CL').format(amount)}`;
  const products = group.orders.flatMap((order) => [
    `Pedido ${order.displayId}`,
    ...order.items.map((item) => `${item.quantity} x ${item.name}\n  ${money(item.unitPrice)} c/u = ${money(item.quantity * item.unitPrice)}`),
  ]).join('\n');
  const values = {
    restaurante: restaurantName,
    fecha: new Intl.DateTimeFormat('es-CL', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    }).format(date),
    mesa: String(group.table),
    productos: products,
    total: money(group.total),
  };
  const render = (text) => text.replace(/\{\{([^{}]+)}}/g, (match, marker) => values[marker]);
  return {
    title: render(template.encabezado),
    content: `${render(template.contenido)}\n\nCUENTA PENDIENTE DE PAGO`,
    footer: render(template.pie),
  };
}
