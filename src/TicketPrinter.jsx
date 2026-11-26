import React, { useCallback, useEffect, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { isUsbPrinterSupported, usbPrinter } from './usbPrinter';
import './ticket.css';

export function useTicketPrinter() {
  const [ticket, setTicket] = useState(null);
  const [usbState, setUsbState] = useState({ connected: usbPrinter.isConnected(), name: usbPrinter.getName() });

  useEffect(() => {
    const cleanup = () => document.body.classList.remove('printing-ticket');
    window.addEventListener('afterprint', cleanup);
    return () => {
      window.removeEventListener('afterprint', cleanup);
      cleanup();
    };
  }, []);

  useEffect(() => {
    const sync = () => setUsbState({ connected: usbPrinter.isConnected(), name: usbPrinter.getName() });
    const unsubscribe = usbPrinter.subscribe(sync);
    usbPrinter.restore().catch(() => {});
    sync();
    return unsubscribe;
  }, []);

  const connectUsb = useCallback(() => usbPrinter.connect(), []);
  const disconnectUsb = useCallback(() => usbPrinter.disconnect(), []);

  async function printTicket(content) {
    if (isUsbPrinterSupported()) {
      await usbPrinter.restore().catch(() => {});
      if (usbPrinter.isConnected()) {
        await usbPrinter.print(content);
        return;
      }
    }
    flushSync(() => setTicket(content));
    document.body.classList.add('printing-ticket');
    try {
      window.print();
    } catch (error) {
      document.body.classList.remove('printing-ticket');
      throw error;
    }
  }

  const printableTicket = ticket && createPortal(
    <div className="ticket-print">
      <div className="ticket-print-notice">{ticket.title}</div>
      <pre>{ticket.content}</pre>
      {ticket.footer && <div className="ticket-print-notice">{ticket.footer}</div>}
    </div>,
    document.body,
  );

  const usb = { supported: isUsbPrinterSupported(), ...usbState, connect: connectUsb, disconnect: disconnectUsb };
  return { printTicket, printableTicket, usb };
}
