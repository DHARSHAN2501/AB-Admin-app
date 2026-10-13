import { supabase, isSupabaseConfigured, localDB } from './supabase';
import { 
  getOrders as ajaxGetOrders, 
  getMenuItems as ajaxGetMenuItems, 
  getCategories as ajaxGetCategories,
  createMenuItem as ajaxCreateMenuItem,
  updateMenuItem as ajaxUpdateMenuItem,
  deleteMenuItem as ajaxDeleteMenuItem,
  markBillPaid as ajaxMarkBillPaid,
  updateOrderStatus as ajaxUpdateOrderStatus
} from './api';

export const menuService = {
  getCategories: async () => {
    try {
      const data = await ajaxGetCategories();
      if (data && Array.isArray(data) && data.length > 0) return data;
    } catch (e) {}
    return localDB.getCategories();
  },
  saveCategory: async (cat) => localDB.saveCategory(cat),
  deleteCategory: async (id) => localDB.deleteCategory(id),

  getMenuItems: async () => {
    try {
      const data = await ajaxGetMenuItems();
      if (data && Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch (e) {}
    return localDB.getMenuItems();
  },
  saveMenuItem: async (item) => {
    const dbPayload = {
      category_id: String(item.category_id || 'South Indian'),
      name: String(item.name || ''),
      price: Number(item.price || 0),
      image_url: String(item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500')
    };

    const localItem = {
      ...(item.id ? { id: item.id } : {}),
      ...dbPayload
    };

    const savedLocal = localDB.saveMenuItem(localItem);
    try {
      if (item.id) {
        await ajaxUpdateMenuItem(item.id, dbPayload);
      } else {
        await ajaxCreateMenuItem(localItem);
      }
    } catch (e) {
      console.warn('saveMenuItem error:', e.message);
    }
    return savedLocal;
  },
  deleteMenuItem: async (id) => {
    localDB.deleteMenuItem(id);
    try {
      await ajaxDeleteMenuItem(id);
    } catch (e) {}
    return true;
  },
  toggleAvailability: async (id, current) => {
    const list = localDB.getMenuItems();
    const item = list.find(i => i.id === id);
    if (item) {
      item.is_available = !current;
      localDB.saveMenuItem(item);
      try {
        await ajaxUpdateMenuItem(id, { is_available: !current });
      } catch (e) {}
    }
    return true;
  }
};

export const tableService = {
  getTables: async () => localDB.getTables(),
  saveTable: async (t) => localDB.saveTable(t),
  deleteTable: async (id) => localDB.deleteTable(id)
};

export const orderService = {
  getOrders: async () => {
    try {
      const remoteData = await ajaxGetOrders();
      if (remoteData && Array.isArray(remoteData)) {
        try {
          localDB.saveOrders(remoteData);
        } catch (e) {}
        return remoteData;
      }
    } catch (e) {
      console.warn('Admin REST API getOrders fallback to localDB:', e.message);
    }
    return localDB.getOrders() || [];
  },

  confirmPaymentAndFreeTable: async (tableNumber) => {
    localDB.markTablePaid(tableNumber);
    const orders = localDB.getOrders();
    const tableOrders = orders.filter(o => Number(o.table_number) === Number(tableNumber) && o.bill_status !== 'PAID');
    for (const o of tableOrders) {
      try {
        await ajaxMarkBillPaid(o.id);
      } catch (e) {}
    }
    return true;
  },

  updateOrderStatus: async (orderId, status) => {
    localDB.updateOrderStatus(orderId, status);
    try {
      await ajaxUpdateOrderStatus(orderId, status);
    } catch (e) {}
    return true;
  },

  subscribeToOrders: (callback) => {
    const cleanups = [];

    // 1. Supabase Realtime Channel with Reconnect Reconciliation
    if (isSupabaseConfigured()) {
      try {
        let channelConnected = false;
        const sub = supabase
          .channel('public:orders:admin')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, payload => {
            callback(payload);
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              if (channelConnected) {
                // Reconnected after disconnect — reconcile fresh admin orders immediately
                adminService.getOrders().then(fresh => {
                  callback({ eventType: 'RECONNECT_RESYNC', orders: fresh });
                }).catch(() => {});
              }
              channelConnected = true;
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
              channelConnected = false;
            }
          });
        cleanups.push(() => supabase.removeChannel(sub));
      } catch (e) {}
    }

    // 2. BroadcastChannel for instant cross-tab real-time sync
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const bc = new BroadcastChannel('smart_rest_bc_orders');
        bc.onmessage = (event) => {
          callback({ eventType: 'UPDATE', detail: event.data?.detail });
        };
        cleanups.push(() => bc.close());
      } catch (e) {}
    }

    // 3. CustomEvent Listener
    const customListener = (e) => callback({ eventType: 'UPDATE', detail: e.detail });
    window.addEventListener('smart_rest_event_orders', customListener);
    cleanups.push(() => window.removeEventListener('smart_rest_event_orders', customListener));

    // 4. Storage Event Listener (across browser windows)
    const storageListener = (e) => {
      if (e.key === 'smart_rest_orders') {
        callback({ eventType: 'UPDATE' });
      }
    };
    window.addEventListener('storage', storageListener);
    cleanups.push(() => window.removeEventListener('storage', storageListener));

    // 5. Adaptive Ajax Auto-Refresh Interval (Fallback polling when tab is visible, passing data directly)
    let isPolling = false;
    const pollInterval = setInterval(async () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (isPolling) return;
      isPolling = true;
      try {
        const fresh = await orderService.getOrders();
        callback({ eventType: 'POLL_REFRESH', orders: fresh });
      } catch (e) {
      } finally {
        isPolling = false;
      }
    }, 10000);
    cleanups.push(() => clearInterval(pollInterval));

    return () => {
      cleanups.forEach(fn => fn());
    };
  }
};
