import React, { useState, useEffect, useMemo } from 'react';
import { orderService } from '../services/adminService';
import { getOrderById } from '../services/api';
import { Modal } from '../components/Modal';
import { 
  Users, 
  Search, 
  Utensils, 
  Truck, 
  MapPin, 
  Phone, 
  Clock, 
  RefreshCw, 
  Receipt, 
  Eye, 
  X,
  ShoppingBag,
  Sparkles
} from 'lucide-react';

export const Customers = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'list'
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchingExact, setSearchingExact] = useState(false);

  // Fetch all orders
  const loadOrders = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await orderService.getOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading customer orders:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadOrders();
    const unsub = orderService.subscribeToOrders((event) => {
      if (event?.orders) {
        setOrders(event.orders);
      } else {
        loadOrders(false);
      }
    });
    return () => unsub();
  }, []);

  // Quick exact search handler (allows searching order by exact number even if not in first page)
  const handleExactSearch = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;

    const term = searchQuery.trim().replace(/^#/, '');
    setSearchingExact(true);
    try {
      const direct = await getOrderById(term);
      if (direct && (direct.id || direct.order_number)) {
        // Add or update in list and open details modal directly
        setOrders(prev => {
          const exists = prev.some(o => o.id === direct.id || o.order_number === direct.order_number);
          if (exists) return prev.map(o => (o.id === direct.id ? direct : o));
          return [direct, ...prev];
        });
        setSelectedOrder(direct);
        setIsModalOpen(true);
      }
    } catch (err) {
      console.warn('Direct order lookup completed:', err.message);
    } finally {
      setSearchingExact(false);
    }
  };

  // Filtered orders based on search query
  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase().replace(/^#/, '');

    if (!q) return orders;

    return orders.filter(order => {
      const orderNum = String(order.order_number || '').toLowerCase();
      const orderId = String(order.id || '').toLowerCase();
      const customer = String(order.customer_name || '').toLowerCase();
      const phone = String(order.phone_number || '').toLowerCase();
      const address = String(order.delivery_address || '').toLowerCase();
      const postal = String(order.postal_code || '').toLowerCase();
      const tblStr = String(order.table_number || '').toLowerCase();
      const notes = String(order.notes || '').toLowerCase();

      // Check dishes inside items
      const itemMatch = Array.isArray(order.items) && order.items.some(it => 
        String(it.item_name || it.name || '').toLowerCase().includes(q)
      );

      return (
        orderNum.includes(q) ||
        orderId.includes(q) ||
        customer.includes(q) ||
        phone.includes(q) ||
        address.includes(q) ||
        postal.includes(q) ||
        tblStr === q ||
        `table ${tblStr}`.includes(q) ||
        `t-${tblStr}`.includes(q) ||
        notes.includes(q) ||
        itemMatch
      );
    });
  }, [orders, searchQuery]);

  // Group filtered orders by table
  const tableGroupedOrders = useMemo(() => {
    const groups = new Map();

    filteredOrders.forEach(order => {
      const isDelivery = order.order_type === 'HOME_DELIVERY' || Number(order.table_number) === 0 || Boolean(order.delivery_address && order.delivery_address.trim().length > 0);
      const groupKey = isDelivery ? '0' : String(order.table_number || 1);

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          tableKey: groupKey,
          tableNumber: isDelivery ? 0 : Number(groupKey),
          isDelivery,
          orders: []
        });
      }
      groups.get(groupKey).orders.push(order);
    });

    // Sort: Table 1, 2, 3... and Home Delivery
    return Array.from(groups.values()).sort((a, b) => {
      if (a.isDelivery && !b.isDelivery) return 1;
      if (!a.isDelivery && b.isDelivery) return -1;
      return a.tableNumber - b.tableNumber;
    });
  }, [filteredOrders]);

  // Open modal helper
  const handleOpenDetails = (order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  // Helper formatting date
  const formatOrderTime = (isoString) => {
    if (!isoString) return 'Just now';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return isoString;
    }
  };

  // Status Badge Helper
  const renderStatusBadge = (status) => {
    const s = String(status || '').toUpperCase();
    switch (s) {
      case 'PENDING':
        return <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-black px-2.5 py-1 rounded-full whitespace-nowrap inline-flex items-center">⏳ Pending</span>;
      case 'PREPARING':
        return <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-black px-2.5 py-1 rounded-full whitespace-nowrap inline-flex items-center">🍳 Preparing</span>;
      case 'READY':
        return <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-black px-2.5 py-1 rounded-full whitespace-nowrap inline-flex items-center">🍲 Ready</span>;
      case 'SERVED':
      case 'DELIVERED':
      case 'COMPLETED':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-black px-2.5 py-1 rounded-full whitespace-nowrap inline-flex items-center">✓ {s}</span>;
      case 'CANCEL_REQUESTED':
        return <span className="bg-rose-50 text-rose-700 border border-rose-300 text-[11px] font-black px-2.5 py-1 rounded-full animate-pulse whitespace-nowrap inline-flex items-center">🚫 Cancel Req</span>;
      case 'CANCELLED':
        return <span className="bg-rose-100 text-rose-800 border border-rose-300 text-[11px] font-black px-2.5 py-1 rounded-full whitespace-nowrap inline-flex items-center">❌ Cancelled</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap inline-flex items-center">{status}</span>;
    }
  };

  // Payment Badge Helper
  const renderPaymentBadge = (status) => {
    const s = String(status || '').toUpperCase();
    if (s === 'PAID') {
      return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-black px-2.5 py-1 rounded-full inline-flex items-center gap-1 whitespace-nowrap">✓ Paid</span>;
    }
    if (s === 'REQUESTED') {
      return <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-black px-2.5 py-1 rounded-full animate-pulse inline-flex items-center gap-1 whitespace-nowrap">🔔 Bill Req</span>;
    }
    return <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap inline-flex items-center">Pending</span>;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Page Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 text-white rounded-3xl p-5 sm:p-6 border border-slate-800/80 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Title Block */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight flex items-center gap-2">
                <span>Customers &amp; Live Orders</span>
                <Sparkles className="w-4 h-4 text-cyan-400 fill-cyan-400/30" />
              </h1>
              <p className="text-xs sm:text-sm text-blue-200/80 font-medium mt-0.5">
                Real-time guest dining sessions &amp; live delivery orders
              </p>
            </div>
          </div>

          {/* Controls Row */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Live Sync Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-black whitespace-nowrap backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Live Realtime</span>
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => loadOrders(true)}
              disabled={refreshing}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/10 font-bold p-2.5 rounded-2xl text-xs flex items-center justify-center transition active:scale-95 disabled:opacity-50 cursor-pointer backdrop-blur-md"
              title="Refresh Orders"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            {/* View Mode Switcher */}
            <div className="flex items-center bg-white/10 p-1 rounded-2xl border border-white/10 backdrop-blur-md">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Table View
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                List View
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Enter Order # & Search Bar */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs">
        <form onSubmit={handleExactSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Order # (e.g. ORD5659), Customer Name, Phone, Address, Dish..."
              className="w-full bg-slate-50 border border-slate-200/90 rounded-2xl pl-11 pr-10 py-3 text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={searchingExact || !searchQuery.trim()}
            className="bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 hover:from-blue-800 hover:to-indigo-800 text-white font-black px-6 py-3 rounded-2xl text-xs shadow-md shadow-blue-500/20 transition active:scale-95 disabled:opacity-50 shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {searchingExact ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            <span>Search Order</span>
          </button>
        </form>
      </div>

      {/* Main Content: Table Grouped View OR List View */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/90 shadow-xs space-y-3">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
          <span className="text-xs font-black text-slate-500 uppercase tracking-wider block">
            Loading Customer Orders & Table Details...
          </span>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/90 shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-700 flex items-center justify-center mx-auto border border-blue-100">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900">No Customer Orders Matching Criteria</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery ? `No records found matching "${searchQuery}". Try searching by order number, table, or guest name.` : 'No customer orders have been recorded in the system yet.'}
            </p>
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-black px-4 py-2 rounded-2xl text-xs transition cursor-pointer"
            >
              Reset Search
            </button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        
        /* TABLE-WISE GROUPED VIEW */
        <div className="space-y-6">
          {tableGroupedOrders.map(group => {
            const tableTotalAmount = group.orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
            const isDelivery = group.isDelivery;

            return (
              <div 
                key={group.tableKey}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden transition hover:shadow-md"
              >
                {/* Table Header Banner */}
                <div className={`p-4 sm:p-5 flex items-center justify-between gap-3 border-b ${
                  isDelivery 
                    ? 'bg-gradient-to-r from-fuchsia-900 via-purple-900 to-indigo-950 text-white' 
                    : 'bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-900 text-white'
                }`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shrink-0">
                      {isDelivery ? <Truck className="w-5 h-5 text-fuchsia-300" /> : <Utensils className="w-5 h-5 text-cyan-300" />}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-base sm:text-lg font-black tracking-tight text-white truncate">
                        {isDelivery ? 'Home Delivery' : `Dining Table T - ${String(group.tableNumber).padStart(2, '0')}`}
                      </h2>
                      <p className="text-xs text-slate-300 font-medium mt-0.5 truncate">
                        {group.orders.length} Customer {group.orders.length === 1 ? 'Order' : 'Orders'} Recorded
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-300 font-extrabold uppercase tracking-wider block">Total Table Value</span>
                    <span className="text-base sm:text-xl font-black text-cyan-300">
                      ₹{tableTotalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Orders List inside this Table */}
                <div className="divide-y divide-slate-100">
                  {group.orders.map(order => {
                    const itemCount = (order.items || []).reduce((sum, it) => sum + (Number(it.quantity) || 1), 0);
                    const itemsPreview = (order.items || []).map(it => `${it.item_name || it.name} × ${it.quantity}`).slice(0, 3).join(', ');
                    const remainingItems = (order.items || []).length - 3;

                    return (
                      <div 
                        key={order.id || order.order_number} 
                        className="p-4 sm:p-5 hover:bg-slate-50/70 transition flex flex-col gap-3.5"
                      >
                        {/* Order & Customer Identity */}
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-black text-xs shrink-0 border border-blue-100 mt-0.5">
                            <Receipt className="w-5 h-5 text-blue-700" />
                          </div>

                          <div className="min-w-0 flex-1 space-y-2">
                            {/* Order # + Customer Name + Status & Payment Badges */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-black text-slate-900 text-sm tracking-tight">
                                  #{order.order_number || order.id}
                                </span>
                                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200/60">
                                  {order.customer_name || 'Guest'}
                                </span>
                              </div>

                              {/* Badges grouped together */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {renderStatusBadge(order.order_status)}
                                {renderPaymentBadge(order.bill_status)}
                              </div>
                            </div>

                            {/* Contact Details & Placement Time */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                              <span className="flex items-center gap-1 text-slate-400">
                                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {formatOrderTime(order.created_at)}
                              </span>
                              {order.phone_number && (
                                <span className="flex items-center gap-1 text-slate-700 font-bold">
                                  <Phone className="w-3.5 h-3.5 text-blue-600 shrink-0" /> {order.phone_number}
                                </span>
                              )}
                              {order.delivery_address && (
                                <span className="flex items-center gap-1 text-slate-700 font-medium">
                                  <MapPin className="w-3.5 h-3.5 text-fuchsia-600 shrink-0" /> {order.delivery_address} {order.postal_code ? `(${order.postal_code})` : ''}
                                </span>
                              )}
                            </div>

                            {/* Ordered Dishes Preview */}
                            <p className="text-xs text-slate-600 truncate max-w-xl">
                              <span className="font-bold text-slate-800">{itemCount} items: </span>
                              <span className="text-slate-600">{itemsPreview}</span>
                              {remainingItems > 0 && <span className="text-blue-600 font-bold"> +{remainingItems} more</span>}
                            </p>
                          </div>
                        </div>

                        {/* Order Pricing & Details Action */}
                        <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                          <div>
                            <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Amount</span>
                            <span className="text-base sm:text-lg font-black text-slate-900">
                              ₹{Number(order.total_amount || 0).toFixed(2)}
                            </span>
                          </div>

                          <button
                            onClick={() => handleOpenDetails(order)}
                            className="bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 hover:from-blue-800 hover:to-indigo-800 text-white font-black px-4 py-2 rounded-2xl text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition active:scale-95 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Customer</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        
        /* ALL CUSTOMERS LIST / TABLE VIEW */
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <th className="py-4 px-4">Order #</th>
                  <th className="py-4 px-4">Table / Type</th>
                  <th className="py-4 px-4">Customer Name</th>
                  <th className="py-4 px-4">Contact / Address</th>
                  <th className="py-4 px-4">Items Ordered</th>
                  <th className="py-4 px-4">Kitchen Status</th>
                  <th className="py-4 px-4">Payment</th>
                  <th className="py-4 px-4">Amount</th>
                  <th className="py-4 px-4">Time</th>
                  <th className="py-4 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map(order => {
                  const isDelivery = order.order_type === 'HOME_DELIVERY' || Number(order.table_number) === 0 || Boolean(order.delivery_address);
                  const itemCount = (order.items || []).reduce((sum, it) => sum + (Number(it.quantity) || 1), 0);

                  return (
                    <tr key={order.id || order.order_number} className="hover:bg-slate-50/70 transition">
                      
                      {/* Order # */}
                      <td className="py-4 px-4 font-black text-slate-900 whitespace-nowrap">
                        <span className="bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 font-mono text-[11px]">
                          #{order.order_number || order.id}
                        </span>
                      </td>

                      {/* Table / Channel */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {isDelivery ? (
                          <span className="bg-fuchsia-50 text-fuchsia-800 border border-fuchsia-200 font-black px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1 w-fit">
                            <Truck className="w-3 h-3" /> Delivery
                          </span>
                        ) : (
                          <span className="bg-blue-50 text-blue-800 border border-blue-200 font-black px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1 w-fit">
                            <Utensils className="w-3 h-3" /> T - {String(order.table_number || 1).padStart(2, '0')}
                          </span>
                        )}
                      </td>

                      {/* Customer Name */}
                      <td className="py-4 px-4 font-black text-slate-900 whitespace-nowrap">
                        <span className="text-slate-900">{order.customer_name || 'Guest'}</span>
                      </td>

                      {/* Contact / Delivery Address */}
                      <td className="py-4 px-4 max-w-xs">
                        {order.phone_number && (
                          <div className="font-bold text-slate-800 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-blue-600" /> {order.phone_number}
                          </div>
                        )}
                        {order.delivery_address ? (
                          <div className="text-slate-500 truncate" title={`${order.delivery_address} ${order.postal_code || ''}`}>
                            {order.delivery_address}
                          </div>
                        ) : (
                          <span className="text-slate-400">Dine-in at table</span>
                        )}
                      </td>

                      {/* Items Ordered */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                          {itemCount} {itemCount === 1 ? 'dish' : 'dishes'}
                        </span>
                      </td>

                      {/* Kitchen Status */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {renderStatusBadge(order.order_status)}
                      </td>

                      {/* Payment Status */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {renderPaymentBadge(order.bill_status)}
                      </td>

                      {/* Total Amount */}
                      <td className="py-4 px-4 font-black text-slate-900 whitespace-nowrap">
                        ₹{Number(order.total_amount || 0).toFixed(2)}
                      </td>

                      {/* Order Time */}
                      <td className="py-4 px-4 text-slate-400 whitespace-nowrap text-[11px]">
                        {formatOrderTime(order.created_at)}
                      </td>

                      {/* Action */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleOpenDetails(order)}
                          className="bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-black px-3 py-1.5 rounded-xl text-xs transition inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Details</span>
                        </button>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* COMPREHENSIVE CUSTOMER ORDER DETAILS MODAL */}
      {selectedOrder && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={`Customer Order Details • #${selectedOrder.order_number || selectedOrder.id}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-6">
            
            {/* Top Customer Summary Card */}
            <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200/90 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Customer Name</span>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                    {selectedOrder.customer_name || 'Guest'}
                    {renderStatusBadge(selectedOrder.order_status)}
                    {renderPaymentBadge(selectedOrder.bill_status)}
                  </h3>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Order Dining Spot</span>
                  <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-blue-100 text-blue-800 inline-block">
                    {selectedOrder.order_type === 'HOME_DELIVERY' || Number(selectedOrder.table_number) === 0 || Boolean(selectedOrder.delivery_address)
                      ? '🏠 Home Delivery (Singapore)'
                      : `🍽️ Dine-In Table T - ${String(selectedOrder.table_number || 1).padStart(2, '0')}`}
                  </span>
                </div>
              </div>

              {/* Grid of details: Phone, Address, Time, Order ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                
                {selectedOrder.phone_number && (
                  <div>
                    <span className="text-slate-400 font-bold block mb-0.5">Phone Number:</span>
                    <a 
                      href={`tel:${selectedOrder.phone_number}`}
                      className="text-blue-700 font-black flex items-center gap-1 hover:underline text-decoration-none"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>{selectedOrder.phone_number}</span>
                    </a>
                  </div>
                )}

                <div>
                  <span className="text-slate-400 font-bold block mb-0.5">Order Placement Time:</span>
                  <div className="font-bold text-slate-700 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{formatOrderTime(selectedOrder.created_at)}</span>
                  </div>
                </div>

                {selectedOrder.delivery_address && (
                  <div className="sm:col-span-2">
                    <span className="text-slate-400 font-bold block mb-0.5">Delivery Destination Address:</span>
                    <div className="font-bold text-slate-800 flex items-start gap-1">
                      <MapPin className="w-3.5 h-3.5 text-fuchsia-600 shrink-0 mt-0.5" />
                      <span>
                        {selectedOrder.delivery_address}
                        {selectedOrder.postal_code ? ` (Postal Code: ${selectedOrder.postal_code})` : ''}
                      </span>
                    </div>
                  </div>
                )}

                {selectedOrder.notes && (
                  <div className="sm:col-span-2 bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-amber-900">
                    <span className="font-black text-[11px] block uppercase tracking-wider mb-0.5">Customer Kitchen Notes:</span>
                    <p className="font-medium text-xs">{selectedOrder.notes}</p>
                  </div>
                )}

              </div>
            </div>

            {/* Itemized Dishes Breakdown */}
            <div>
              <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-blue-700" /> Ordered Dishes & Items
              </h4>

              <div className="border border-slate-200/90 rounded-2xl overflow-hidden divide-y divide-slate-100 text-xs">
                {(selectedOrder.items || []).map((item, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="font-bold text-slate-900 block">
                        {item.item_name || item.name}
                      </span>
                      {item.special_instruction && (
                        <span className="text-[11px] text-amber-700 font-medium italic block">
                          Note: {item.special_instruction}
                        </span>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-slate-500 mr-2">
                        {item.quantity} × ₹{Number(item.price || 0).toFixed(2)}
                      </span>
                      <span className="font-black text-slate-900">
                        ₹{(Number(item.price || 0) * Number(item.quantity || 1)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bill Financial Summary */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/90 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 font-medium">
                <span>Subtotal</span>
                <span>₹{Number(selectedOrder.subtotal || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600 font-medium">
                <span>GST / Tax (5%)</span>
                <span>₹{Number(selectedOrder.tax || 0).toFixed(2)}</span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-sm font-black text-slate-900">
                <span>Grand Total Amount</span>
                <span className="text-lg bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 bg-clip-text text-transparent">
                  ₹{Number(selectedOrder.total_amount || 0).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-5 py-2.5 rounded-xl text-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </Modal>
      )}

      {/* Clearance spacer for bottom navigation panel */}
      <div className="h-16 w-full" aria-hidden="true" />

    </div>
  );
};

export default Customers;
