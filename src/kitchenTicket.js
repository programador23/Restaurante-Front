export function formatKitchenTicket(order) {
  const date = new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(order.createdAt));
  const items = order.items.map((item) => `${item.quantity} x ${item.name}`).join('\n');

  return [
    `Pedido: ${order.displayId}`,
    `Mesa: ${order.table}`,
    `Fecha y hora: ${date}`,
    `Garzón: ${order.server}`,
    '',
    'PRODUCTOS',
    items,
    '',
    'DESCRIPCIÓN',
    order.description || 'Sin descripción',
  ].join('\n');
}
