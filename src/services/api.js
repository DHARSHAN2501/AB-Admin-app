import { safeStorage } from './supabase.js';

const SUPABASE_URL = (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_SUPABASE_URL) || 'https://thsuvmauyksxiltzutwx.supabase.co';
const SUPABASE_KEY = (typeof import.meta !== 'undefined' && (import.meta?.env?.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta?.env?.VITE_SUPABASE_ANON_KEY)) || 'sb_publishable_9EfDMt_QKs7oaYPYCp_h-w_to0VizR6';

// ==========================================
// IN-FLIGHT GET REQUEST DEDUPLICATION MANAGER
// ==========================================
class RequestManager {
  constructor() {
    this.inflightGets = new Map();
  }

  dedupeGet(requestKey, factory) {
    if (!requestKey) return factory();
    if (this.inflightGets.has(requestKey)) {
      return this.inflightGets.get(requestKey);
    }
    const promise = (async () => {
      try {
        return await factory();
      } finally {
        if (this.inflightGets.get(requestKey) === promise) {
          this.inflightGets.delete(requestKey);
        }
      }
    })();
    this.inflightGets.set(requestKey, promise);
    return promise;
  }

  isAbortError(err) {
    return Boolean(
      err && (
        err.name === 'AbortError' ||
        (err.message === 'Failed to fetch' && err.signal?.aborted) ||
        String(err).includes('AbortError')
      )
    );
  }
}

export const requestManager = new RequestManager();

export async function supabaseRequest(endpoint, options = {}) {
  const { requestKey, signal: externalSignal, ...fetchOptions } = options;
  const method = String(fetchOptions.method || 'GET').toUpperCase();

  const runFetch = async () => {
    let authHeader = `Bearer ${SUPABASE_KEY}`;
    try {
      const sessionStr = safeStorage.getItem('sb-thsuvmauyksxiltzutwx-auth-token') || safeStorage.getItem('smart_rest_auth_token');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        if (session?.access_token) {
          authHeader = `Bearer ${session.access_token}`;
        }
      }
    } catch (e) {}

    const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: externalSignal,
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_KEY,
          "Authorization": authHeader,
          "Prefer": "return=representation",
          ...(fetchOptions.headers || {})
        }
      });

      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = text;
      }

      if (!response.ok) {
        console.warn("Supabase API Warning:", { status: response.status, endpoint, data });
        throw new Error(data?.message || data?.details || `Supabase request failed: ${response.status}`);
      }

      return data;
    } catch (err) {
      if (externalSignal?.aborted && requestManager.isAbortError(err)) {
        return null;
      }
      throw err;
    }
  };

  if (method === 'GET' && requestKey && !externalSignal) {
    return requestManager.dedupeGet(requestKey, runFetch);
  }

  return runFetch();
}

// ==========================================
// CATEGORY AJAX API (Database-Backed)
// ==========================================
function normalizeCategoryRow(row) {
  if (!row) return row;
  return {
    ...row,
    badge: row.badge || '',
    tagline: row.tagline || row.description || '',
    description: row.description || row.tagline || '',
    display_order: Number(row.display_order ?? row.no ?? 0),
    is_active: row.is_active !== false
  };
}

function buildCategoryPayload(category, includeId = false) {
  const tagline = String(category.tagline || category.description || '').trim();
  const payload = {
    name: String(category.name || '').trim(),
    badge: String(category.badge || '').trim(),
    tagline,
    description: tagline,
    image_url: String(category.image_url || '').trim(),
    display_order: Number(category.display_order ?? category.no ?? 0),
    is_active: category.is_active !== false
  };
  if (includeId) {
    payload.id = String(category.id || `cat-${Date.now()}`);
  }
  return payload;
}

export async function getCategories() {
  const rows = await supabaseRequest(
    "categories?select=*&order=display_order.asc,created_at.asc,name.asc",
    { requestKey: "categories_fetch" }
  );
  return Array.isArray(rows) ? rows.map(normalizeCategoryRow) : [];
}

export async function createCategory(category) {
  const payload = buildCategoryPayload(category, true);
  const res = await supabaseRequest("categories", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  const created = Array.isArray(res) ? res[0] : res;
  return normalizeCategoryRow(created || payload);
}

export async function updateCategory(id, category) {
  const payload = buildCategoryPayload(category, false);
  const res = await supabaseRequest(`categories?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
  const updated = Array.isArray(res) ? res[0] : res;
  return normalizeCategoryRow(updated || { id, ...payload });
}

export async function reassignMenuItemsCategory(oldCategoryName, newCategoryName) {
  if (!oldCategoryName || !newCategoryName || oldCategoryName === newCategoryName) return [];
  return supabaseRequest(`menu_items?category_id=eq.${encodeURIComponent(oldCategoryName)}`, {
    method: "PATCH",
    body: JSON.stringify({ category_id: newCategoryName })
  });
}

export async function deleteCategory(id) {
  return supabaseRequest(`categories?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
}

// ==========================================
// MENU ITEMS AJAX API (Deduplicated Reads)
// ==========================================
export async function getMenuItems() {
  return supabaseRequest("menu_items?select=*&order=name.asc", { requestKey: "menu_items_list" });
}

export async function createMenuItem(item) {
  return supabaseRequest("menu_items", {
    method: "POST",
    body: JSON.stringify(item)
  });
}

export async function updateMenuItem(id, item) {
  return supabaseRequest(`menu_items?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(item)
  });
}

export async function deleteMenuItem(id) {
  return supabaseRequest(`menu_items?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
}

// ==========================================
// ORDERS AJAX API (Deduplicated Reads)
// ==========================================
export async function getOrders() {
  return supabaseRequest("orders?select=*&order=created_at.desc&limit=150", { requestKey: "orders_list" });
}

export async function getOrderById(orderId) {
  const data = await supabaseRequest(`orders?select=*&or=(id.eq.${orderId},order_number.eq.${orderId})`, { requestKey: `order_${orderId}` });
  return Array.isArray(data) ? data[0] : data;
}

export async function getCustomerOrders(tableNumber) {
  return supabaseRequest(`orders?select=*&table_number=eq.${tableNumber}`, { requestKey: `orders_table_${tableNumber}` });
}

export async function updateOrderStatus(orderId, status) {
  return supabaseRequest(`orders?or=(id.eq.${orderId},order_number.eq.${orderId})`, {
    method: "PATCH",
    body: JSON.stringify({ order_status: status })
  });
}

export async function markBillPaid(orderId) {
  return supabaseRequest(`orders?or=(id.eq.${orderId},order_number.eq.${orderId})`, {
    method: "PATCH",
    body: JSON.stringify({ bill_status: "PAID" })
  });
}
