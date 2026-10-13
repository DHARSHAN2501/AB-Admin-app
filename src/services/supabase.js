
const memoryStore = new Map();

export const safeStorage = {
  getItem: (key) => {
    try {
      const val = window.localStorage.getItem(key);
      if (val !== null) return val;
    } catch (e) {}
    return memoryStore.get(key) || null;
  },
  setItem: (key, val) => {
    try {
      window.localStorage.setItem(key, val);
    } catch (e) {}
    memoryStore.set(key, val);
  },
  removeItem: (key) => {
    try {
      window.localStorage.removeItem(key);
    } catch (e) {}
    memoryStore.delete(key);
  }
};
import { createClient } from '@supabase/supabase-js';

const REAL_SUPABASE_URL = 'https://thsuvmauyksxiltzutwx.supabase.co';
const REAL_SUPABASE_KEY = 'sb_publishable_9EfDMt_QKs7oaYPYCp_h-w_to0VizR6';

const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL !== 'https://sample-restaurant.supabase.co') 
  ? import.meta.env.VITE_SUPABASE_URL 
  : REAL_SUPABASE_URL;

const supabaseAnonKey = (typeof import.meta !== 'undefined' && (import.meta?.env?.VITE_SUPABASE_ANON_KEY || import.meta?.env?.VITE_SUPABASE_PUBLISHABLE_KEY))
  ? (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) 
  : REAL_SUPABASE_KEY;

export const isSupabaseConfigured = () => true;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { storage: safeStorage, persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });

const INITIAL_CATEGORIES = [];

const INITIAL_MENU_ITEMS = [];

const INITIAL_TABLES = Array.from({ length: 12 }, (_, i) => ({
  id: `table-${i + 1}`,
  table_number: i + 1,
  capacity: (i % 3 === 0) ? 6 : 4,
  status: 'AVAILABLE'
}));

const INITIAL_ORDERS = [];

const INITIAL_EMPLOYEES = [];

const INITIAL_ATTENDANCE = [];

const getStore = (key, init) => {
  try {
    const data = safeStorage.getItem(`smart_rest_${key}`);
    if (!data) return init;
    const parsed = JSON.parse(data);
    if (key === 'orders' && Array.isArray(parsed)) {
      const sanitized = parsed.filter(o => {
        const idStr = String(o.id || o.order_number || '').toLowerCase();
        const cust = String(o.customer_name || '').toLowerCase();
        return idStr !== 'ord-1024' && idStr !== 'ord1024' && idStr !== 'ord-1023' && idStr !== 'ord1023' && cust !== 'rahul s.' && cust !== 'anita m.';
      });
      if (sanitized.length !== parsed.length) {
        safeStorage.setItem('smart_rest_orders', JSON.stringify(sanitized));
        return sanitized;
      }
      return sanitized;
    }
    if (key === 'menu_items' && Array.isArray(parsed)) {
      const sanitized = parsed.map(item => {
        if (item.name && item.name.includes('Mock ')) {
          return { ...item, name: item.name.replace(/Mock /g, 'Soya ') };
        }
        return item;
      });
      return sanitized;
    }
    return parsed;
  } catch (e) {
    return init;
  }
};

const setStore = (key, data) => {
  try {
    safeStorage.setItem(`smart_rest_${key}`, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent(`smart_rest_event_${key}`, { detail: data }));
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const bc = new BroadcastChannel(`smart_rest_bc_${key}`);
        bc.postMessage({ type: 'UPDATE', detail: data });
        bc.close();
      } catch (e) {}
    }
  } catch (e) {}
};

