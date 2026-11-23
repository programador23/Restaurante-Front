const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8082/api';
const TOKEN_KEY = 'mesalista.accessToken';

export function getAccessToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY);
}

async function request(path, { method = 'GET', body, authenticated = true } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = authenticated ? getAccessToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 401 && token) {
    clearSession();
    window.dispatchEvent(new Event('mesalista:unauthorized'));
  }

  if (response.status === 204) return null;
  const text = await response.text();
  let result = null;
  if (text) {
    try {
      result = JSON.parse(text);
    } catch {
      result = { error: text };
    }
  }
  if (!response.ok) {
    throw new Error(result?.error || `Error de API (${response.status})`);
  }
  return result;
}

export async function login(nombreUsuario, contrasena) {
  const result = await request('/auth/login', {
    method: 'POST',
    authenticated: false,
    body: { nombreUsuario, contrasena },
  });
  sessionStorage.setItem(TOKEN_KEY, result.accessToken);
  return result.usuario;
}

export function getCurrentUser() {
  return request('/auth/me');
}

export function getRestaurants() {
  return request('/restaurantes');
}

export function createRestaurant(restaurant) {
  return request('/restaurantes', {
    method: 'POST',
    body: { nombre: restaurant.nombre, categoria: restaurant.categoria },
  });
}

export function getUsers() {
  return request('/usuarios');
}

export function createUser(user) {
  return request('/usuarios', {
    method: 'POST',
    body: {
      idRestaurante: user.idRestaurante ?? null,
      nombre: user.nombre,
      apellido: user.apellido,
      nombreUsuario: user.nombreUsuario,
      contrasena: user.contrasena,
      rol: user.rol,
    },
  });
}

export function updateUser(idUsuario, user) {
  const body = {
    nombre: user.nombre,
    apellido: user.apellido,
    rol: user.rol,
  };
  if (user.contrasena) body.contrasena = user.contrasena;
  return request(`/usuarios/${idUsuario}`, {
    method: 'PUT',
    body,
  });
}

export function deleteUser(idUsuario) {
  return request(`/usuarios/${idUsuario}`, { method: 'DELETE' });
}

export function getRestaurantUsers(idRestaurante) {
  return request(`/restaurantes/${idRestaurante}/usuarios`);
}

export function createRestaurantUser(idRestaurante, user) {
  return request(`/restaurantes/${idRestaurante}/usuarios`, {
    method: 'POST',
    body: {
      nombre: user.nombre,
      apellido: user.apellido,
      nombreUsuario: user.nombreUsuario,
      contrasena: user.contrasena,
      rol: user.rol,
    },
  });
}

export function updateRestaurantUser(idRestaurante, idUsuario, user) {
  const body = {
    nombre: user.nombre,
    apellido: user.apellido,
    rol: user.rol,
  };
  if (user.contrasena) body.contrasena = user.contrasena;
  return request(`/restaurantes/${idRestaurante}/usuarios/${idUsuario}`, {
    method: 'PUT',
    body,
  });
}

export function deleteRestaurantUser(idRestaurante, idUsuario) {
  return request(`/restaurantes/${idRestaurante}/usuarios/${idUsuario}`, { method: 'DELETE' });
}

export function getCashRegister(idRestaurante) {
  return request(`/restaurantes/${idRestaurante}/caja`);
}

export function openCashRegister(idRestaurante, initialAmount) {
  return request(`/restaurantes/${idRestaurante}/caja/apertura`, {
    method: 'POST',
    body: { montoInicial: initialAmount },
  });
}

export function closeCashRegister(idRestaurante) {
  return request(`/restaurantes/${idRestaurante}/caja/cierre`, {
    method: 'POST',
  });
}

export function getMenus(idRestaurante) {
  return request(`/restaurantes/${idRestaurante}/menus`);
}

export function createMenu(idRestaurante, nombre) {
  return request(`/restaurantes/${idRestaurante}/menus`, {
    method: 'POST',
    body: { nombre },
  });
}

