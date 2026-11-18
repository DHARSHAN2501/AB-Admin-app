import { supabase, isSupabaseConfigured } from './supabase';
import { getItemCategory, getCategoryImage } from '../constants/categories';
import {
  getCategories as ajaxGetCategories,
  createCategory as ajaxCreateCategory,
  updateCategory as ajaxUpdateCategory,
  deleteCategory as ajaxDeleteCategory,
  reassignMenuItemsCategory,
  getMenuItems as ajaxGetMenuItems,
  createMenuItem as ajaxCreateMenuItem,
  updateMenuItem as ajaxUpdateMenuItem,
  deleteMenuItem as ajaxDeleteMenuItem,
  getOrders as ajaxGetOrders,
  getCustomerOrders as ajaxGetCustomerOrders,
  markBillPaid as ajaxMarkBillPaid,
  updateOrderStatus as ajaxUpdateOrderStatus
} from './api.js';

let cachedAdminCategories = null;
let lastAdminCatsFetch = 0;
let cachedAdminMenuItems = null;
let lastAdminMenuFetch = 0;
const MENU_CACHE_TTL_MS = 120000;

let cachedAdminOrders = null;

function sortOrdersDesc(list) {
  return [...list].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

function applyRealtimeOrderChange(currentList, payload) {
  if (!Array.isArray(currentList) || !payload) return null;
  const { eventType, new: newRow, old: oldRow } = payload;

  if (eventType === 'DELETE') {
    const delId = oldRow?.id;
    return delId ? currentList.filter(o => o.id !== delId) : null;
  }

  if (eventType === 'INSERT' || eventType === 'UPDATE') {
    if (!newRow || !newRow.id) return null;
    const idx = currentList.findIndex(o => o.id === newRow.id || (o.order_number && o.order_number === newRow.order_number));
    if (idx >= 0) {
      const next = [...currentList];
      next[idx] = { ...next[idx], ...newRow };
      return next;
    }
    return sortOrdersDesc([newRow, ...currentList]);
  }

  return null;
}

export const menuService = {
  invalidateCache: (scope = 'all') => {
    if (scope === 'categories' || scope === 'all') {
      cachedAdminCategories = null;
      lastAdminCatsFetch = 0;
    }
    if (scope === 'menu_items' || scope === 'all') {
      cachedAdminMenuItems = null;
      lastAdminMenuFetch = 0;
    }
  },

  getCategories: async (forceRefresh = false) => {
    if (!forceRefresh && cachedAdminCategories && (Date.now() - lastAdminCatsFetch < MENU_CACHE_TTL_MS)) {
      return cachedAdminCategories;
    }
    const remoteCats = await ajaxGetCategories();
    const list = Array.isArray(remoteCats) ? remoteCats : [];
    cachedAdminCategories = list;
    lastAdminCatsFetch = Date.now();
    return list;
  },

  saveCategory: async (cat, oldCatName = null) => {
    const trimmedName = String(cat?.name || '').trim();
    if (!trimmedName) {
      throw new Error('Category name is required.');
    }

    const isNew = cat.isEditing === false || !cat.id;
    const assignedId = isNew
      ? String(cat.id || `cat-${Date.now()}`)
      : String(cat.id);

    const payload = {
      id: assignedId,
      name: trimmedName,
      badge: String(cat.badge || '').trim(),
      tagline: String(cat.tagline || cat.description || '').trim(),
      description: String(cat.description || cat.tagline || '').trim(),
      image_url: String(cat.image_url || getCategoryImage(cat)).trim(),
      display_order: Number(cat.display_order ?? cat.no ?? 0),
      is_active: cat.is_active !== false
    };

    let result;
    if (isNew) {
      result = await ajaxCreateCategory(payload);
    } else {
      result = await ajaxUpdateCategory(assignedId, payload);
      if (oldCatName && oldCatName !== trimmedName) {
        try {
          await reassignMenuItemsCategory(oldCatName, trimmedName);
        } catch (e) {
          console.warn('reassignMenuItemsCategory warning:', e?.message || e);
        }
      }
    }
    menuService.invalidateCache('all');
    return result;
  },

  deleteCategory: async (id) => {
    await ajaxDeleteCategory(id);
    menuService.invalidateCache('categories');
    return true;
  },

  getMenuItems: async (forceRefresh = false) => {
    if (!forceRefresh && cachedAdminMenuItems && (Date.now() - lastAdminMenuFetch < MENU_CACHE_TTL_MS)) {
      return cachedAdminMenuItems;
    }
    const remoteList = await ajaxGetMenuItems();
    const list = Array.isArray(remoteList) ? remoteList : [];
    const normalized = list.map(item => {
      const cat = (item.category_name || item.category_id || '').trim() || getItemCategory(item);
      return {
        ...item,
        category_id: cat,
        category_name: cat
      };
    });
    cachedAdminMenuItems = normalized;
    lastAdminMenuFetch = Date.now();
    return normalized;
  },

  saveMenuItem: async (item) => {
    const isNew = item.isEditing === false || !item.id;
    const itemId = item.id || `item-${Date.now()}`;
    const categoryName = String(item.category_id || item.category_name || '').trim();

    const dbPayload = {
      id: itemId,
      category_id: categoryName,
      name: String(item.name || '').trim(),
      price: Number(item.price || 0),
      image_url: String(item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500').trim()
    };

    if (!isNew) {
      const patched = await ajaxUpdateMenuItem(itemId, {
        category_id: dbPayload.category_id,
        name: dbPayload.name,
        price: dbPayload.price,
        image_url: dbPayload.image_url
      });
      menuService.invalidateCache('menu_items');
      if (Array.isArray(patched) && patched.length > 0) {
        return patched[0];
      }
    }

    const created = await ajaxCreateMenuItem(dbPayload);
    menuService.invalidateCache('menu_items');
    return Array.isArray(created) ? (created[0] || dbPayload) : (created || dbPayload);
  },

  deleteMenuItem: async (id) => {
    await ajaxDeleteMenuItem(id);
    menuService.invalidateCache('menu_items');
    return true;
  },

  toggleAvailability: async (id, current) => {
    await ajaxUpdateMenuItem(id, { is_available: !current });
    menuService.invalidateCache('menu_items');
    return true;
  },

  subscribeToMenu: (callback) => {
    if (!isSupabaseConfigured()) return () => {};
    let debounceTimer = null;
    let pendingCategories = false;
    let pendingItems = false;

    const scheduleFlush = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const scope = {
          categoriesChanged: pendingCategories,
          itemsChanged: pendingItems
        };
        pendingCategories = false;
        pendingItems = false;
        callback(scope);
      }, 220);
    };

    try {
      const channel = supabase
        .channel('public:menu_sync:admin')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
          menuService.invalidateCache('categories');
          pendingCategories = true;
          scheduleFlush();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => {
          menuService.invalidateCache('menu_items');
          pendingItems = true;
          scheduleFlush();
        })
        .subscribe();
      return () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        try {
          supabase.removeChannel(channel);
        } catch (e) {}
      };
    } catch (e) {
      return () => {};
    }
  }
};

