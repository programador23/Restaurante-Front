import React, { useState } from 'react';

export default function PrinterButton({ usb, onMessage }) {
  const [busy, setBusy] = useState(false);
  if (!usb.supported) return null;

  async function toggle() {
    setBusy(true);
    try {
      if (usb.connected) {
        await usb.disconnect();
        onMessage('Impresora USB desconectada. Se usará el diálogo de impresión del navegador.');
      } else {
        await usb.connect();
        onMessage('Impresora USB conectada. Los tickets se imprimirán sin diálogo.');
      }
    } catch (error) {
      if (error.name !== 'NotFoundError') {
        onMessage(`No se pudo conectar la impresora USB: ${error.message}`);
      }
    } finally {
      setBusy(false);
    }
  }

  return <button
    type="button"
    className="outline-button printer-status-button"
    onClick={toggle}
    disabled={busy}
    title={usb.connected ? `${usb.name}: clic para desconectar` : 'Conectar impresora térmica USB'}
  >
    <span className={`printer-dot ${usb.connected ? 'on' : ''}`} />
    {usb.connected ? 'Impresora conectada' : 'Conectar impresora'}
  </button>;
}