export async function getMenu(idMenu) {
  const items = await request(`/menus/${idMenu}/items`);
  return items.map(mapMenuItem);
}

export async function saveMenuItem(item, idMenu) {
  const body = {
    nombre: item.name,
    descripcion: item.description,
    valor: item.price,
    categoria: item.category,
    imagen: item.image || null,
    disponible: item.available,
  };
  const path = `/menus/${idMenu}/items${item.id ? `/${item.id}` : ''}`;
  const saved = await request(path, {
    method: item.id ? 'PUT' : 'POST',
    body,
  });
  return mapMenuItem(saved);
}

export function deleteMenuItem(idMenu, idItem) {
  return request(`/menus/${idMenu}/items/${idItem}`, { method: 'DELETE' });
}

export async function getOrders(idRestaurante) {
  const orders = await request(`/restaurantes/${idRestaurante}/pedidos`);
  return orders.map(mapOrder).sort((a, b) => b.createdAt - a.createdAt);
}

export async function createOrder(idRestaurante, order) {
  const result = await request(`/restaurantes/${idRestaurante}/pedidos`, {
    method: 'POST',
    body: {
      numeroMesa: order.table,
      descripcion: order.description || '',
      items: order.items.map((item) => ({
        idItemRestaurante: item.idItemRestaurante,
        cantidad: item.quantity,
      })),
    },
  });
  return mapOrder(result);
}

export async function updateOrder(idRestaurante, order) {
  const result = await request(`/restaurantes/${idRestaurante}/pedidos/${order.id}`, {
    method: 'PUT',
    body: {
      numeroMesa: order.table,
      idGarzon: order.idGarzon,
      descripcion: order.description || '',
      estado: apiStatus(order.status),
      items: order.items.map((item) => ({
        idItemRestaurante: item.idItemRestaurante,
        cantidad: item.quantity,
      })),
    },
  });
  return mapOrder(result);
}

export async function payTableOrders(idRestaurante, table, orderIds, expectedTotal, paymentMethod) {
  const result = await request(`/restaurantes/${idRestaurante}/pedidos/mesas/${table}/pago`, {
    method: 'POST',
    body: { idPedidos: orderIds, totalConfirmado: expectedTotal, metodoPago: paymentMethod },
  });
  return {
    table: result.numeroMesa,
    total: Number(result.total),
    orders: result.pedidos.map(mapOrder),
  };
}

function mapMenuItem(item) {
  return {
    id: item.idItemRestaurante,
    menuId: item.idMenu,
    name: item.nombre,
    description: item.descripcion,
    price: Number(item.valor),
    category: item.categoria || 'Otros',
    image: item.imagen,
    available: item.disponible,
  };
}

const statusNames = {
  NUEVO: 'Nuevo pedido',
  EN_PREPARACION: 'En preparación',
  LISTO_PARA_SERVIR: 'Listo para servir',
  ENTREGADO: 'Entregado',
  PAGADO: 'Pagado',
};

const apiStatuses = Object.fromEntries(
  Object.entries(statusNames).map(([api, label]) => [label, api]),
);

function apiStatus(status) {
  const value = apiStatuses[status];
  if (!value) throw new Error(`Estado de pedido no reconocido: ${status}`);
  return value;
}

function mapOrder(order) {
  const createdAt = new Date(order.creadoEn);
  return {
    id: order.idPedido,
    displayId: `ORD-${String(order.idPedido).padStart(4, '0')}`,
    table: order.numeroMesa,
    idGarzon: order.idGarzon,
    server: order.nombreGarzon || 'Sin asignar',
    description: order.descripcion || '',
    createdAt: createdAt.getTime(),
    time: new Intl.DateTimeFormat('es-CL', { hour: '2-digit', minute: '2-digit' }).format(createdAt),
    status: statusNames[order.estado] || order.estado,
    paymentMethod: order.metodoPago || null,
    items: order.items.map((item) => ({
      idItemRestaurante: item.idItemRestaurante,
      name: item.nombre,
      quantity: item.cantidad,
      unitPrice: Number(item.valorUnitario),
    })),
    total: Number(order.total),
  };
}
