# MesaLista

Panel web para administrar un restaurante en Chile, construido con React y Vite e integrado con la API Spring Boot.

## Iniciar

Levanta primero el backend desde `C:\Proyectos\Restaurante-Data`:

```bash
docker compose up -d --build
```

La API queda disponible en `http://localhost:8082/api`.

Luego, desde la carpeta del frontend:

```bash
npm install
npm run dev
```

El frontend usa `http://localhost:8082/api` de forma predeterminada. Para apuntarlo a otra API, configura `VITE_API_URL` (por ejemplo, en un archivo `.env.local`):

```dotenv
VITE_API_URL=http://localhost:8082/api
```

Para probar el entorno local, inicia sesión con el usuario demo `admin` y la contraseña `AdminDemo2026!`.

Para ejecutar las pruebas unitarias:

```bash
npm test
```

Para generar y previsualizar la versión de producción:

```bash
npm run build
npm run preview
```

## Secciones

- **Inicio:** resumen de ventas, pedidos, mesas y productos destacados.
- **Menú:** crea el menú principal si el restaurante aún no tiene uno; luego permite agregar, editar, buscar y eliminar productos en la API.
- **Pedidos:** creación con productos y cantidades, avance por los estados del servicio y cobro conjunto de los pedidos entregados en una mesa con un único total y confirmación.
- **Restaurantes y usuarios:** sección exclusiva de Administrador Master para registrar restaurantes y crear usuarios con rol y restaurante asignados.
- **Gestión de negocio:** métricas en CLP, estimación referencial del IVA y enlaces/herramientas para la gestión en Chile.
- **Impresión de tickets:** Administrador Master, Administrador y Restaurante pueden editar la plantilla de comprobante no fiscal e imprimirla o realizar una prueba en una impresora térmica de 80 mm.

En **Pedidos** hay un temporizador cuyo tiempo se edita directamente en formato minutos:segundos (de `00:01` a `1440:00`). Se puede iniciar, pausar y reiniciar; para editarlo mientras cuenta, primero hay que pausarlo. Cada vez que llega a cero acepta el pedido nuevo más antiguo del restaurante y vuelve a contar. Si no hay pedidos nuevos o ocurre un error, se detiene. Es local a la pestaña: continúa al cambiar de sección, pero se detiene al cerrar o recargar la página o cambiar de restaurante. Cada pestaña tiene su propio temporizador.

En un pedido **En preparación**, usa **Modificar** para ajustar cantidades o quitar productos del pedido sin eliminarlos del menú. En **Agregar productos del menú** puedes seleccionar productos disponibles y luego ajustar sus cantidades; también puedes restaurar productos quitados antes de guardar. Los productos existentes conservan su precio original; los nuevos usan el precio actual y el pedido debe tener al menos uno. Para eliminarlo completo, abre **Modificar**, usa **Eliminar pedido** y confirma; avisa a cocina de la eliminación. Después de cambiar los productos aparece **Reimprimir cocina**; al enviar el ticket se oculta hasta la próxima modificación. El navegador no confirma la impresión física: también se ocultará si se cancela el diálogo de impresión.

Al aceptar automáticamente un pedido, la aplicación envía el ticket de cocina a imprimir. El navegador no confirma la impresión física.

Para imprimir, instala la impresora en el sistema operativo, selecciónala en el diálogo del navegador y configura papel de 80 mm, escala al 100 % y márgenes mínimos o ninguno. La aplicación no detecta la impresora ni confirma la impresión física; comprueba el resultado en papel.

En **Impresión de tickets**, edita y guarda una plantilla compartida por restaurante. Los marcadores `{{restaurante}}`, `{{fecha}}`, `{{mesa}}`, `{{productos}}` y `{{total}}` se sustituyen al imprimir la cuenta; el contenido debe incluir los tres últimos. La impresión de la plantilla desde ese módulo muestra los marcadores literalmente. Los datos fijos del negocio se escriben en la plantilla; no se calculan IVA ni propina.
Los garzones no tienen acceso al módulo ni pueden modificar la plantilla, pero siguen utilizándola automáticamente al imprimir una cuenta.

Al pulsar **Imprimir cuenta** en la tarjeta de una mesa, se consultan los pedidos entregados pendientes y la plantilla guardada, y se imprime una cuenta con los productos, cantidades, precios históricos y total. Es una cuenta pendiente: imprimirla no registra el pago y se puede volver a imprimir mientras haya pedidos pendientes. No incluye pedidos aún no entregados. **Confirmar pago total** abre la ventana de cobro sin imprimir; solo al confirmar en esa ventana se registra el pago.

