import { buildTicket } from './escpos.js';

const CHUNK_SIZE = 16384;

function findOutEndpoint(device) {
  const candidates = [];
  for (const usbInterface of device.configuration?.interfaces ?? []) {
    for (const alternate of usbInterface.alternates) {
      const endpoint = alternate.endpoints.find((entry) => entry.direction === 'out' && entry.type === 'bulk');
      if (endpoint) candidates.push({ usbInterface, interfaceNumber: usbInterface.interfaceNumber, alternate, endpoint });
    }
  }
  return candidates.find((entry) => entry.alternate.interfaceClass === 7) ?? candidates[0];
}

export function isUsbPrinterSupported() {
  return typeof navigator !== 'undefined' && Boolean(navigator.usb);
}

export function createUsbPrinter() {
  let device = null;
  let target = null;
  const listeners = new Set();

  const notify = () => listeners.forEach((listener) => listener());

  async function open(candidate) {
    if (!candidate.opened) await candidate.open();
    if (!candidate.configuration) await candidate.selectConfiguration(1);
    const found = findOutEndpoint(candidate);
    if (!found) throw new Error('La impresora no expone un endpoint USB de salida. Revisa el controlador WinUSB.');
    if (!found.usbInterface.claimed) await candidate.claimInterface(found.interfaceNumber);
    if (found.alternate.alternateSetting !== 0) {
      await candidate.selectAlternateInterface(found.interfaceNumber, found.alternate.alternateSetting);
    }
    device = candidate;
    target = found;
    notify();
  }

  async function restore() {
    if (!isUsbPrinterSupported() || device) return;
    for (const candidate of await navigator.usb.getDevices()) {
      try {
        await open(candidate);
        return;
      } catch {
        // Otro dispositivo autorizado o la impresora ocupada por otro programa.
      }
    }
  }

  async function connect() {
    const selected = await navigator.usb.requestDevice({ filters: [] });
    await open(selected);
  }

  async function disconnect() {
    const current = device;
    device = null;
    target = null;
    notify();
    if (current) {
      try { await current.forget(); } catch { /* el permiso ya no existe */ }
    }
  }

  async function print(ticket) {
    if (!device) await restore();
    if (!device) throw new Error('La impresora USB no está conectada.');
    const data = buildTicket(ticket);
    try {
      for (let offset = 0; offset < data.length; offset += CHUNK_SIZE) {
        const result = await device.transferOut(target.endpoint.endpointNumber, data.slice(offset, offset + CHUNK_SIZE));
        if (result.status !== 'ok') throw new Error(`La impresora respondió ${result.status}.`);
      }
    } catch (error) {
      device = null;
      target = null;
      notify();
      throw error;
    }
  }

  if (isUsbPrinterSupported()) {
    navigator.usb.addEventListener('disconnect', (event) => {
      if (event.device === device) {
        device = null;
        target = null;
        notify();
      }
    });
    navigator.usb.addEventListener('connect', () => { restore().catch(() => {}); });
  }

  return {
    connect,
    disconnect,
    print,
    restore,
    isConnected: () => device !== null,
    getName: () => device?.productName || 'Impresora USB',
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export const usbPrinter = createUsbPrinter();