export const localDB = {
  getCategories: () => getStore('categories', INITIAL_CATEGORIES),
  saveOrders: (ordersList) => setStore('orders', ordersList || []),
  saveCategory: (cat) => {
    const list = getStore('categories', INITIAL_CATEGORIES);
    const idx = list.findIndex(c => c.id === cat.id);
    const updated = idx >= 0 ? list.map(c => c.id === cat.id ? cat : c) : [...list, { ...cat, id: `cat-${Date.now()}` }];
    setStore('categories', updated);
    return updated;
  },
  deleteCategory: (id) => {
    const updated = getStore('categories', INITIAL_CATEGORIES).filter(c => c.id !== id);
    setStore('categories', updated);
    return updated;
  },

  getMenuItems: () => getStore('menu_items', INITIAL_MENU_ITEMS),
  saveMenuItem: (item) => {
    const list = getStore('menu_items', INITIAL_MENU_ITEMS);
    const idx = list.findIndex(i => i.id === item.id);
    const updated = idx >= 0 ? list.map(i => i.id === item.id ? item : i) : [...list, { ...item, id: `item-${Date.now()}` }];
    setStore('menu_items', updated);
    return updated;
  },
  deleteMenuItem: (id) => {
    const updated = getStore('menu_items', INITIAL_MENU_ITEMS).filter(i => i.id !== id);
    setStore('menu_items', updated);
    return updated;
  },

  getTables: () => getStore('tables', INITIAL_TABLES),
  saveTable: (table) => {
    const list = getStore('tables', INITIAL_TABLES);
    const num = Number(table.table_number);
    const existing = list.find(t => t.table_number === num);
    const updated = existing ? list : [...list, { id: `table-${num}`, table_number: num, capacity: Number(table.capacity || 4), status: 'AVAILABLE' }];
    setStore('tables', updated);
    return updated;
  },
  deleteTable: (tableNumberOrId) => {
    const list = getStore('tables', INITIAL_TABLES);
    const updated = list.filter(t => t.id !== tableNumberOrId && t.table_number !== Number(tableNumberOrId));
    setStore('tables', updated);
    return updated;
  },

  getOrders: () => getStore('orders', INITIAL_ORDERS),
  updateOrderStatus: (orderId, status) => {
    const list = getStore('orders', INITIAL_ORDERS);
    const matchKey = String(orderId || '').toLowerCase();
    const updated = list.map(o => {
      const idStr = String(o.id || '').toLowerCase();
      const numStr = String(o.order_number || '').toLowerCase();
      return (idStr === matchKey || numStr === matchKey || matchKey.includes(numStr)) ? { ...o, order_status: status } : o;
    });
    setStore('orders', updated);
    return updated;
  },
  updateBillStatus: (orderId, bill_status) => {
    const list = getStore('orders', INITIAL_ORDERS);
    const matchKey = String(orderId || '').toLowerCase();
    const updated = list.map(o => {
      const idStr = String(o.id || '').toLowerCase();
      const numStr = String(o.order_number || '').toLowerCase();
      return (idStr === matchKey || numStr === matchKey || matchKey.includes(numStr)) ? { ...o, bill_status } : o;
    });
    setStore('orders', updated);
    return updated;
  },
  markTablePaid: (tableNumber) => {
    const list = getStore('orders', INITIAL_ORDERS);
    const updatedOrders = list.map(o => o.table_number === Number(tableNumber) ? { ...o, bill_status: 'PAID', order_status: 'COMPLETED' } : o);
    setStore('orders', updatedOrders);

    const tbls = getStore('tables', INITIAL_TABLES).map(t => t.table_number === Number(tableNumber) ? { ...t, status: 'AVAILABLE' } : t);
    setStore('tables', tbls);
    return updatedOrders;
  },

  // Employees & Attendance Methods
  getEmployees: () => getStore('employees', INITIAL_EMPLOYEES),
  saveEmployee: (emp) => {
    const list = getStore('employees', INITIAL_EMPLOYEES);
    const idx = list.findIndex(e => e.id === emp.id);
    const updated = idx >= 0 ? list.map(e => e.id === emp.id ? emp : e) : [...list, { ...emp, id: `emp-${Date.now()}` }];
    setStore('employees', updated);
    return updated;
  },
  deleteEmployee: (id) => {
    const updated = getStore('employees', INITIAL_EMPLOYEES).filter(e => e.id !== id);
    setStore('employees', updated);
    return updated;
  },

  getAttendance: () => getStore('attendance', INITIAL_ATTENDANCE),
  recordEmployeeLogin: (employeeName) => {
    const list = getStore('attendance', INITIAL_ATTENDANCE);
    const now = new Date();
    const newEntry = {
      id: `att-${Date.now()}`,
      employee_name: employeeName,
      date: now.toISOString().split('T')[0],
      login_time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      logout_time: null,
      status: 'ACTIVE'
    };
    const updated = [newEntry, ...list];
    setStore('attendance', updated);
    return newEntry;
  },
  recordEmployeeLogout: (attendanceId, employeeName) => {
    const list = getStore('attendance', INITIAL_ATTENDANCE);
    const now = new Date();
    const logoutTimeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const updated = list.map(att => {
      if (att.id === attendanceId || (att.employee_name === employeeName && att.status === 'ACTIVE')) {
        return { ...att, logout_time: logoutTimeStr, status: 'COMPLETED' };
      }
      return att;
    });
    setStore('attendance', updated);
    return updated;
  }
};
