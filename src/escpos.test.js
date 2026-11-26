import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildTicket, encodeText, wrapText } from './escpos.js';

test('codifica acentos, ñ y signos del español en CP858', () => {
  assert.deepEqual(encodeText('áéíóú ñÑ ¡¿ü'), [0xa0, 0x82, 0xa1, 0xa2, 0xa3, 0x20, 0xa4, 0xa5, 0x20, 0xad, 0xa8, 0x81]);
  assert.deepEqual(encodeText('€'), [0xd5]);
  assert.deepEqual(encodeText('日'), [0x3f]);
});

test('parte las líneas largas en espacios sin superar el ancho', () => {
  const lines = wrapText('1 x Lomo saltado con arroz y papas fritas especial de la casa', 20);
  assert.ok(lines.every((line) => line.length <= 20));
  assert.equal(lines.join(' '), '1 x Lomo saltado con arroz y papas fritas especial de la casa');
  assert.deepEqual(wrapText('a\n\nb'), ['a', '', 'b']);
});

test('el ticket inicia la impresora, usa CP858 y termina con avance y corte', () => {
  const bytes = [...buildTicket({ title: 'COCINA', content: 'Mesa: 4', footer: 'Gracias' })];
  assert.deepEqual(bytes.slice(0, 5), [0x1b, 0x40, 0x1b, 0x74, 19]);
  assert.deepEqual(bytes.slice(-7), [0x1b, 0x64, 4, 0x1d, 0x56, 0x42, 0x00]);
  assert.ok(Buffer.from(bytes).includes(Buffer.from('Mesa: 4\n')));
});
