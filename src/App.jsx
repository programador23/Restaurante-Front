import React, { useEffect, useMemo, useRef, useState } from 'react';
import TicketPage from './TicketPage';
import { useTicketPrinter } from './TicketPrinter';
import PrinterButton from './PrinterButton';
import { formatKitchenTicket } from './kitchenTicket';
import { renderReceipt, resolveReceiptTemplate } from './receiptTemplate';
import {
  acceptOldestOrder,
  acceptOrder,
  advanceOrderStatus,
  clearSession,
  createOrder,
  createMenu,
  createRestaurant,
  createRestaurantUser,
  createUser,
  deleteRestaurantUser,
  deleteUser,
  deleteMenuItem,
  deleteOrder,
  editOrderItems,
  getAccessToken,
  getCashRegister,
  getCurrentUser,
  getMenu,
  getMenus,
  getOrder,
  getOrders,
  getRestaurants,
  getTicketTemplate,
  getRestaurantUsers,
  getUsers,
  login,
  openCashRegister,
  closeCashRegister,
  payTableOrders,
  registerKitchenReprint,
  saveMenuItem,
  updateRestaurantUser,
  updateUser,
} from './api';

const money = (value) => `$${new Intl.NumberFormat('es-CL').format(value)}`;

// Trazos SVG reutilizables para mantener los iconos consistentes en todo el panel.
const icons = {
  home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></>,
  menu: <><path d="M4 5h16M4 12h16M4 19h16" /><path d="M8 5v.01M8 12v.01M8 19v.01" /></>,
  orders: <><path d="M4 4h16v16H4z" /><path d="M8 9h8M8 13h8M8 17h4" /></>,
  business: <><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" /><path d="M8 9v.01M8 12v.01M8 15v.01M16 14v.01M16 17v.01" /></>,
  users: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-1a6 6 0 0 1 12 0v1M16 5.5a3 3 0 0 1 0 5.8M18 14a5 5 0 0 1 3 4.6v1" /></>,
  printer: <><path d="M6 9V3h12v6M6 17H4V9h16v8h-2M6 14h12v7H6z" /><path d="M17 11h.01" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  edit: <><path d="m15 5 4 4M4 20l4-.8L19 8a2.1 2.1 0 0 0-3-3L5 16z" /></>,
  trash: <><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
  arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  close: <><path d="m18 6-12 12M6 6l12 12" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  check: <><path d="m5 12 4 4L19 6" /></>,
  chart: <><path d="M4 19V5M4 19h17" /><path d="m7 15 4-5 3 2 5-7" /></>,
  more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
};

function Icon({ name, size = 20 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[name]}</svg>;
}

// Elementos que aparecen en la navegación lateral.
const navItems = [
  { id: 'home', label: 'Inicio', icon: 'home' },
  { id: 'menu', label: 'Menú', icon: 'menu' },
  { id: 'orders', label: 'Pedidos', icon: 'orders' },
  { id: 'business', label: 'Gestión de negocio', icon: 'business' },
  { id: 'staff', label: 'Garzones', icon: 'users' },
  { id: 'master', label: 'Restaurantes y usuarios', icon: 'users' },
  { id: 'tickets', label: 'Impresión de tickets', icon: 'printer' },
];

const roleLabels = {
  ADMINISTRADOR_MASTER: 'Administrador Master',
  ADMINISTRADOR: 'Administrador',
  RESTAURANTE: 'Restaurante',
  GARZON: 'Garzón',
};

const menuCategoryOptions = [
  'Platos principales',
  'Entradas',
  'Bebestibles',
  'Postres',
  'Acompañamientos',
  'Promociones',
];

