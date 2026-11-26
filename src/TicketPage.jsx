import React, { useEffect, useState } from 'react';
import { getTicketTemplate, saveTicketTemplate } from './api';
import { resolveReceiptTemplate, validateReceiptTemplate } from './receiptTemplate';

const testTicket = `PRUEBA DE IMPRESIÓN

Impresora térmica de 80 mm
Si puedes leer este texto, revisa que
el ancho y los márgenes sean correctos.

Producto de prueba       1      $1.000
Total de prueba:                $1.000`;

export default function TicketPage({ printTicket, restaurantId, usb }) {
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(Boolean(restaurantId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!restaurantId) return undefined;
    let active = true;
    setLoading(true);
    getTicketTemplate(restaurantId)
      .then((result) => { if (active) setTemplate(resolveReceiptTemplate(result)); })
      .catch((loadError) => { if (active) setError(`No se pudo cargar la plantilla: ${loadError.message}`); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [restaurantId]);

  async function save() {
    setError('');
    setMessage('');
    try {
      validateReceiptTemplate(template);
      setSaving(true);
      const saved = await saveTicketTemplate(restaurantId, template);
      setTemplate(resolveReceiptTemplate(saved));
      setMessage('Plantilla guardada para este restaurante.');
    } catch (saveError) {
      setError(`No se pudo guardar la plantilla: ${saveError.message}`);
    } finally {
      setSaving(false);
    }
  }

  function edit(field, value) {
    setMessage('');
    setTemplate((current) => ({ ...current, [field]: value }));
  }

  async function print(content) {
    if (!content.trim()) {
      setError('Escribe el contenido del comprobante antes de imprimir.');
      return;
    }
    setError('');
    try {
      await printTicket({
        title: template.encabezado,
        content,
        footer: template.pie,
      });
    } catch (printError) {
      setError(`No se pudo imprimir: ${printError.message}`);
    }
  }

  if (!restaurantId) return <div className="panel">Selecciona un restaurante para configurar su plantilla.</div>;
  if (loading) return <div className="panel">Cargando plantilla del restaurante…</div>;
  if (!template) return <div className="form-error" role="alert">{error || 'No se pudo cargar la plantilla.'}</div>;

  return <div className="ticket-page">
    <div className="page-heading">
      <div>
        <div className="eyebrow">IMPRESIÓN</div>
        <h1>Impresión de tickets</h1>
        <p>Prepara comprobantes no fiscales para impresoras térmicas de 80 mm.</p>
      </div>
    </div>
    <div className="ticket-grid">
      <section className="panel ticket-setup">
        <div className="panel-header"><div><h2>Conectar y configurar impresora</h2><p>{usb?.supported ? 'Impresión directa por USB, sin diálogo del navegador.' : 'La selección se realiza desde el diálogo de impresión del navegador.'}</p></div></div>
                {usb?.supported ? <>
                  <ol>
                    <li>Con Zadig, instala el controlador WinUSB en la impresora (ver README). Después deja de aparecer como impresora de Windows.</li>
                    <li>Pulsa «Conectar impresora» en la barra superior y elige la impresora térmica. Solo se pide una vez por navegador.</li>
                    <li>Elige «Imprimir prueba» y revisa que los acentos y la ñ salgan bien. Si no, ajusta la página de códigos en escpos.js.</li>
                  </ol>
                  <p>Estado: <strong>{usb.connected ? `${usb.name} conectada` : 'sin impresora USB; se usa el diálogo del navegador'}</strong>. El navegador no confirma que el papel se haya impreso.</p>
                </> : <>
                  <ol>
                    <li>Conecta la impresora e instálala en tu sistema operativo con el controlador del fabricante.</li>
                    <li>Elige «Imprimir prueba» y selecciona la impresora térmica como destino.</li>
                    <li>Configura papel de 80 mm, escala al 100 % y márgenes mínimos o ninguno, según tu impresora.</li>
                  </ol>
                  <p>El navegador no permite comprobar automáticamente la conexión ni confirmar que el papel se haya impreso. Revisa la impresora y la vista previa.</p>
                </>}
        <button type="button" className="outline-button" onClick={() => print(testTicket)}>Imprimir prueba</button>
      </section>
      <section className="panel ticket-editor">
        <div className="panel-header"><div><h2>Editar plantilla del restaurante</h2><p>Guarda los cambios para usarlos en todos los equipos de este restaurante.</p></div></div>
        <div className="ticket-notice"><strong>COMPROBANTE NO FISCAL</strong><br />No es una boleta tributaria y no reemplaza la emisión de la boleta electrónica cuando corresponda. No se envía al SII.</div>
        <p>Marcadores disponibles: {'{{restaurante}}'}, {'{{fecha}}'}, {'{{mesa}}'}, {'{{productos}}'} y {'{{total}}'}. El contenido debe incluir mesa, productos y total.</p>
        <label className="form-field ticket-field">
          Encabezado del comprobante
          <input maxLength="200" disabled={saving} value={template.encabezado} onChange={(event) => edit('encabezado', event.target.value)} />
        </label>
        <label className="form-field ticket-field">
          Contenido del comprobante
          <textarea className="ticket-content" rows="15" maxLength="6000" disabled={saving} value={template.contenido} onChange={(event) => edit('contenido', event.target.value)} />
        </label>
        <label className="form-field ticket-field">
          Texto final del comprobante
          <textarea rows="3" maxLength="1000" disabled={saving} value={template.pie} onChange={(event) => edit('pie', event.target.value)} />
        </label>
        <p>Los marcadores se rellenan al imprimir la cuenta desde Pedidos. Al imprimir la plantilla aquí se muestran literalmente.</p>
        {error && <div className="form-error" role="alert">{error}</div>}
        {message && <p role="status">{message}</p>}
        <div className="ticket-actions">
          <button type="button" className="primary-button" onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Guardar plantilla'}</button>
          <button type="button" className="outline-button" onClick={() => print(template.contenido)} disabled={saving}>Imprimir plantilla</button>
        </div>
      </section>
    </div>
  </div>;
}
