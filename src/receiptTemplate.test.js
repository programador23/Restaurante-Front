import assert from 'node:assert/strict';
import { test } from 'node:test';
import { defaultReceiptTemplate, renderReceipt, resolveReceiptTemplate, validateReceiptTemplate } from './receiptTemplate.js';

test('comprobante usa plantilla y todos los productos entregados con sus precios históricos', () => {
  const template = {
    encabezado: 'Cuenta de {{restaurante}}',
    contenido: 'Mesa {{mesa}}\n{{productos}}\nTotal {{total}}',
    pie: 'Gracias',
  };
  const receipt = renderReceipt(template, {
    table: 4,
    total: 13000,
    orders: [
      { displayId: 'ORD-0001', items: [{ quantity: 2, name: 'Lomo', unitPrice: 5000 }] },
      { displayId: 'ORD-0002', items: [{ quantity: 1, name: 'Té {{mesa}}', unitPrice: 3000 }] },
    ],
  }, 'La Mesa', new Date(2026, 10, 24, 15, 30));

  assert.equal(receipt.title, 'Cuenta de La Mesa');
  assert.match(receipt.content, /Mesa 4/);
  assert.match(receipt.content, /2 x Lomo\n  \$5\.000 c\/u = \$10\.000/);
  assert.match(receipt.content, /1 x Té \{\{mesa}}\n  \$3\.000 c\/u = \$3\.000/);
  assert.match(receipt.content, /Total \$13\.000/);
  assert.match(receipt.content, /CUENTA PENDIENTE DE PAGO/);
  assert.equal(receipt.footer, 'Gracias');
});

test('plantilla inicial y validación de marcadores obligatorios y desconocidos', () => {
  assert.deepEqual(resolveReceiptTemplate({ encabezado: null, contenido: null, pie: null }), defaultReceiptTemplate);
  assert.throws(() => resolveReceiptTemplate({ encabezado: null }), /no es válida/);
  assert.throws(() => validateReceiptTemplate({ ...defaultReceiptTemplate, contenido: '{{mesa}} {{total}}' }), /{{productos}}/);
  assert.throws(() => validateReceiptTemplate({ ...defaultReceiptTemplate, pie: '{{desconocido}}' }), /no reconocido/);
});
