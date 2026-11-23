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

La sesión usa un token JWT almacenado en `sessionStorage` y termina al cerrar la pestaña o salir de la aplicación. La API y las credenciales de demostración son solo para desarrollo; reemplaza las credenciales y secretos antes de desplegar.

Las cifras tributarias son únicamente referenciales y no sustituyen asesoría contable ni una declaración ante el SII.
# Restaurante-Front