Al confirmar el pago, elige entre **Efectivo** y **Débito / Crédito**. Los pagos con tarjeta no se suman al efectivo de caja.

Independientemente del texto elegido, el comprobante es **no fiscal**, no se envía al SII y no reemplaza la boleta electrónica cuando corresponda. Para una boleta tributaria válida se necesita un sistema autorizado de emisión electrónica.

Al aceptar un pedido desde el panel web, se envía a imprimir un ticket de cocina con la mesa, la fecha y hora de creación, el garzón, los productos y la descripción. El pedido permanece aceptado aunque no se imprima; el navegador no confirma la impresión física. La reimpresión solo está disponible después de modificar productos.

### Impresión directa por USB (WebUSB)

Es el método recomendado para la impresora térmica USB: el navegador envía el ticket en ESC/POS a la impresora, sin diálogo ni opciones especiales de Chrome. Requiere Chrome o Edge en `http://localhost` o `https`.

#### 1. Instalar el controlador WinUSB con Zadig

**Antes**

- Conecta y enciende la térmica por USB.
- Descarga Zadig solo desde [https://zadig.akeo.ie](https://zadig.akeo.ie/). No necesita instalación, es un `.exe` que se ejecuta como administrador.

**En Zadig**

1. Menú *Options → List All Devices*.
2. Elige tu impresora en la lista. Si no la reconoces, desenchúfala y mira cuál desaparece.
3. Selecciona **WinUSB** como driver de destino (a la derecha de la flecha).
4. Pulsa **Replace Driver** y espera el mensaje de éxito.

Después, la impresora deja de aparecer como impresora de Windows; para volver al diálogo del navegador, reinstala el controlador del fabricante.

#### 2. Conectar y probar

1. Abre la aplicación y pulsa **Conectar impresora** en la barra superior. Elige la impresora; el permiso queda guardado para ese navegador y se restablece solo al volver a abrirlo.
2. Desde **Impresión de tickets**, usa **Imprimir prueba** y comprueba que salgan bien los acentos y la ñ. Si salen caracteres raros, cambia `CODE_PAGE_CP858` en [src/escpos.js](src/escpos.js) por la página de códigos de tu modelo (por ejemplo `16` para Windows-1252).

Los tickets usan 48 columnas (papel de 80 mm, fuente A) y cortan al final. Con la impresora conectada, la aplicación no abre el diálogo del navegador; si falla el envío, muestra un aviso. Sin impresora USB conectada se usa el diálogo del navegador como antes. El navegador no confirma que el papel se haya impreso.

### Impresión automática en Windows (alternativa con Chrome)

Si la impresora no se puede usar con WinUSB, puedes imprimir sin diálogo con Chrome en modo `--kiosk-printing`. Instala Google Chrome y configura la impresora térmica como impresora predeterminada de Windows, con papel de 80 mm. Con el frontend y el backend iniciados, abre PowerShell y ejecuta:

```powershell
$chrome = "$env:ProgramFiles\Google\Chrome\Application\chrome.exe"
$perfil = "$env:LOCALAPPDATA\MesaLista\ChromeImpresion"
Start-Process $chrome -ArgumentList @('--kiosk-printing', '--no-first-run', "--user-data-dir=`"$perfil`"", '--app=http://localhost:5173')
```

Inicia sesión en la ventana dedicada que se abre y acepta los pedidos allí, o inicia el temporizador para aceptarlos automáticamente. Chrome imprimirá sin confirmación usando su impresora y opciones predeterminadas; verifica que coincidan con la impresora térmica de Windows. Esta ventana usa un perfil independiente y la impresión silenciosa afecta también a cualquier otra página abierta en ella, por lo que debe utilizarse solo para MesaLista. El navegador habitual no cambia. Para otra dirección del frontend, reemplaza la URL del argumento `--app`. El navegador no puede confirmar la impresión física; revisa el papel.

La sesión usa un token JWT almacenado en `sessionStorage` y termina al cerrar la pestaña o salir de la aplicación. La API y las credenciales de demostración son solo para desarrollo; reemplaza las credenciales y secretos antes de desplegar.

Las cifras tributarias son únicamente referenciales y no sustituyen asesoría contable ni una declaración ante el SII.
# Restaurante-Front