export const orderService = {
  getOrders: async () => {
    try {
      const remoteData = await ajaxGetOrders();
      if (Array.isArray(remoteData)) {
        cachedAdminOrders = sortOrdersDesc(remoteData);
        return cachedAdminOrders;
      }
    } catch (e) {
      console.warn('Admin REST API getOrders error:', e.message);
    }
    return cachedAdminOrders || [];
  },

  confirmPaymentAndFreeTable: async (tableNumber) => {
    const orders = await ajaxGetCustomerOrders(Number(tableNumber));
    const tableOrders = (orders || []).filter(o => Number(o.table_number) === Number(tableNumber) && o.bill_status !== 'PAID');
    await Promise.all(tableOrders.map(o => ajaxMarkBillPaid(o.id)));
    if (Array.isArray(cachedAdminOrders)) {
      const ids = new Set(tableOrders.map(o => o.id));
      cachedAdminOrders = cachedAdminOrders.map(o => ids.has(o.id) ? { ...o, bill_status: 'PAID' } : o);
    }
    return true;
  },

  updateOrderStatus: async (orderId, status) => {
    await ajaxUpdateOrderStatus(orderId, status);
    if (Array.isArray(cachedAdminOrders)) {
      cachedAdminOrders = cachedAdminOrders.map(o =>
        (o.id === orderId || o.order_number === orderId) ? { ...o, order_status: status } : o
      );
    }
    return true;
  },

  subscribeToOrders: (callback) => {
    const cleanups = [];
    let isRealtimeSubscribed = false;
    let hasConnectedOnce = false;

    if (isSupabaseConfigured()) {
      try {
        const sub = supabase
          .channel('public:orders:admin')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, payload => {
            const patched = applyRealtimeOrderChange(cachedAdminOrders, payload);
            if (patched) {
              cachedAdminOrders = patched;
              callback({ eventType: payload.eventType, new: payload.new, old: payload.old, orders: patched });
            } else {
              callback(payload);
            }
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              isRealtimeSubscribed = true;
              if (hasConnectedOnce) {
                orderService.getOrders().then(fresh => {
                  callback({ eventType: 'RECONNECT_RESYNC', orders: fresh });
                }).catch(() => {});
              }
              hasConnectedOnce = true;
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
              isRealtimeSubscribed = false;
            }
          });
        cleanups.push(() => supabase.removeChannel(sub));
      } catch (e) {}
    }

    // Fallback poll runs ONLY when WebSocket Realtime is not SUBSCRIBED and tab is visible
    let isPolling = false;
    const pollInterval = setInterval(async () => {
      if (isRealtimeSubscribed) return;
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
    }, 25000);
    cleanups.push(() => clearInterval(pollInterval));

    return () => {
      cleanups.forEach(fn => fn());
    };
  }
};
