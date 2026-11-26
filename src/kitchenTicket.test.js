import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatKitchenTicket } from './kitchenTicket.js';

test('el ticket de cocina contiene los datos y cantidades del pedido', () => {
  const ticket = formatKitchenTicket({
    displayId: 'ORD-0007',
    table: 4,
    createdAt: new Date(2026, 10, 24, 15, 30).getTime(),
    server: 'Ana Pérez',
    description: 'Sin cebolla',
    items: [{ quantity: 2, name: 'Lomo' }, { quantity: 1, name: 'Agua' }],
  });

  assert.match(ticket, /Pedido: ORD-0007/);
  assert.match(ticket, /Mesa: 4/);
  assert.match(ticket, /Fecha y hora: 24-11-2026, 15:30/);
  assert.match(ticket, /Garzón: Ana Pérez/);
  assert.match(ticket, /2 x Lomo\n1 x Agua/);
  assert.match(ticket, /DESCRIPCIÓN\nSin cebolla/);
});

test('la fecha y hora de cocina usan formato de 24 horas', () => {
  for (const [hour, expected] of [[0, '00:30'], [12, '12:30'], [23, '23:30']]) {
    const ticket = formatKitchenTicket({
      displayId: 'ORD-0009',
      table: 1,
      createdAt: new Date(2026, 10, 25, hour, 30).getTime(),
      server: 'Sin asignar',
      description: '',
      items: [],
    });
    assert.ok(ticket.includes(`Fecha y hora: 25-11-2026, ${expected}\n`));
  }
});

test('el ticket indica cuando el pedido no tiene descripción', () => {
  const ticket = formatKitchenTicket({
    displayId: 'ORD-0008',
    table: 2,
    createdAt: new Date(2026, 10, 24, 15, 30).getTime(),
    server: 'Sin asignar',
    description: '',
    items: [{ quantity: 1, name: 'Té' }],
  });

  assert.match(ticket, /Garzón: Sin asignar/);
  assert.match(ticket, /DESCRIPCIÓN\nSin descripción/);
});