function App() {
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [authError, setAuthError] = useState('');
  const [restaurants, setRestaurants] = useState([]);
  const [restaurantsLoading, setRestaurantsLoading] = useState(true);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState(null);
  const [menus, setMenus] = useState([]);
  const [menusLoading, setMenusLoading] = useState(false);
  const [selectedMenuId, setSelectedMenuId] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [menuItems, setMenuItems] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [orderItemsLoading, setOrderItemsLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [masterUsers, setMasterUsers] = useState([]);
  const [masterUsersLoading, setMasterUsersLoading] = useState(false);
  const [restaurantUsers, setRestaurantUsers] = useState([]);
  const [restaurantUsersLoading, setRestaurantUsersLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todos');
  const [modalItem, setModalItem] = useState(null);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [paymentConfirmationGroup, setPaymentConfirmationGroup] = useState(null);
  const [paymentLoadError, setPaymentLoadError] = useState('');
  const [receiptError, setReceiptError] = useState('');
  const [tableActionPending, setTableActionPending] = useState(false);
  const tableActionPendingRef = useRef(false);
  const [cashRegister, setCashRegister] = useState(null);
  const [cashModalOpen, setCashModalOpen] = useState(false);
  const [cashVisible, setCashVisible] = useState(() => localStorage.getItem('mesalista.cashVisible') !== 'false');
  const [toast, setToast] = useState('');
  const [pendingOrderIds, setPendingOrderIds] = useState([]);
  const [countdown, setCountdown] = useState({ restaurantId: null, durationMs: 60000, remainingMs: 60000, deadline: null, editValue: null });
  const [countdownBusy, setCountdownBusy] = useState(false);
  const [countdownError, setCountdownError] = useState('');
  const pendingOrderIdsRef = useRef(new Set());
  const { printTicket, printableTicket, usb } = useTicketPrinter();
  const ordersRefreshInProgress = useRef(false);
  const ordersPollingError = useRef(false);
  const ordersMutationVersion = useRef(0);
  const isMaster = user?.rol === 'ADMINISTRADOR_MASTER';
  const canManageStaff = user?.rol === 'ADMINISTRADOR';
  const canManageMenu = ['ADMINISTRADOR_MASTER', 'ADMINISTRADOR', 'RESTAURANTE'].includes(user?.rol);
  const canManageTickets = canManageMenu;
  const canCreateOrders = ['ADMINISTRADOR_MASTER', 'ADMINISTRADOR', 'RESTAURANTE', 'GARZON'].includes(user?.rol);
  const canViewBusiness = canManageMenu;
  const restaurantId = user?.idRestaurante ?? selectedRestaurantId;
  const restaurantIdRef = useRef(restaurantId);
  restaurantIdRef.current = restaurantId;
  const restaurant = restaurants.find((item) => item.idRestaurante === restaurantId);
  const visibleNavItems = navItems.filter((item) =>
    (item.id !== 'menu' || canManageMenu) &&
    (item.id !== 'business' || canViewBusiness) &&
    (item.id !== 'staff' || canManageStaff) &&
    (item.id !== 'tickets' || canManageTickets) &&
    (item.id !== 'master' || isMaster),
  );
  const orderTotal = orders.reduce((total, order) => total + order.total, 0);

  useEffect(() => {
    setReceiptError('');
    setCountdown({ restaurantId, durationMs: 60000, remainingMs: 60000, deadline: null, editValue: null });
    setCountdownBusy(false);
    setCountdownError('');
    setEditingOrder(null);
  }, [restaurantId]);

  useEffect(() => {
    if (!user || restaurantId == null || countdown.restaurantId !== restaurantId || countdown.deadline === null) return undefined;
    let active = true;
    const deadline = countdown.deadline;
    const timer = window.setTimeout(async () => {
      if (!active) return;
      setCountdownBusy(true);
      setCountdownError('');
      try {
        const accepted = await acceptOldestOrder(restaurantId);
        if (!active) return;
        if (accepted) {
          ordersMutationVersion.current += 1;
          setOrders((current) => current.some((order) => order.id === accepted.id)
            ? current.map((order) => order.id === accepted.id ? accepted : order)
            : [accepted, ...current]);
          const nextDeadline = Date.now() + countdown.durationMs;
          printKitchenTicket(accepted, true);
          if (!active) return;
          setCountdown((current) => ({ ...current, deadline: nextDeadline, remainingMs: current.durationMs }));
        } else {
          setCountdown((current) => ({ ...current, deadline: null, remainingMs: 0 }));
          setToast('No hay pedidos nuevos. El temporizador se detuvo.');
        }
      } catch (error) {
        if (active) {
          setCountdown((current) => ({ ...current, deadline: null, remainingMs: 0 }));
          setCountdownError(`No se pudo confirmar la aceptación automática: ${error.message}. Revisa los pedidos antes de reiniciar.`);
        }
      } finally {
        if (active) setCountdownBusy(false);
      }
    }, Math.max(0, deadline - Date.now()));
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [countdown.deadline, countdown.restaurantId, restaurantId, user]);

  useEffect(() => {
    let active = true;
    const handleExpiredSession = () => {
      clearSession();
      setUser(null);
      setAuthError('Tu sesión venció. Inicia sesión nuevamente.');
    };
    window.addEventListener('mesalista:unauthorized', handleExpiredSession);

    async function restoreSession() {
      if (!getAccessToken()) {
        setAuthChecking(false);
        return;
      }
      try {
        const currentUser = await getCurrentUser();
          if (active) {
            setRestaurantsLoading(true);
            if (currentUser.rol === 'ADMINISTRADOR_MASTER') setActiveTab('master');
            setUser(currentUser);
          }
      } catch {
        clearSession();
        if (active) setAuthError('Tu sesión venció. Inicia sesión nuevamente.');
      } finally {
        if (active) setAuthChecking(false);
      }
    }

    restoreSession();
    return () => {
      active = false;
      window.removeEventListener('mesalista:unauthorized', handleExpiredSession);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setRestaurants([]);
      setSelectedRestaurantId(null);
      setRestaurantsLoading(false);
      return undefined;
    }
    let active = true;
    setRestaurantsLoading(true);
    getRestaurants()
      .then((list) => {
        if (!active) return;
        setRestaurants(list);
        setSelectedRestaurantId((current) => {
          if (user.idRestaurante !== null && user.idRestaurante !== undefined) return user.idRestaurante;
          if (list.some((item) => item.idRestaurante === current)) return current;
          return list[0]?.idRestaurante ?? null;
        });
      })
      .catch((error) => {
        if (active) setToast(`No se pudieron cargar los restaurantes: ${error.message}`);
      })
      .finally(() => {
        if (active) setRestaurantsLoading(false);
      });
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    if (restaurantId === null || restaurantId === undefined) {
      setCashRegister(null);
      return undefined;
    }
    let active = true;
    getCashRegister(restaurantId)
      .then((cash) => { if (active) setCashRegister(cash); })
      .catch((error) => {
        if (active) setToast(`No se pudo cargar la caja: ${error.message}`);
      });
    return () => { active = false; };
  }, [restaurantId]);

  useEffect(() => {
    if (!isMaster) {
      setMasterUsers([]);
      setMasterUsersLoading(false);
      return undefined;
    }
    let active = true;
    setMasterUsersLoading(true);
    getUsers()
      .then((list) => { if (active) setMasterUsers(list); })
      .catch((error) => {
        if (active) setToast(`No se pudieron cargar los usuarios: ${error.message}`);
      })
      .finally(() => { if (active) setMasterUsersLoading(false); });
    return () => { active = false; };
  }, [isMaster]);

  useEffect(() => {
    if (!canManageStaff || restaurantId === null || restaurantId === undefined) {
      setRestaurantUsers([]);
      setRestaurantUsersLoading(false);
      return undefined;
    }
    let active = true;
    setRestaurantUsersLoading(true);
    getRestaurantUsers(restaurantId)
      .then((list) => { if (active) setRestaurantUsers(list); })
      .catch((error) => {
        if (active) setToast(`No se pudieron cargar los garzones: ${error.message}`);
      })
      .finally(() => { if (active) setRestaurantUsersLoading(false); });
    return () => { active = false; };
  }, [canManageStaff, restaurantId]);

  useEffect(() => {
    if (!user || restaurantId === null || restaurantId === undefined) {
      setMenus([]);
      setMenusLoading(false);
      setSelectedMenuId(null);
      setMenuItems([]);
      setOrderItems([]);
      setOrders([]);
      return undefined;
    }
    let active = true;
    setMenusLoading(true);
    setMenus([]);
    setMenuItems([]);
    setOrderItems([]);
    setSelectedMenuId(null);
    const menuRequest = canCreateOrders ? getMenus(restaurantId) : Promise.resolve([]);
    const version = ordersMutationVersion.current;
    Promise.all([menuRequest, getOrders(restaurantId)])
      .then(([menuList, orderList]) => {
        if (!active) return;
        setMenus(menuList);
        setSelectedMenuId(null);
        if (ordersMutationVersion.current === version) setOrders(orderList);
      })
      .catch((error) => {
        if (active) setToast(`No se pudieron cargar los datos: ${error.message}`);
      })
      .finally(() => { if (active) setMenusLoading(false); });
    return () => { active = false; };
  }, [user, restaurantId, canCreateOrders]);

  useEffect(() => {
    if (!canCreateOrders || menus.length === 0) {
      setOrderItems([]);
      setOrderItemsLoading(false);
      if (menus.length === 0) setSelectedMenuId(null);
      return undefined;
    }
    let active = true;
    setOrderItems([]);
    setOrderItemsLoading(true);
    Promise.all(menus.map((menu) => getMenu(menu.idMenu)))
      .then((itemLists) => {
        if (!active) return;
        setOrderItems(itemLists.flat());
        setSelectedMenuId((current) => {
          if (current !== null && menus.some((menu) => menu.idMenu === current)) return current;
          const firstWithProducts = itemLists.findIndex((items) => items.length > 0);
          return menus[firstWithProducts >= 0 ? firstWithProducts : 0].idMenu;
        });
      })
      .catch((error) => {
        if (active) setToast(`No se pudieron cargar los productos para el pedido: ${error.message}`);
      })
      .finally(() => { if (active) setOrderItemsLoading(false); });
    return () => { active = false; };
  }, [menus, canCreateOrders]);

  useEffect(() => {
    if (!canManageMenu || selectedMenuId === null) {
      setMenuItems([]);
      setLoading(false);
      return undefined;
    }
    let active = true;
    setLoading(true);
    getMenu(selectedMenuId)
      .then((items) => { if (active) setMenuItems(items); })
      .catch((error) => { if (active) setToast(`No se pudo cargar el menú: ${error.message}`); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [selectedMenuId, canManageMenu]);

  useEffect(() => {
    if (!visibleNavItems.some((item) => item.id === activeTab)) setActiveTab('home');
  }, [activeTab, visibleNavItems]);

  useEffect(() => {
    if (activeTab !== 'orders' || !user || restaurantId === null || restaurantId === undefined) {
      return undefined;
    }

    let active = true;
    ordersPollingError.current = false;
    const timer = window.setInterval(async () => {
      if (!active || document.visibilityState !== 'visible' || ordersRefreshInProgress.current) return;
      ordersRefreshInProgress.current = true;
      const version = ordersMutationVersion.current;
      try {
        const latestOrders = await getOrders(restaurantId);
        if (active) {
          if (ordersMutationVersion.current === version) setOrders(latestOrders);
          ordersPollingError.current = false;
        }
      } catch (error) {
        if (active && !ordersPollingError.current) {
          setToast(`No se pudieron actualizar los pedidos: ${error.message}`);
        }
        if (active) ordersPollingError.current = true;
      } finally {
        ordersRefreshInProgress.current = false;
      }
    }, 15000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [activeTab, restaurantId, user]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 2800);
    return () => clearTimeout(timer);
  }, [toast]);

  const categories = useMemo(() => [
    'Todos',
    ...new Set([
      ...menuCategoryOptions,
      ...menuItems.map((item) => item.category),
    ]),
  ], [menuItems]);
  const filteredItems = menuItems.filter((item) =>
    (category === 'Todos' || item.category === category) &&
    `${item.name} ${item.description}`.toLowerCase().includes(query.toLowerCase()),
  );
  const pageTitle = visibleNavItems.find((item) => item.id === activeTab)?.label;
  const activeTables = new Set(orders.filter((order) => order.status !== 'Pagado').map((order) => order.table)).size;
  const averageTicket = orders.length ? Math.round(orderTotal / orders.length) : 0;
  const todayShort = new Intl.DateTimeFormat('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  const todayLong = new Intl.DateTimeFormat('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

  async function handleLogin(nombreUsuario, contrasena) {
    const currentUser = await login(nombreUsuario, contrasena);
    setAuthError('');
    setRestaurantsLoading(true);
    setSelectedRestaurantId(currentUser.idRestaurante ?? null);
    if (currentUser.rol === 'ADMINISTRADOR_MASTER') setActiveTab('master');
    setUser(currentUser);
  }

  function handleLogout() {
    clearSession();
    setUser(null);
    setMenus([]);
    setMenusLoading(false);
    setMenuItems([]);
    setOrders([]);
    setOrderItems([]);
    setRestaurants([]);
    setMasterUsers([]);
    setRestaurantUsers([]);
    setToast('');
  }

  async function handleCreateRestaurant(values) {
    const saved = await createRestaurant(values);
    setRestaurants((current) => [saved, ...current]);
    setSelectedRestaurantId(saved.idRestaurante);
    setToast(`Restaurante "${saved.nombre}" creado`);
    return saved;
  }

  async function handleCreateUser(values) {
    const saved = await createUser(values);
    setMasterUsers((current) => [saved, ...current]);
    setToast(`Usuario "${saved.nombreUsuario}" creado`);
    return saved;
  }

  async function handleUpdateUser(idUsuario, values) {
    const saved = await updateUser(idUsuario, values);
    setMasterUsers((current) => current.map((entry) => String(entry.idUsuario) === String(saved.idUsuario) ? saved : entry));
    setToast(`Usuario "${saved.nombreUsuario}" actualizado`);
    return saved;
  }

  async function handleDeleteUser(idUsuario) {
    await deleteUser(idUsuario);
    setMasterUsers((current) => current.filter((entry) => String(entry.idUsuario) !== String(idUsuario)));
    setToast('Usuario eliminado');
  }

  async function handleCreateRestaurantUser(values) {
    const saved = await createRestaurantUser(restaurantId, values);
    setRestaurantUsers((current) => [saved, ...current]);
    setToast(`Garzón "${saved.nombreUsuario}" creado`);
    return saved;
  }

  async function handleUpdateRestaurantUser(idUsuario, values) {
    const saved = await updateRestaurantUser(restaurantId, idUsuario, values);
    setRestaurantUsers((current) => current.map((entry) => String(entry.idUsuario) === String(saved.idUsuario) ? saved : entry));
    setToast(`Garzón "${saved.nombreUsuario}" actualizado`);
    return saved;
  }

  async function handleDeleteRestaurantUser(idUsuario) {
    await deleteRestaurantUser(restaurantId, idUsuario);
    setRestaurantUsers((current) => current.filter((entry) => String(entry.idUsuario) !== String(idUsuario)));
    setToast('Garzón eliminado');
  }

  async function handleCreateMenu() {
    setMenusLoading(true);
    try {
      const saved = await createMenu(restaurantId, 'Menú principal');
      setMenus((current) => [...current, saved]);
      setSelectedMenuId(saved.idMenu);
      setToast('Menú principal creado. Ya puedes agregar productos.');
    } catch (error) {
      setToast(`No se pudo crear el menú: ${error.message}`);
    } finally {
      setMenusLoading(false);
    }
  }

  async function handleSave(item) {
    try {
      const saved = await saveMenuItem(item, selectedMenuId);
      setMenuItems((current) => item.id
        ? current.map((entry) => entry.id === saved.id ? saved : entry)
        : [saved, ...current]);
      setOrderItems((current) => item.id
        ? current.map((entry) => entry.id === saved.id ? saved : entry)
        : [saved, ...current]);
      setModalItem(null);
      setToast(item.id ? 'Producto actualizado correctamente' : 'Producto agregado al menú');
    } catch (error) {
      setToast(`No se pudo guardar el producto: ${error.message}`);
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`¿Eliminar "${item.name}" del menú?`)) return;
    try {
      await deleteMenuItem(selectedMenuId, item.id);
      setMenuItems((current) => current.filter((entry) => entry.id !== item.id));
      setOrderItems((current) => current.filter((entry) => entry.id !== item.id));
      setToast('Producto eliminado');
    } catch (error) {
      setToast(`No se pudo eliminar el producto: ${error.message}`);
    }
  }

  async function advanceOrder(order) {
    const next = {
      'Nuevo pedido': 'En preparación',
      'En preparación': 'Listo para servir',
      'Listo para servir': 'Entregado',
    }[order.status];
    if (!next || pendingOrderIdsRef.current.has(order.id)) return;
    pendingOrderIdsRef.current.add(order.id);
    setPendingOrderIds((current) => [...current, order.id]);
    let saved;
    try {
      saved = order.status === 'Nuevo pedido'
        ? await acceptOrder(restaurantId, order.id)
        : await advanceOrderStatus(restaurantId, order);
      ordersMutationVersion.current += 1;
      setOrders((current) => current.map((entry) => entry.id === order.id ? saved : entry));
    } catch (error) {
      setToast(`No se pudo actualizar el pedido: ${error.message}`);
      return;
    } finally {
      pendingOrderIdsRef.current.delete(order.id);
      setPendingOrderIds((current) => current.filter((id) => id !== order.id));
    }
    if (order.status === 'Nuevo pedido') {
      printKitchenTicket(saved, true);
    } else {
      setToast(`${order.displayId}: ${next.toLowerCase()}`);
    }
  }

  async function printKitchenTicket(order, accepted = false) {
    try {
      await printTicket({ title: 'TICKET DE COCINA', content: formatKitchenTicket(order) });
      if (accepted) setToast(`${order.displayId} aceptado. Verifica la impresión de cocina.`);
    } catch (error) {
      setToast(`${accepted ? 'Pedido aceptado, pero n' : 'N'}o se pudo abrir la impresión de cocina: ${error.message}. Revisa la impresora.`);
    }
  }

  async function handleKitchenReprint(order) {
    if (pendingOrderIdsRef.current.has(order.id)) return;
    const id = restaurantId;
    pendingOrderIdsRef.current.add(order.id);
    setPendingOrderIds((current) => [...current, order.id]);
    let printed = false;
    try {
      const current = await getOrder(id, order.id);
      if (restaurantIdRef.current !== id) return;
      if (!current.kitchenReprintNeeded || !['En preparación', 'Listo para servir'].includes(current.status)) {
        ordersMutationVersion.current += 1;
        setOrders((orders) => orders.map((entry) => entry.id === current.id ? current : entry));
        setToast('El pedido o su impresión cambió. Revisa su estado actualizado.');
        return;
      }
      await printTicket({ title: 'TICKET DE COCINA', content: formatKitchenTicket(current) });
      printed = true;
      const saved = await registerKitchenReprint(id, current);
      if (restaurantIdRef.current === id) {
        ordersMutationVersion.current += 1;
        setOrders((orders) => orders.map((entry) => entry.id === saved.id ? saved : entry));
        setToast('Ticket enviado. Verifica la impresión de cocina.');
      }
    } catch (error) {
      if (restaurantIdRef.current === id) {
        setToast(printed
          ? `Se envió el ticket, pero no se pudo actualizar su estado: ${error.message}. Revisa antes de reintentar.`
          : `No se pudo reimprimir el ticket de cocina: ${error.message}.`);
      }
    } finally {
      pendingOrderIdsRef.current.delete(order.id);
      setPendingOrderIds((current) => current.filter((entry) => entry !== order.id));
    }
  }

  async function handleEditOrder(order, items) {
    const saved = await editOrderItems(restaurantId, order, items);
    if (restaurantIdRef.current === restaurantId) {
      ordersMutationVersion.current += 1;
      setOrders((current) => current.map((entry) => entry.id === saved.id ? saved : entry));
      setEditingOrder(null);
      setToast(saved.kitchenReprintNeeded
        ? `${saved.displayId} actualizado. Puedes reimprimir el ticket de cocina.`
        : `${saved.displayId}: no hubo cambios en los productos.`);
    }
  }

  async function handleDeleteOrder(order) {
    if (pendingOrderIdsRef.current.has(order.id)) return false;
    if (!window.confirm(`¿Eliminar ${order.displayId} de la mesa ${order.table}? Esta acción no se puede deshacer. Avisa a cocina de la eliminación.`)) return false;
    const id = restaurantId;
    pendingOrderIdsRef.current.add(order.id);
    setPendingOrderIds((current) => [...current, order.id]);
    try {
      await deleteOrder(id, order.id);
      if (restaurantIdRef.current === id) {
        ordersMutationVersion.current += 1;
        setOrders((current) => current.filter((entry) => entry.id !== order.id));
        setEditingOrder(null);
        setToast(`${order.displayId} eliminado.`);
      }
      return true;
    } finally {
      pendingOrderIdsRef.current.delete(order.id);
      setPendingOrderIds((current) => current.filter((entry) => entry !== order.id));
    }
  }

  async function loadCurrentPaymentGroup(group, id) {
    const version = ordersMutationVersion.current;
    const latestOrders = await getOrders(id);
    if (restaurantIdRef.current !== id) return null;
    if (ordersMutationVersion.current !== version) throw new Error('Los pedidos cambiaron durante la consulta; vuelve a intentarlo.');
    setOrders(latestOrders);
    const pendingOrders = latestOrders.filter((order) => order.table === group.table && order.status === 'Entregado');
    if (pendingOrders.length === 0) {
      setToast(`La mesa ${group.table} ya no tiene pedidos entregados pendientes de pago.`);
      return null;
    }
    return {
      table: group.table,
      orders: pendingOrders,
      total: pendingOrders.reduce((sum, order) => sum + order.total, 0),
    };
  }

  async function requestTablePayment(group) {
    if (tableActionPendingRef.current) return;
    tableActionPendingRef.current = true;
    setTableActionPending(true);
    setPaymentLoadError('');
    const id = restaurantId;
    try {
      const currentGroup = await loadCurrentPaymentGroup(group, id);
      if (currentGroup) setPaymentConfirmationGroup(currentGroup);
    } catch (error) {
      if (restaurantIdRef.current !== id) return;
      setPaymentConfirmationGroup(group);
      setPaymentLoadError(`No se pudieron actualizar los pedidos: ${error.message}. El servidor validará el total al confirmar.`);
    } finally {
      tableActionPendingRef.current = false;
      setTableActionPending(false);
    }
  }

  async function printTableReceipt(group) {
    if (tableActionPendingRef.current) return;
    tableActionPendingRef.current = true;
    setTableActionPending(true);
    setReceiptError('');
    const id = restaurantId;
    try {
      const [currentGroup, rawTemplate] = await Promise.all([
        loadCurrentPaymentGroup(group, id),
        getTicketTemplate(id),
      ]);
      if (!currentGroup || restaurantIdRef.current !== id) return;
      await printTicket(renderReceipt(resolveReceiptTemplate(rawTemplate), currentGroup, restaurant.nombre));
    } catch (error) {
      if (restaurantIdRef.current === id) {
        setReceiptError(`No se pudo imprimir la cuenta de la mesa ${group.table}: ${error.message}. Vuelve a intentarlo.`);
      }
    } finally {
      tableActionPendingRef.current = false;
      setTableActionPending(false);
    }
  }

  async function confirmTablePayment(group) {
    const result = await payTableOrders(restaurantId, group.table, group.orders.map((order) => order.id), group.total, group.paymentMethod);
    const paidOrders = new Map(result.orders.map((order) => [order.id, order]));
    ordersMutationVersion.current += 1;
    setOrders((current) => current.map((order) => paidOrders.get(order.id) || order));
    setPaymentConfirmationGroup(null);
    if (group.paymentMethod === 'EFECTIVO') {
      try {
        setCashRegister(await getCashRegister(restaurantId));
      } catch {
        // La caja puede estar cerrada o aún no haber sido abierta.
      }
    }
    setToast(`Mesa ${result.table}: ${result.orders.length} pedidos pagados · ${money(result.total)}`);
  }

  async function handleOpenCash(initialAmount) {
    const opened = await openCashRegister(restaurantId, initialAmount);
    setCashRegister(opened);
    setCashModalOpen(false);
    setToast(`Caja abierta con ${money(opened.montoInicial)}.`);
  }

  async function handleCloseCash() {
    if (!window.confirm('¿Confirmar el cierre de caja?')) return;
    try {
      const closed = await closeCashRegister(restaurantId);
      setCashRegister(closed);
      setToast(`Caja cerrada. Total: ${money(closed.totalCaja)}.`);
    } catch (error) {
      setToast(`No se pudo cerrar la caja: ${error.message}`);
    }
  }

  function toggleCashVisibility() {
    setCashVisible((current) => {
      const next = !current;
      localStorage.setItem('mesalista.cashVisible', String(next));
      return next;
    });
  }

  async function handleCreateOrder(order) {
    const saved = await createOrder(restaurantId, order);
    ordersMutationVersion.current += 1;
    setOrders((current) => [saved, ...current]);
    setOrderModalOpen(false);
    setToast(`${saved.displayId} creado para la mesa ${saved.table}`);
  }

  async function refreshOrders() {
    if (ordersRefreshInProgress.current) return;
    ordersRefreshInProgress.current = true;
    const version = ordersMutationVersion.current;
    const id = restaurantId;
    try {
      const latestOrders = await getOrders(id);
      if (restaurantIdRef.current !== id) return;
      if (ordersMutationVersion.current !== version) {
        setToast('Los pedidos cambiaron durante la actualización. Vuelve a intentarlo.');
        return;
      }
      setOrders(latestOrders);
      ordersPollingError.current = false;
      setToast('Pedidos actualizados');
    } catch (error) {
      ordersPollingError.current = true;
      setToast(`No se pudieron actualizar los pedidos: ${error.message}`);
    } finally {
      ordersRefreshInProgress.current = false;
    }
  }

  if (authChecking) return <div className="auth-loading">Conectando con MesaLista…</div>;
  if (!user) return <LoginPage onLogin={handleLogin} initialError={authError} />;

  if (!restaurant && !isMaster) {
    if (restaurantsLoading) return <div className="auth-loading">Cargando tu restaurante…</div>;
    return (
      <div className="empty-restaurant">
        <span className="brand-mark"><span /><span /><span /></span>
        <h1>No hay un restaurante disponible</h1>
        <p>Tu usuario aún no tiene un restaurante asignado.</p>
        <button className="outline-button" onClick={handleLogout}>Cerrar sesión</button>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setActiveTab('home'); }}>
          <span className="brand-mark"><span /><span /><span /></span>
          <span className="brand-name">mesa<span>lista</span></span>
        </a>
        <div className="restaurant-switch">
          <div className="restaurant-avatar">{restaurant?.nombre.charAt(0).toUpperCase() || 'M'}</div>
          {isMaster && restaurants.length > 1 ? (
            <label className="restaurant-info">
              <span>RESTAURANTE ACTIVO</span>
              <select value={selectedRestaurantId ?? ''} onChange={(event) => setSelectedRestaurantId(Number(event.target.value))}>
                {restaurants.map((item) => <option key={item.idRestaurante} value={item.idRestaurante}>{item.nombre}</option>)}
              </select>
            </label>
          ) : (
            <div className="restaurant-info">
              <strong>{restaurant?.nombre || 'Administración global'}</strong>
              <span>{restaurant?.categoria || 'Administrador Master'}</span>
            </div>
          )}
        </div>
        <div className="nav-caption">MENÚ PRINCIPAL</div>
        <nav className="main-nav" aria-label="Navegación principal">
          {visibleNavItems.map((item) => (
            <button key={item.id} className={`nav-link ${activeTab === item.id ? 'active' : ''}`} onClick={() => setActiveTab(item.id)} aria-label={item.label}>
            <Icon name={item.icon} size={19} /><span>{item.label}</span>{item.id === 'orders' && <span className="nav-badge">{orders.filter((order) => order.status !== 'Pagado').length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="support-card"><span className="support-icon">✳</span><strong>¿Necesitas ayuda?</strong><span>Estamos aquí para ti.</span><button onClick={() => setToast('Escríbenos a ayuda@mesalista.cl')}>Contactar soporte <Icon name="arrow" size={14} /></button></div>
          <button className="profile-button" onClick={handleLogout} title="Cerrar sesión"><span className="profile-avatar">{`${user.nombre[0]}${user.apellido[0]}`.toUpperCase()}</span><span className="profile-copy"><strong>{user.nombre} {user.apellido}</strong><small>{roleLabels[user.rol] || user.rol}</small></span><span className="logout-label">Salir</span></button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">{restaurant?.nombre || 'Administración'} <span>/</span> <strong>{pageTitle}</strong></div>
          <div className="topbar-actions"><PrinterButton usb={usb} onMessage={setToast} /><span className="today-label"><span className="live-dot" /> Servicio activo</span><button className="icon-button notification-button" aria-label="Notificaciones" onClick={() => setToast('No tienes notificaciones nuevas')}><Icon name="bell" size={19} /><i /></button><span className="today-date">{todayShort}</span></div>
        </header>

        <div className="page-content">
          {activeTab === 'home' && <HomePage setActiveTab={setActiveTab} orders={orders} menuItems={menuItems} user={user} totalSales={orderTotal} averageTicket={averageTicket} activeTables={activeTables} todayLong={todayLong} canManageMenu={canManageMenu} cashRegister={cashRegister} cashVisible={cashVisible} onToggleCashVisibility={toggleCashVisibility} onOpenCash={() => setCashModalOpen(true)} onCloseCash={handleCloseCash} />}
          {activeTab === 'menu' && <MenuPage items={filteredItems} loading={loading} menusLoading={menusLoading} orderItemsLoading={orderItemsLoading} categories={categories} category={category} setCategory={setCategory} query={query} setQuery={setQuery} menus={menus} selectedMenuId={selectedMenuId} setSelectedMenuId={setSelectedMenuId} onCreateMenu={handleCreateMenu} onAdd={() => setModalItem({})} onEdit={setModalItem} onDelete={handleDelete} />}
          {activeTab === 'orders' && <OrdersPage orders={orders} onAdvance={advanceOrder} onPrintKitchen={handleKitchenReprint} onEdit={setEditingOrder} pendingOrderIds={pendingOrderIds} onRefresh={refreshOrders} onCreate={() => setOrderModalOpen(true)} onRequestPayment={requestTablePayment} onPrintReceipt={printTableReceipt} tableActionPending={tableActionPending} receiptError={receiptError} products={orderItems} productsLoading={orderItemsLoading} countdown={countdown} setCountdown={setCountdown} countdownBusy={countdownBusy} countdownError={countdownError} />}
          {activeTab === 'business' && <BusinessPage orders={orders} totalSales={orderTotal} />}
          {activeTab === 'staff' && canManageStaff && <RestaurantStaffPage restaurant={restaurant} users={restaurantUsers} usersLoading={restaurantUsersLoading} currentUserId={user.idUsuario} onCreate={handleCreateRestaurantUser} onUpdate={handleUpdateRestaurantUser} onDelete={handleDeleteRestaurantUser} />}
          {activeTab === 'master' && isMaster && <MasterAdminPage restaurants={restaurants} users={masterUsers} usersLoading={masterUsersLoading} currentUserId={user.idUsuario} onCreateRestaurant={handleCreateRestaurant} onCreateUser={handleCreateUser} onUpdateUser={handleUpdateUser} onDeleteUser={handleDeleteUser} />}
          {activeTab === 'tickets' && canManageTickets && <TicketPage key={restaurantId ?? 'none'} restaurantId={restaurantId} printTicket={printTicket} usb={usb} />}
        </div>
      </main>
      {modalItem !== null && <MenuModal item={modalItem} onClose={() => setModalItem(null)} onSave={handleSave} />}
      {orderModalOpen && <OrderModal products={orderItems.filter((item) => item.available)} onClose={() => setOrderModalOpen(false)} onSave={handleCreateOrder} />}
      {editingOrder && <EditOrderModal order={editingOrder} products={orderItems} onClose={() => setEditingOrder(null)} onSave={handleEditOrder} onDelete={handleDeleteOrder} />}
      {paymentConfirmationGroup && <PaymentConfirmationModal group={paymentConfirmationGroup} loadError={paymentLoadError} onClose={() => setPaymentConfirmationGroup(null)} onConfirm={confirmTablePayment} />}
      {cashModalOpen && <CashOpenModal onClose={() => setCashModalOpen(false)} onOpen={handleOpenCash} />}
      {toast && <div className="toast"><span className="toast-check"><Icon name="check" size={15} /></span>{toast}</div>}
      {printableTicket}
    </div>
  );
}

function MasterAdminPage({
  restaurants,
  users,
  usersLoading,
  currentUserId,
  onCreateRestaurant,
  onCreateUser,
  onUpdateUser,
  onDeleteUser,
}) {
  return <>
    <PageHeading eyebrow="ADMINISTRACIÓN GLOBAL" title="Restaurantes y usuarios" description="Crea restaurantes y administra los accesos de sus equipos." />
    <div className="master-admin-grid">
      <RestaurantManagement restaurants={restaurants} onCreate={onCreateRestaurant} />
      <UserManagement
        restaurants={restaurants}
        users={users}
        usersLoading={usersLoading}
        currentUserId={currentUserId}
        onCreate={onCreateUser}
        onUpdate={onUpdateUser}
        onDelete={onDeleteUser}
      />
    </div>
  </>;
}

function RestaurantStaffPage({ restaurant, users, usersLoading, currentUserId, onCreate, onUpdate, onDelete }) {
  const garzones = users.filter((user) => user.rol === 'GARZON');
  return <>
    <PageHeading eyebrow="EQUIPO DEL RESTAURANTE" title="Garzones" description="Crea y administra las cuentas de los garzones de tu restaurante." />
    <UserManagement
      scope="restaurant"
      restaurantId={restaurant.idRestaurante}
      restaurants={[restaurant]}
      users={garzones}
      usersLoading={usersLoading}
      currentUserId={currentUserId}
      onCreate={onCreate}
      onUpdate={onUpdate}
      onDelete={onDelete}
    />
  </>;
}

function RestaurantManagement({ restaurants, onCreate }) {
  const [form, setForm] = useState({ nombre: '', categoria: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onCreate(form);
      setForm({ nombre: '', categoria: '' });
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  return <section className="panel master-panel">
    <div className="panel-header"><div><h2>Crear restaurante</h2><p>Registra un nuevo negocio en MesaLista.</p></div></div>
    <form className="master-form" onSubmit={submit}>
      <label className="form-field">Nombre del restaurante<input required maxLength="120" value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} /></label>
      <label className="form-field">Categoría<input required maxLength="80" placeholder="Ej. Cocina chilena" value={form.categoria} onChange={(event) => setForm({ ...form, categoria: event.target.value })} /></label>
      {error && <div className="form-error" role="alert">{error}</div>}
      <button className="primary-button" type="submit" disabled={saving}><Icon name="plus" size={17} />{saving ? 'Creando…' : 'Crear restaurante'}</button>
    </form>
    <div className="master-list-heading"><strong>Restaurantes registrados</strong><span>{restaurants.length}</span></div>
    {restaurants.length === 0 ? <p className="master-empty">Aún no hay restaurantes registrados.</p> : <ul className="master-list">{restaurants.map((restaurant) => <li key={restaurant.idRestaurante}><span className="master-list-avatar">{restaurant.nombre.charAt(0).toUpperCase()}</span><span className="master-list-copy"><strong>{restaurant.nombre}</strong><small>{restaurant.categoria}</small></span><span className="master-list-id">#{restaurant.idRestaurante}</span></li>)}</ul>}
  </section>;
}

function UserManagement({ scope = 'master', restaurantId, restaurants, users, usersLoading, currentUserId, onCreate, onUpdate, onDelete }) {
  const initialRole = scope === 'restaurant' ? 'GARZON' : 'ADMINISTRADOR';
  const rolesToCreate = scope === 'restaurant' ? ['GARZON'] : ['ADMINISTRADOR', 'RESTAURANTE', 'GARZON', 'ADMINISTRADOR_MASTER'];
  const userNoun = scope === 'restaurant' ? 'garzón' : 'usuario';
  const [form, setForm] = useState({ idRestaurante: '', nombre: '', apellido: '', nombreUsuario: '', contrasena: '', rol: initialRole });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const isMasterRole = scope === 'master' && form.rol === 'ADMINISTRADOR_MASTER';

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onCreate({
        ...form,
        idRestaurante: scope === 'restaurant'
          ? restaurantId
          : isMasterRole ? null : Number(form.idRestaurante || restaurants[0]?.idRestaurante),
      });
      setForm({ idRestaurante: '', nombre: '', apellido: '', nombreUsuario: '', contrasena: '', rol: initialRole });
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  return <>
    <section className="panel master-panel">
    <div className="panel-header"><div><h2>{scope === 'restaurant' ? 'Crear garzón' : 'Crear usuario'}</h2><p>{scope === 'restaurant' ? 'Registra un garzón para el equipo de este restaurante.' : 'Define el rol y el restaurante al que tendrá acceso.'}</p></div></div>
    <form className="master-form" onSubmit={submit}>
      <div className="master-form-row">
        <label className="form-field">Nombre<input required maxLength="80" value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} /></label>
        <label className="form-field">Apellido<input required maxLength="80" value={form.apellido} onChange={(event) => setForm({ ...form, apellido: event.target.value })} /></label>
      </div>
      <label className="form-field">Nombre de usuario<input required maxLength="80" autoComplete="off" value={form.nombreUsuario} onChange={(event) => setForm({ ...form, nombreUsuario: event.target.value })} /></label>
      <label className="form-field">Contraseña<input required type="password" minLength="8" maxLength="72" autoComplete="new-password" value={form.contrasena} onChange={(event) => setForm({ ...form, contrasena: event.target.value })} /></label>
      {scope === 'restaurant'
        ? <label className="form-field">Rol<input value={roleLabels.GARZON} readOnly /></label>
        : <label className="form-field">Rol<select value={form.rol} onChange={(event) => setForm({ ...form, rol: event.target.value })}>{rolesToCreate.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</select></label>}
      {scope === 'master' && !isMasterRole && <label className="form-field">Restaurante<select required value={form.idRestaurante || restaurants[0]?.idRestaurante || ''} onChange={(event) => setForm({ ...form, idRestaurante: event.target.value })}><option value="" disabled>Selecciona un restaurante</option>{restaurants.map((restaurant) => <option key={restaurant.idRestaurante} value={restaurant.idRestaurante}>{restaurant.nombre}</option>)}</select></label>}
      {error && <div className="form-error" role="alert">{error}</div>}
      <button className="primary-button" type="submit" disabled={saving || (scope === 'master' && !isMasterRole && restaurants.length === 0)}><Icon name="plus" size={17} />{saving ? 'Creando…' : scope === 'restaurant' ? 'Crear garzón' : 'Crear usuario'}</button>
    </form>
    <div className="master-list-heading"><strong>{scope === 'restaurant' ? 'Garzones del restaurante' : 'Usuarios registrados'}</strong><span>{usersLoading ? '…' : users.length}</span></div>
    {usersLoading ? <p className="master-empty">Cargando {scope === 'restaurant' ? 'garzones' : 'usuarios'}…</p> : users.length === 0 ? <p className="master-empty">{scope === 'restaurant' ? 'Aún no hay garzones registrados.' : 'Aún no hay usuarios registrados.'}</p> : <ul className="master-list">{users.map((user) => {
      const restaurant = restaurants.find((item) => String(item.idRestaurante) === String(user.idRestaurante));
      const isCurrentUser = String(user.idUsuario) === String(currentUserId);
      return <li key={user.idUsuario}>
        <span className="master-list-avatar">{`${user.nombre.charAt(0)}${user.apellido.charAt(0)}`.toUpperCase()}</span>
        <span className="master-list-copy"><strong>{user.nombre} {user.apellido}</strong><small>{user.nombreUsuario} · {restaurant?.nombre || 'Acceso global'}</small></span>
        <span className="master-role">{roleLabels[user.rol] || user.rol}</span>
        <span className="master-list-actions">
          <button type="button" className="master-user-action" aria-label={`Modificar ${userNoun} ${user.nombreUsuario}`} title={`Modificar ${userNoun}`} onClick={() => setEditingUser(user)}><Icon name="edit" size={15} /></button>
          <button type="button" className="master-user-action danger" aria-label={`Eliminar ${userNoun} ${user.nombreUsuario}`} title={isCurrentUser ? 'No puedes eliminar tu propio usuario' : `Eliminar ${userNoun}`} disabled={isCurrentUser} onClick={() => setDeletingUser(user)}><Icon name="trash" size={15} /></button>
        </span>
      </li>;
    })}</ul>}
    </section>
  {editingUser && <UserEditModal
    key={editingUser.idUsuario}
    scope={scope}
    user={editingUser}
    restaurants={restaurants}
    onClose={() => setEditingUser(null)}
    onSave={(values) => onUpdate(editingUser.idUsuario, values)}
  />}
  {deletingUser && <UserDeleteModal
    scope={scope}
    user={deletingUser}
    onClose={() => setDeletingUser(null)}
    onConfirm={() => onDelete(deletingUser.idUsuario)}
  />}
  </>;
}

function UserEditModal({ scope = 'master', user, restaurants, onClose, onSave }) {
  const [form, setForm] = useState({
    nombre: user.nombre,
    apellido: user.apellido,
    contrasena: '',
    rol: user.rol,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const allowedRoles = scope === 'restaurant'
    ? ['GARZON']
    : user.idRestaurante == null ? ['ADMINISTRADOR_MASTER'] : ['ADMINISTRADOR', 'RESTAURANTE', 'GARZON'];
  const restaurantName = restaurants.find((item) => String(item.idRestaurante) === String(user.idRestaurante))?.nombre || 'Acceso global';

  async function submit(event) {
    event.preventDefault();
    setError('');
    const nombre = form.nombre.trim();
    const apellido = form.apellido.trim();
    if (!nombre || !apellido) {
      setError('El nombre y el apellido son obligatorios.');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        nombre,
        apellido,
        rol: form.rol,
        contrasena: form.contrasena,
      });
      onClose();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  return <div className="modal-backdrop" onMouseDown={(event) => { if (!saving && event.target === event.currentTarget) onClose(); }}>
    <section className="modal" role="dialog" aria-modal="true" aria-labelledby="edit-user-title">
      <div className="modal-header"><div><div className="eyebrow">{scope === 'restaurant' ? 'EQUIPO DEL RESTAURANTE' : 'ADMINISTRACIÓN GLOBAL'}</div><h2 id="edit-user-title">Modificar {scope === 'restaurant' ? 'garzón' : 'usuario'}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar" disabled={saving}><Icon name="close" size={19} /></button></div>
      <form onSubmit={submit}>
        <div className="master-form-row">
          <label className="form-field">Nombre<input required maxLength="80" value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} /></label>
          <label className="form-field">Apellido<input required maxLength="80" value={form.apellido} onChange={(event) => setForm({ ...form, apellido: event.target.value })} /></label>
        </div>
        <label className="form-field">Nombre de usuario<input value={user.nombreUsuario} readOnly /></label>
        <label className="form-field">Restaurante<input value={restaurantName} readOnly /></label>
        {scope === 'restaurant'
          ? <label className="form-field">Rol<input value={roleLabels[user.rol]} readOnly /></label>
          : <label className="form-field">Rol<select value={form.rol} onChange={(event) => setForm({ ...form, rol: event.target.value })}>{allowedRoles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</select></label>}
        <label className="form-field">Nueva contraseña <span className="optional-label">Opcional; deja vacío para conservarla</span><input type="password" minLength="8" maxLength="72" autoComplete="new-password" value={form.contrasena} onChange={(event) => setForm({ ...form, contrasena: event.target.value })} /></label>
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="modal-actions"><button type="button" className="outline-button" onClick={onClose} disabled={saving}>Cancelar</button><button type="submit" className="primary-button" disabled={saving}><Icon name="check" size={17} />{saving ? 'Guardando…' : 'Guardar cambios'}</button></div>
      </form>
    </section>
  </div>;
}

function UserDeleteModal({ scope = 'master', user, onClose, onConfirm }) {
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const userNoun = scope === 'restaurant' ? 'garzón' : 'usuario';

  async function confirm() {
    setError('');
    setDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setDeleting(false);
    }
  }

  return <div className="modal-backdrop" onMouseDown={(event) => { if (!deleting && event.target === event.currentTarget) onClose(); }}>
    <section className="modal" role="dialog" aria-modal="true" aria-labelledby="delete-user-title">
      <div className="modal-header"><div><div className="eyebrow">{scope === 'restaurant' ? 'EQUIPO DEL RESTAURANTE' : 'ADMINISTRACIÓN GLOBAL'}</div><h2 id="delete-user-title">Eliminar {userNoun}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar" disabled={deleting}><Icon name="close" size={19} /></button></div>
      <p className="user-delete-copy">¿Eliminar a <strong>{user.nombre} {user.apellido}</strong> ({user.nombreUsuario})? Ya no podrá iniciar sesión.{user.rol === 'GARZON' && ' Los pedidos históricos se conservarán, pero quedarán sin garzón asignado.'}</p>
      {error && <div className="form-error" role="alert">{error}</div>}
      <div className="modal-actions"><button type="button" className="outline-button" onClick={onClose} disabled={deleting}>Cancelar</button><button type="button" className="danger-button" onClick={confirm} disabled={deleting}><Icon name="trash" size={16} />{deleting ? 'Eliminando…' : `Eliminar ${userNoun}`}</button></div>
    </section>
  </div>;
}

// Encabezado compartido por las pantallas, con acciones opcionales a la derecha.
function PageHeading({ eyebrow, title, description, children }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{children && <div className="heading-actions">{children}</div>}</div>;
}

// Inicio: resumen de actividad, ventas recientes y accesos rápidos.
function HomePage({ setActiveTab, orders, menuItems, user, totalSales, averageTicket, activeTables, todayLong, canManageMenu, cashRegister, cashVisible, onToggleCashVisibility, onOpenCash, onCloseCash }) {
  const completedOrders = orders.filter((order) => order.status === 'Entregado').length;
  const paidOrders = orders.filter((order) => order.status === 'Pagado').length;
  const preparingOrders = orders.filter((order) => order.status === 'En preparación').length;
  const readyOrders = orders.filter((order) => order.status === 'Listo para servir').length;
  return <>
    <PageHeading eyebrow={todayLong.toLocaleUpperCase('es-CL')} title={`¡Hola, ${user.nombre}! 👋`} description="Aquí tienes el resumen de la actividad de tu restaurante." />
    <section className="stats-grid">
      <StatCard label="Ventas registradas" value={money(totalSales)} change="" icon="chart" tone="green" foot="suma de pedidos cargados" />
      <StatCard label="Pedidos recibidos" value={orders.length} change="" icon="orders" tone="purple" foot={`${completedOrders} por pagar · ${paidOrders} pagados`} />
      <StatCard label="Ticket promedio" value={money(averageTicket)} change="" icon="chart" tone="orange" foot="por pedido registrado" />
      <StatCard label="Mesas activas" value={activeTables} change="" icon="business" tone="blue" foot="con pedidos pendientes" />
    </section>
    <br></br>
    <section className={`cash-register-card panel ${cashRegister?.estado === 'ABIERTA' ? 'open' : ''}`}>
      
      <div>
        <span className="cash-register-label">Caja actual</span>
        <strong>{cashRegister?.estado === 'ABIERTA'
          ? (cashVisible ? money(cashRegister.totalCaja) : '••••••')
          : 'Caja cerrada'}</strong>
        {cashRegister?.estado === 'ABIERTA' && <small>Monto inicial {cashVisible ? money(cashRegister.montoInicial) : '••••••'} · Efectivo recibido {cashVisible ? money(cashRegister.efectivoCobrado) : '••••••'}</small>}
      </div>
      {cashRegister?.estado === 'ABIERTA' && <button className="cash-hide-button" type="button" onClick={onToggleCashVisibility}>{cashVisible ? 'Ocultar' : 'Mostrar'}</button>}
      {cashRegister?.estado === 'ABIERTA'
        ? <button className="outline-button" type="button" onClick={onCloseCash}>Cerrar caja</button>
        : <button className="primary-button" type="button" onClick={onOpenCash}>Abrir caja</button>}
    </section>
    <div className="home-grid">
      <section className="panel sales-panel">
        <div className="panel-header"><div><h2>Resumen de pedidos</h2><p>Estado actual del servicio</p></div></div>
        <div className="sales-total">{money(totalSales)}</div><div className="sales-subtitle">Suma de los pedidos registrados en este restaurante</div>
        <div className="order-status-summary">
          <div><span className="status-dot new" /><span>Nuevos</span><strong>{orders.filter((order) => order.status === 'Nuevo pedido').length}</strong></div>
          <div><span className="status-dot preparing" /><span>En preparación</span><strong>{preparingOrders}</strong></div>
          <div><span className="status-dot ready" /><span>Listos para servir</span><strong>{readyOrders}</strong></div>
          <div><span className="status-dot delivered" /><span>Entregados</span><strong>{completedOrders}</strong></div>
          <div><span className="status-dot paid" /><span>Pagados</span><strong>{paidOrders}</strong></div>
        </div>
      </section>
      <section className="panel orders-summary">
        <div className="panel-header"><div><h2>Pedidos recientes</h2><p>Lo que está pasando ahora</p></div><button className="text-link" onClick={() => setActiveTab('orders')}>Ver todos <Icon name="arrow" size={15} /></button></div>
        <div className="mini-orders">{orders.slice(0, 3).map((order) => <div className="mini-order" key={order.id}><div className="order-table-number">{order.table}</div><div className="mini-order-copy"><strong>Mesa {order.table} <span>· {order.time}</span></strong><small>{order.items.map((item) => `${item.quantity}× ${item.name}`).join(', ')}</small></div><span className={`status-dot ${statusClass(order.status)}`} /></div>)}</div>
        <button className="outline-button full-button" onClick={() => setActiveTab('orders')}>Ir a pedidos <Icon name="arrow" size={15} /></button>
      </section>
    </div>
    {canManageMenu && <div className="home-bottom">
      <section className="panel top-products"><div className="panel-header"><div><h2>Productos del menú</h2><p>Productos cargados para este restaurante</p></div><button className="text-link" onClick={() => setActiveTab('menu')}>Ver menú <Icon name="arrow" size={15} /></button></div><div className="product-rank-list">{menuItems.slice(0, 3).map((item, index) => <div className="product-rank" key={item.id}><span className="rank-number">0{index + 1}</span><img src={item.image || 'https://images.unsplash.com/photo-1546549032-9571cd6b27df?auto=format&fit=crop&w=800&q=85'} alt="" /><span className="rank-name">{item.name}</span><span className="rank-sold">{item.category}</span><strong>{money(item.price)}</strong></div>)}</div></section>
      <section className="tip-card"><div className="tip-sparkle">✳</div><div className="eyebrow">MESA LISTA</div><h3>Tu menú, siempre<br />al día.</h3><p>Administra disponibilidad, descripciones y precios directamente desde el catálogo.</p><button onClick={() => setActiveTab('menu')}>Administrar menú <Icon name="arrow" size={15} /></button></section>
    </div>}
  </>;
}

// Tarjeta reutilizable para presentar una métrica y su variación.
function StatCard({ label, value, change, icon, tone, foot }) {
  return <div className="stat-card"><div className="stat-top"><span>{label}</span><span className={`stat-icon ${tone}`}><Icon name={icon} size={18} /></span></div><div className="stat-value">{value}</div><div className="stat-foot">{change && <span className="stat-change">{change}</span>}<span>{foot}</span></div></div>;
}

// Catálogo con búsqueda, filtros por categoría y acciones CRUD de cada producto.
function MenuPage({ items, loading, menusLoading, orderItemsLoading, categories, category, setCategory, query, setQuery, menus, selectedMenuId, setSelectedMenuId, onCreateMenu, onAdd, onEdit, onDelete }) {
  const menuNameCounts = new Map();
  menus.forEach((menu) => menuNameCounts.set(menu.nombre, (menuNameCounts.get(menu.nombre) || 0) + 1));
  return <>
    <PageHeading eyebrow="TU PROPUESTA GASTRONÓMICA" title="Menú" description="Administra los productos que ofreces a tus clientes.">
      {menus.length > 1 && <select className="select-control" aria-label="Seleccionar menú" value={selectedMenuId ?? ''} onChange={(event) => setSelectedMenuId(Number(event.target.value))}>{menus.map((menu) => <option key={menu.idMenu} value={menu.idMenu}>{menu.nombre}{menuNameCounts.get(menu.nombre) > 1 ? ` (#${menu.idMenu})` : ''}</option>)}</select>}
      {menus.length === 0
        ? <button className="primary-button" onClick={onCreateMenu} disabled={menusLoading}><Icon name="plus" size={18} /> Crear menú principal</button>
        : <button className="primary-button" onClick={onAdd} disabled={menusLoading || orderItemsLoading || loading || !selectedMenuId}><Icon name="plus" size={18} /> Agregar producto</button>}
    </PageHeading>
    <section className="panel menu-panel">
      <div className="menu-toolbar"><div className="category-tabs">{categories.map((item) => <button key={item} className={`category-tab ${category === item ? 'selected' : ''}`} onClick={() => setCategory(item)}>{item}</button>)}</div><label className="search-box"><Icon name="search" size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar producto..." /></label></div>
      {menusLoading || orderItemsLoading || loading ? <div className="empty-state">Cargando menú...</div> : menus.length === 0 ? <div className="empty-state"><span>☝</span><strong>Este restaurante aún no tiene un menú</strong><p>Crea el menú principal para empezar a agregar productos.</p></div> : items.length === 0 ? <div className="empty-state"><span>☝</span><strong>No encontramos productos</strong><p>Prueba otra búsqueda o agrega un producto a tu menú.</p></div> : <div className="menu-grid">{items.map((item) => <article className={`menu-card ${!item.available ? 'unavailable' : ''}`} key={item.id}><div className="menu-card-image"><img src={item.image || 'https://images.unsplash.com/photo-1546549032-9571cd6b27df?auto=format&fit=crop&w=800&q=85'} alt={item.name} /><span className={`availability ${item.available ? '' : 'off'}`}><i />{item.available ? 'Disponible' : 'No disponible'}</span><div className="card-actions"><button title="Editar producto" aria-label={`Editar ${item.name}`} onClick={() => onEdit(item)}><Icon name="edit" size={16} /></button><button title="Eliminar producto" aria-label={`Eliminar ${item.name}`} onClick={() => onDelete(item)}><Icon name="trash" size={16} /></button></div></div><div className="menu-card-body"><span className="product-category">{item.category}</span><div className="menu-card-title"><h3>{item.name}</h3><strong>{money(item.price)}</strong></div><p>{item.description}</p></div></article>)}</div>}
      <div className="menu-footer"><span>{items.length} productos en esta categoría</span><span>Los cambios se guardan automáticamente</span></div>
    </section>
  </>;
}

// Vista operativa de pedidos activos e historial reciente.
function OrdersPage({ orders, onAdvance, onPrintKitchen, onEdit, pendingOrderIds, onRefresh, onCreate, onRequestPayment, onPrintReceipt, tableActionPending, receiptError, products, productsLoading, countdown, setCountdown, countdownBusy, countdownError }) {
  const active = orders.filter((order) => order.status !== 'Entregado' && order.status !== 'Pagado');
  const pendingPayment = orders.filter((order) => order.status === 'Entregado');
  const paymentGroupsByTable = pendingPayment.reduce((groups, order) => {
    const group = groups.get(order.table) || { table: order.table, orders: [], total: 0 };
    group.orders.push(order);
    group.total += order.total;
    groups.set(order.table, group);
    return groups;
  }, new Map());
  const paymentGroups = Array.from(paymentGroupsByTable.values()).sort((a, b) => a.table - b.table);
  const canCreate = products.some((item) => item.available);
  return <>
    <PageHeading eyebrow="SERVICIO EN SALÓN" title="Pedidos del restaurante" description="Sigue cada pedido y mantén a tu equipo sincronizado.">
      <button className="outline-button" onClick={onRefresh}><Icon name="clock" size={17} /> Actualizar pedidos</button>
      <button className="primary-button" onClick={onCreate} disabled={productsLoading || !canCreate} title={canCreate ? '' : 'Agrega productos disponibles al menú para crear pedidos.'}><Icon name="plus" size={17} /> Crear pedido</button>
    </PageHeading>
    {!productsLoading && !canCreate && <div className="order-create-hint">No hay productos disponibles para agregar a un pedido. Pide al administrador que configure el menú.</div>}
    <div className="order-overview"><div className="order-overview-card"><span className="overview-icon orange"><Icon name="orders" size={18} /></span><span><strong>{active.length}</strong><small>Pedidos activos</small></span></div><div className="order-overview-card"><span className="overview-icon purple"><Icon name="clock" size={18} /></span><span><strong>{orders.filter((order) => order.status === 'En preparación').length}</strong><small>En preparación</small></span></div><div className="order-overview-card"><span className="overview-icon green"><Icon name="check" size={18} /></span><span><strong>{orders.filter((order) => order.status === 'Listo para servir').length}</strong><small>Listos para servir</small></span></div><div className="order-overview-card"><span className="overview-icon blue"><Icon name="check" size={18} /></span><span><strong>{paymentGroups.length}</strong><small>Mesas por pagar</small></span></div><div className="service-status"><span className="live-dot" /> Recibiendo pedidos <small>Actualizado ahora</small></div></div>
    <div className="orders-toolbar"><div><h2>Pedidos en curso <span>{active.length}</span></h2><p>Gestiona los pedidos activos de tu restaurante</p></div><div className="orders-toolbar-right"><OrderCountdown countdown={countdown} setCountdown={setCountdown} busy={countdownBusy} /><div className="orders-legend"><span><i className="legend-new" /> Nuevo</span><span><i className="legend-preparing" /> Preparando</span><span><i className="legend-ready" /> Listo</span></div></div></div>
    {countdownError && <div className="form-error" role="alert">{countdownError}</div>}
    <div className="orders-grid">{active.map((order) => <OrderCard key={order.id} order={order} onAdvance={onAdvance} onPrintKitchen={onPrintKitchen} onEdit={onEdit} pending={pendingOrderIds.includes(order.id)} productsLoading={productsLoading} />)}</div>
    {receiptError && <div className="form-error" role="alert">{receiptError}</div>}
    {paymentGroups.length > 0 && <><div className="orders-toolbar payment-orders-heading"><div><h2>Mesas por pagar <span>{paymentGroups.length}</span></h2><p>Los pedidos entregados de cada mesa se cobran juntos en un solo total</p></div></div><div className="orders-grid">{paymentGroups.map((group) => <TablePaymentCard key={group.table} group={group} onPay={() => onRequestPayment(group)} onPrint={() => onPrintReceipt(group)} disabled={tableActionPending} />)}</div></>}
    {active.length === 0 && pendingPayment.length === 0 && <div className="panel empty-state"><span>✓</span><strong>¡Todo al día!</strong><p>No hay pedidos pendientes por ahora.</p></div>}
    <section className="recent-orders-table panel"><div className="panel-header"><div><h2>Actividad reciente</h2><p>Historial de pedidos recibidos</p></div></div><div className="table-scroll"><table><thead><tr><th>PEDIDO</th><th>MESA</th><th>GARZÓN</th><th>HORA</th><th>ESTADO</th><th>TOTAL</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td className="table-order-id">{order.displayId}</td><td>Mesa {order.table}</td><td>{order.server}</td><td>{order.time}</td><td><span className={`order-status ${statusClass(order.status)}`}>{order.status}</span></td><td><strong>{money(order.total)}</strong></td></tr>)}</tbody></table></div></section>
  </>;
}

function OrderCountdown({ countdown, setCountdown, busy }) {
  const [now, setNow] = useState(() => Date.now());
  const remainingMs = countdown.deadline === null ? countdown.remainingMs : Math.max(0, countdown.deadline - now);
  const running = countdown.deadline !== null && remainingMs > 0;
  const finished = countdown.deadline !== null && remainingMs === 0;
  const validInput = countdown.editValue === null || parseCountdownTime(countdown.editValue) !== null;
  const seconds = Math.ceil(remainingMs / 1000);
  const display = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  useEffect(() => {
    if (countdown.deadline === null || finished) return undefined;
    const update = () => setNow(Date.now());
    update();
    const interval = window.setInterval(update, 250);
    return () => window.clearInterval(interval);
  }, [countdown.deadline, finished]);

  function changeTime(value) {
    const durationMs = parseCountdownTime(value);
    setCountdown((current) => durationMs === null
      ? { ...current, editValue: value }
      : { ...current, durationMs, remainingMs: durationMs, deadline: null, editValue: value });
  }

  function start() {
    const currentTime = Date.now();
    const duration = countdown.deadline !== null || countdown.remainingMs <= 0 ? countdown.durationMs : countdown.remainingMs;
    setNow(currentTime);
    setCountdown((current) => ({ ...current, editValue: null, deadline: currentTime + duration }));
  }

  function pause() {
    setCountdown({ ...countdown, remainingMs: Math.max(0, countdown.deadline - Date.now()), deadline: null });
  }

  function reset() {
    setCountdown({ ...countdown, remainingMs: countdown.durationMs, deadline: null, editValue: null });
  }

  return <div className="order-countdown">
    <input className={`countdown-display${finished ? ' finished' : ''}`} type="text" maxLength={7} aria-label="Tiempo restante, minutos y segundos" aria-invalid={!validInput} aria-describedby={!validInput ? 'countdown-error' : undefined} title={running ? 'Pausa el temporizador para editar el tiempo' : 'Edita el tiempo en formato MM:SS'} value={countdown.editValue ?? display} readOnly={running || busy} onChange={(event) => changeTime(event.target.value)} onBlur={() => { if (validInput) setCountdown((current) => ({ ...current, editValue: null })); }} />
    {running
      ? <button className="outline-button" type="button" onClick={pause} disabled={busy}>Pausar</button>
      : <button className="primary-button" type="button" onClick={start} disabled={!validInput || busy}>{countdown.deadline === null && countdown.remainingMs > 0 && countdown.remainingMs !== countdown.durationMs ? 'Continuar' : 'Iniciar'}</button>}
    <button className="outline-button" type="button" onClick={reset} disabled={busy}>Reiniciar</button>
    {busy && <span className="countdown-finished" role="status">Aceptando pedido...</span>}
    {!validInput && <span className="countdown-finished" id="countdown-error" role="alert">Ingresa un tiempo entre 00:01 y 1440:00 (MM:SS).</span>}
  </div>;
}

function parseCountdownTime(value) {
  const match = /^(\d{1,4}):([0-5]\d)$/.exec(value);
  if (!match) return null;
  const totalSeconds = Number(match[1]) * 60 + Number(match[2]);
  return totalSeconds >= 1 && totalSeconds <= 1440 * 60 ? totalSeconds * 1000 : null;
}

// Tarjeta de un pedido, con sus productos, total y acción para avanzar su estado.
function OrderCard({ order, onAdvance, onPrintKitchen, onEdit, pending, productsLoading }) {
  const action = {
    'Nuevo pedido': 'Aceptar pedido',
    'En preparación': 'Marcar como listo',
    'Listo para servir': 'Marcar entregado',
  }[order.status];
  const isReady = order.status === 'Listo para servir';
  return <article className={`order-card ${statusClass(order.status)}`}><div className="order-card-top"><div><span className="order-id">{order.displayId}</span><h3>Mesa {order.table}</h3></div><div className="order-card-status">{order.status === 'En preparación' && <button className="order-edit-button" type="button" onClick={() => onEdit(order)} disabled={pending || productsLoading} aria-label={`Modificar pedido ${order.displayId}`}><Icon name="edit" size={13} />Modificar</button>}<span className={`order-status ${statusClass(order.status)}`}>{order.status}</span></div></div><div className="order-meta"><span><Icon name="clock" size={15} />{order.time}</span><span>Garzón <strong>{order.server}</strong></span></div><div className="order-items">{order.items.map((item) => <div key={item.idItemRestaurante}><span><b>{item.quantity}×</b> {item.name}</span><small>{money(item.unitPrice * item.quantity)}</small></div>)}</div><div className="order-total"><span>Total del pedido</span><strong>{money(order.total)}</strong></div><button className={`order-action ${isReady ? 'ready-action' : ''}`} onClick={() => onAdvance(order)} disabled={pending}>{isReady ? <Icon name="check" size={17} /> : null}{action}{!isReady && <Icon name="arrow" size={16} />}</button>{order.status !== 'Nuevo pedido' && order.kitchenReprintNeeded && <button className="order-action kitchen-reprint" onClick={() => onPrintKitchen(order)} disabled={pending}>Reimprimir cocina</button>}</article>;
}

function TablePaymentCard({ group, onPay, onPrint, disabled }) {
  return <article className="order-card delivered table-payment-card">
    <div className="order-card-top"><div><span className="order-id">{group.orders.length} pedidos entregados</span><h3>Mesa {group.table}</h3></div><span className="order-status delivered">Por pagar</span></div>
    <div className="payment-group-orders">{group.orders.map((order) => <div key={order.id}><span><b>{order.displayId}</b><small>{order.items.length} productos</small></span><strong>{money(order.total)}</strong></div>)}</div>
    <div className="order-total"><span>Total de la mesa</span><strong>{money(group.total)}</strong></div>
    <button className="order-action payment-action" onClick={onPay} disabled={disabled}><Icon name="check" size={17} />Confirmar pago total</button>
    <button className="order-action table-print-button" onClick={onPrint} disabled={disabled} aria-label={`Imprimir cuenta de la mesa ${group.table}`}><Icon name="printer" size={16} />Imprimir cuenta</button>
  </article>;
}

function PaymentConfirmationModal({ group, loadError, onClose, onConfirm }) {
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');

  async function confirm() {
    setError('');
    if (!paymentMethod) {
      setError('Selecciona el método de pago.');
      return;
    }
    setSaving(true);
    try {
      await onConfirm({ ...group, paymentMethod });
    } catch (saveError) {
      setError(`No se pudo finalizar el pago de la mesa: ${saveError.message}`);
    } finally {
      setSaving(false);
    }
  }

  return <div className="modal-backdrop" onMouseDown={(event) => { if (!saving && event.target === event.currentTarget) onClose(); }}>
    <section className="modal payment-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="payment-modal-title">
      <div className="modal-header"><div><div className="eyebrow">CIERRE DE MESA</div><h2 id="payment-modal-title">Confirmar pago total</h2></div><button className="icon-button" onClick={onClose} aria-label="Cerrar" disabled={saving}><Icon name="close" size={19} /></button></div>
      <p className="payment-confirm-copy">Se finalizarán juntos los {group.orders.length} pedidos entregados de la mesa {group.table}. Confirma que recibiste este pago total.</p>
      {loadError && <div className="form-error" role="alert">{loadError}</div>}
      <div className="payment-confirm-details"><div className="payment-order-breakdown">{group.orders.map((order) => <div key={order.id}><span>{order.displayId}</span><strong>{money(order.total)}</strong></div>)}</div><div className="payment-combined-total"><span>Total único de la mesa</span><strong>{money(group.total)}</strong></div></div>
      <fieldset className="payment-method-field">
        <legend>Método de pago</legend>
        <div className="payment-method-options">
          {[
            ['EFECTIVO', 'Efectivo'],
            ['TARJETA', 'Débito / Crédito'],
          ].map(([value, label]) => (
            <label key={value} className={paymentMethod === value ? 'selected' : ''}>
              <input
                type="radio"
                name="payment-method"
                value={value}
                checked={paymentMethod === value}
                onChange={(event) => setPaymentMethod(event.target.value)}
                disabled={saving}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {error && <div className="form-error" role="alert">{error}</div>}
      <div className="modal-actions"><button type="button" className="outline-button" onClick={onClose} disabled={saving}>Cancelar</button><button type="button" className="primary-button" onClick={confirm} disabled={saving}><Icon name="check" size={17} />{saving ? 'Guardando…' : 'Confirmar pago total'}</button></div>
    </section>
  </div>;
}

function CashOpenModal({ onClose, onOpen }) {
  const [initialAmount, setInitialAmount] = useState('0');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    const amount = Number(initialAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      setError('Ingresa un monto inicial válido.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await onOpen(amount);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  return <div className="modal-backdrop" onMouseDown={(event) => { if (!saving && event.target === event.currentTarget) onClose(); }}>
    <section className="modal" role="dialog" aria-modal="true" aria-labelledby="cash-open-title">
      <div className="modal-header"><div><div className="eyebrow">CAJA</div><h2 id="cash-open-title">Abrir caja</h2></div><button className="icon-button" onClick={onClose} aria-label="Cerrar" disabled={saving}><Icon name="close" size={19} /></button></div>
      <form onSubmit={submit}>
        <label className="form-field">Monto inicial en efectivo <span className="optional-label">CLP</span><div className="price-input"><span>$</span><input type="number" min="0" step="1" value={initialAmount} onChange={(event) => setInitialAmount(event.target.value)} /></div></label>
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="modal-actions"><button type="button" className="outline-button" onClick={onClose} disabled={saving}>Cancelar</button><button type="submit" className="primary-button" disabled={saving}>{saving ? 'Abriendo…' : 'Abrir caja'}</button></div>
      </form>
    </section>
  </div>;
}

function OrderModal({ products, onClose, onSave }) {
  const [table, setTable] = useState('1');
  const [description, setDescription] = useState('');
  const [quantities, setQuantities] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const selectedItems = products
    .map((item) => ({ idItemRestaurante: item.id, quantity: Number(quantities[item.id] || 0) }))
    .filter((item) => item.quantity > 0);
  const total = products.reduce((sum, item) => sum + item.price * Number(quantities[item.id] || 0), 0);

  async function submit(event) {
    event.preventDefault();
    if (selectedItems.length === 0) {
      setError('Agrega al menos un producto al pedido.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await onSave({ table: Number(table), description, items: selectedItems });
      onClose();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="modal order-create-modal" role="dialog" aria-modal="true" aria-labelledby="order-modal-title">
      <div className="modal-header"><div><div className="eyebrow">SERVICIO EN SALÓN</div><h2 id="order-modal-title">Crear pedido</h2></div><button className="icon-button" onClick={onClose} aria-label="Cerrar"><Icon name="close" size={19} /></button></div>
      <form onSubmit={submit}>
        <label className="form-field">Número de mesa<input type="number" min="1" step="1" required value={table} onChange={(event) => setTable(event.target.value)} /></label>
        <label className="form-field">Descripción <span className="optional-label">Opcional</span><textarea rows="2" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Notas para cocina o el equipo..." /></label>
        <div className="form-field">Productos</div>
        <div className="order-product-list">{products.map((item) => <label className="order-product-row" key={item.id}><span><strong>{item.name}</strong><small>{item.category} · {money(item.price)}</small></span><input aria-label={`Cantidad de ${item.name}`} type="number" min="0" step="1" value={quantities[item.id] || ''} placeholder="0" onChange={(event) => setQuantities({ ...quantities, [item.id]: event.target.value })} /></label>)}</div>
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="order-modal-total"><span>Total del pedido</span><strong>{money(total)}</strong></div>
        <div className="modal-actions"><button type="button" className="outline-button" onClick={onClose}>Cancelar</button><button type="submit" className="primary-button" disabled={saving || selectedItems.length === 0}><Icon name="check" size={17} />{saving ? 'Creando…' : 'Crear pedido'}</button></div>
      </form>
    </section>
  </div>;
}

function EditOrderModal({ order, products, onClose, onSave, onDelete }) {
  const [quantities, setQuantities] = useState(() => Object.fromEntries(
    order.items.map((item) => [item.idItemRestaurante, String(item.quantity)]),
  ));
  const [addedIds, setAddedIds] = useState([]);
  const [removedIds, setRemovedIds] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const busy = saving || deleting;
  const existingIds = new Set(order.items.map((item) => item.idItemRestaurante));
  const choices = [
    ...order.items.map((item) => {
      const current = products.find((product) => product.id === item.idItemRestaurante);
      return {
        id: item.idItemRestaurante,
        name: item.name,
        price: item.unitPrice,
        available: current?.available === true,
        originalQuantity: item.quantity,
      };
    }),
    ...products.filter((item) => item.available && !existingIds.has(item.id)),
  ];
  const orderChoices = choices.filter((item) =>
    (existingIds.has(item.id) && !removedIds.includes(item.id)) || addedIds.includes(item.id));
  const availableChoices = choices.filter((item) =>
    removedIds.includes(item.id) || (!existingIds.has(item.id) && !addedIds.includes(item.id)));
  const selectedItems = choices.map((item) => ({
    idItemRestaurante: item.id,
    quantity: Number(quantities[item.id] || 0),
  })).filter((item) => item.quantity > 0);
  const total = choices.reduce((sum, item) => sum + item.price * Number(quantities[item.id] || 0), 0);

  async function submit(event) {
    event.preventDefault();
    if (selectedItems.length === 0) {
      setError('El pedido debe conservar al menos un producto. Para quitarlo completo, usa Eliminar pedido.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await onSave(order, selectedItems);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setError('');
    setDeleting(true);
    try {
      await onDelete(order);
    } catch (deleteError) {
      setError(`No se pudo eliminar el pedido: ${deleteError.message}`);
    } finally {
      setDeleting(false);
    }
  }

  return <div className="modal-backdrop" onMouseDown={(event) => { if (!busy && event.target === event.currentTarget) onClose(); }}>
    <section className="modal order-create-modal" role="dialog" aria-modal="true" aria-labelledby="edit-order-title">
      <div className="modal-header"><div><div className="eyebrow">MESA {order.table}</div><h2 id="edit-order-title">Modificar {order.displayId}</h2></div><button className="icon-button" onClick={onClose} aria-label="Cerrar" disabled={busy}><Icon name="close" size={19} /></button></div>
      <form onSubmit={submit}>
        <p className="edit-order-hint">Cambia las cantidades o quita productos. Los productos existentes conservan su precio original.</p>
        <div className="form-field">Productos del pedido</div>
        <div className="order-product-list">{orderChoices.map((item) => <div className="order-product-row" key={item.id}><span><strong>{item.name}</strong><small>{money(item.price)}{!item.available ? ' · No disponible; solo se puede reducir' : ''}</small></span><input aria-label={`Cantidad de ${item.name}`} type="number" min="0" max={item.available ? 2147483647 : item.originalQuantity} step="1" value={quantities[item.id] ?? ''} placeholder="0" disabled={busy} onChange={(event) => setQuantities({ ...quantities, [item.id]: event.target.value })} /><button className="order-remove-item" type="button" aria-label={`Quitar ${item.name}`} disabled={busy} onClick={() => { setQuantities({ ...quantities, [item.id]: '0' }); if (existingIds.has(item.id)) setRemovedIds([...removedIds, item.id]); else setAddedIds(addedIds.filter((id) => id !== item.id)); }}>Quitar</button></div>)}</div>
        <div className="form-field">Agregar productos del menú</div>
        {availableChoices.length > 0
          ? <div className="order-product-list">{availableChoices.map((item) => <div className="order-product-row" key={item.id}><span><strong>{item.name}</strong><small>{existingIds.has(item.id) ? `Precio original${item.available ? '' : ' · No disponible, solo para restaurar'}` : item.category} · {money(item.price)}</small></span><button className="order-add-item" type="button" aria-label={`Agregar ${item.name}`} disabled={busy} onClick={() => { if (existingIds.has(item.id)) setRemovedIds(removedIds.filter((id) => id !== item.id)); else setAddedIds([...addedIds, item.id]); setQuantities({ ...quantities, [item.id]: '1' }); }}>+ Agregar</button></div>)}</div>
          : <p className="edit-order-hint">No hay más productos disponibles para agregar.</p>}
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="order-modal-total"><span>Total del pedido</span><strong>{money(total)}</strong></div>
        <div className="modal-actions edit-order-modal-actions"><button type="button" className="danger-button" onClick={remove} disabled={busy}>{deleting ? 'Eliminando…' : 'Eliminar pedido'}</button><button type="button" className="outline-button" onClick={onClose} disabled={busy}>Cancelar</button><button type="submit" className="primary-button" disabled={busy}>{saving ? 'Guardando…' : 'Guardar cambios'}</button></div>
      </form>
    </section>
  </div>;
}

function BusinessPage({ orders, totalSales }) {
  const [selectedMonth, setSelectedMonth] = useState(() => monthKey(new Date()));
  const months = useMemo(() => {
    const keys = new Set([monthKey(new Date()), ...orders.map((order) => monthKey(new Date(order.createdAt)))]);
    return [...keys].sort().reverse().map((key) => ({ key, label: monthLabel(key) }));
  }, [orders]);
  const monthOrders = orders.filter((order) => monthKey(new Date(order.createdAt)) === selectedMonth);
  const monthTotal = monthOrders.reduce((total, order) => total + order.total, 0);

  return <>
    <PageHeading eyebrow="PANEL ADMINISTRATIVO" title="Gestión de negocio" description="Resumen basado en los pedidos registrados en el backend." />
    <div className="business-notice"><span>✦</span><div><strong>Datos de los pedidos registrados</strong><p>El historial y los totales mensuales se calculan con los pedidos de este restaurante.</p></div></div>
    <section className="stats-grid business-stats">
      <StatCard label="Total de pedidos registrados" value={orders.length} change="" icon="orders" tone="purple" foot="en este restaurante" />
      <StatCard label="Ventas registradas" value={money(totalSales)} change="" icon="chart" tone="green" foot="suma de todos los pedidos" />
      <StatCard label="Pedidos activos" value={orders.filter((order) => order.status !== 'Entregado' && order.status !== 'Pagado').length} change="" icon="clock" tone="orange" foot="pendientes de entrega" />
      <StatCard label="Pedidos pagados" value={orders.filter((order) => order.status === 'Pagado').length} change="" icon="check" tone="blue" foot="estado final confirmado" />
    </section>
    <section className="panel recent-orders-table business-history">
      <div className="panel-header business-history-header">
        <div><h2>Historial de pedidos</h2><p>Consulta los pedidos agrupados por mes.</p></div>
        <label className="business-history-month">Mes<select className="select-control" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}>{months.map((month) => <option key={month.key} value={month.key}>{month.label}</option>)}</select></label>
      </div>
      <div className="business-history-summary"><span>{monthOrders.length} {monthOrders.length === 1 ? 'pedido' : 'pedidos'}</span><strong>Total del mes: {money(monthTotal)}</strong></div>
      {monthOrders.length === 0
        ? <div className="empty-state business-history-empty"><span>☝</span><strong>No hay pedidos en este mes</strong><p>Selecciona otro mes para consultar su historial.</p></div>
        : <div className="table-scroll"><table><thead><tr><th>PEDIDO</th><th>MESA</th><th>GARZÓN</th><th>FECHA Y HORA</th><th>PRODUCTOS</th><th>ESTADO</th><th>TOTAL</th></tr></thead><tbody>{monthOrders.map((order) => <tr key={order.id}><td className="table-order-id">{order.displayId}</td><td>Mesa {order.table}</td><td>{order.server}</td><td>{formatOrderDate(order.createdAt)}</td><td className="history-products" title={order.items.map((item) => `${item.quantity}× ${item.name}`).join(', ')}>{order.items.map((item) => `${item.quantity}× ${item.name}`).join(', ') || order.description || 'Sin detalle'}</td><td><span className={`order-status ${statusClass(order.status)}`}>{order.status}</span></td><td><strong>{money(order.total)}</strong></td></tr>)}</tbody></table></div>}
    </section>
  </>;
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key) {
  const [year, month] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
}

function formatOrderDate(value) {
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

// Traduce el estado del pedido a una clase usada para aplicar sus colores.
function statusClass(status) {
  if (status === 'Nuevo pedido') return 'new';
  if (status === 'En preparación') return 'preparing';
  if (status === 'Listo para servir') return 'ready';
  if (status === 'Pagado') return 'paid';
  return 'delivered';
}

// Formulario compartido para crear o editar un producto del menú.
function MenuModal({ item, onClose, onSave }) {
  const [form, setForm] = useState({ name: item.name || '', category: item.category || 'Platos principales', description: item.description || '', price: item.price || '', image: item.image || '', available: item.available ?? true });
  const [error, setError] = useState('');
  function submit(event) {
    event.preventDefault();
    // Evita guardar productos incompletos o con un precio que no sea positivo.
    if (!form.name.trim() || !form.description.trim() || Number(form.price) <= 0) {
      setError('Completa el nombre, la descripción y un precio válido.');
      return;
    }
    onSave({ ...form, name: form.name.trim(), price: Number(form.price), id: item.id });
  }
  const categoryOptions = form.category && !menuCategoryOptions.includes(form.category)
    ? [form.category, ...menuCategoryOptions]
    : menuCategoryOptions;

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-header"><div><div className="eyebrow">GESTIÓN DEL MENÚ</div><h2 id="modal-title">{item.id ? 'Editar producto' : 'Agregar producto'}</h2></div><button className="icon-button" onClick={onClose} aria-label="Cerrar"><Icon name="close" size={19} /></button></div><form onSubmit={submit}><label className="form-field">Nombre del producto<input autoFocus value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ej. Lomo saltado" /></label><label className="form-field">Categoría<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{categoryOptions.map((category) => <option key={category}>{category}</option>)}</select></label><label className="form-field">Descripción<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Describe los ingredientes o características del producto..." rows="3" /></label><label className="form-field">Precio (CLP)<div className="price-input"><span>$</span><input type="number" min="1" step="1" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} placeholder="0" /></div></label><label className="form-field">URL de imagen <span className="optional-label">Opcional</span><input type="url" value={form.image} onChange={(event) => setForm({ ...form, image: event.target.value })} placeholder="https://..." /></label><label className="availability-toggle"><input type="checkbox" checked={form.available} onChange={(event) => setForm({ ...form, available: event.target.checked })} /><span className="toggle-track" /><span><strong>Disponible para pedir</strong><small>El producto se mostrará en el menú.</small></span></label>{error && <div className="form-error">{error}</div>}<div className="modal-actions"><button type="button" className="outline-button" onClick={onClose}>Cancelar</button><button type="submit" className="primary-button"><Icon name="check" size={17} />{item.id ? 'Guardar cambios' : 'Agregar producto'}</button></div></form></section></div>;
}

function LoginPage({ onLogin, initialError }) {
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState(initialError);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => setError(initialError), [initialError]);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await onLogin(nombreUsuario.trim(), contrasena);
    } catch (loginError) {
      setError(loginError.message || 'No se pudo iniciar sesión.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-brand-panel">
        <a className="brand login-brand" href="/" aria-label="MesaLista">
          <span className="brand-mark"><span /><span /><span /></span>
          <span className="brand-name">mesa<span>lista</span></span>
        </a>
        <div className="login-brand-copy">
          <span className="eyebrow">GESTIÓN PARA RESTAURANTES</span>
          <h1>Tu equipo,<br />en la misma mesa.</h1>
          <p>Administra menús y pedidos de forma simple, segura y en tiempo real.</p>
        </div>
        <div className="login-brand-footer"><span className="live-dot" /> Tu servicio, siempre en orden</div>
      </section>
      <section className="login-form-panel">
        <div className="login-form-wrap">
          <div className="login-mobile-brand">
            <span className="brand-mark"><span /><span /><span /></span>
            <span className="brand-name">mesa<span>lista</span></span>
          </div>
          <div className="eyebrow">BIENVENIDO DE VUELTA</div>
          <h2>Iniciar sesión</h2>
          <p className="login-description">Ingresa tus credenciales para continuar.</p>
          <form onSubmit={submit}>
            <label className="form-field">
              Nombre de usuario
              <input autoComplete="username" autoFocus required value={nombreUsuario} onChange={(event) => setNombreUsuario(event.target.value)} placeholder="Tu usuario" />
            </label>
            <label className="form-field">
              Contraseña
              <input type="password" autoComplete="current-password" required value={contrasena} onChange={(event) => setContrasena(event.target.value)} placeholder="Tu contraseña" />
            </label>
            {error && <div className="form-error" role="alert">{error}</div>}
            <button type="submit" className="primary-button login-submit" disabled={submitting}>
              {submitting ? 'Verificando…' : 'Entrar a MesaLista'}
              {!submitting && <Icon name="arrow" size={16} />}
            </button>
          </form>
          <div className="login-security-note"><Icon name="check" size={15} /> Acceso protegido para tu restaurante</div>
        </div>
      </section>
    </main>
  );
}

export default App;
