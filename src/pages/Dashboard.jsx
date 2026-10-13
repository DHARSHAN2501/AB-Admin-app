import React, { useState, useEffect } from 'react';

import { orderService, tableService } from '../services/adminService';
import { 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid, Legend 
} from 'recharts';
import { IndianRupee, ShoppingBag, TrendingUp, Truck, XCircle, PieChart as PieIcon, BarChart2, Sparkles, Clock } from 'lucide-react';
import { MALE_CHEF_IMAGE_BASE64 } from '../assets/male_chef_b64';

export const AdminDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [tables, setTables] = useState([]);

  const loadData = async (providedOrders = null) => {
    const ords = providedOrders || await orderService.getOrders();
    const tbls = await tableService.getTables();
    setOrders(ords || []);
    setTables(tbls || []);
  };

  useEffect(() => {
    loadData();
    const unsub = orderService.subscribeToOrders((event) => loadData(event?.orders || null));
    return () => unsub();
  }, []);

  // Paid (Payment Successful in Billing App) Orders & Memoized Analytics Datasets
  const { 
    paidOrders, 
    totalRevenue, 
    homeDeliveryOrders, 
    cancelledOrders, 
    activeProcessingOrders, 
    revenueTrendData, 
    popularFoodData, 
    categoryShareData 
  } = React.useMemo(() => {
    // Only count orders whose bill has been successfully paid in Billing App
    const paid = orders.filter(o => 
      String(o.bill_status || '').toUpperCase() === 'PAID' &&
      o.order_status !== 'CANCELLED'
    );

    // Cancelled orders and requests: immediately update
    const cancelled = orders.filter(o => 
      o.order_status === 'CANCELLED' || o.order_status === 'CANCEL_REQUESTED'
    );

    // Active in-kitchen / dine-in orders currently processing (awaiting payment)
    const activeProcessing = orders.filter(o => 
      o.order_status !== 'CANCELLED' && 
      o.order_status !== 'CANCEL_REQUESTED' && 
      String(o.bill_status || '').toUpperCase() !== 'PAID'
    );

    // Revenue only accumulates from completed payments in Billing App
    const revenue = paid.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    
    // Home Delivery orders count only updates after payment success
    const homeDel = paid.filter(o => 
      o.order_type === 'HOME_DELIVERY' || Number(o.table_number) === 0 || Boolean(o.delivery_address && String(o.delivery_address).trim().length > 0)
    );

    // Revenue Trend calculated strictly from paid orders
    const hoursMap = { '11 AM': 0, '1 PM': 0, '3 PM': 0, '5 PM': 0, '7 PM': 0, '9 PM': 0 };
    paid.forEach(o => {
      const amt = Number(o.total_amount || 0);
      const created = o.created_at ? new Date(o.created_at) : new Date();
      const hr = created.getHours();
      if (hr < 12) hoursMap['11 AM'] += amt;
      else if (hr < 14) hoursMap['1 PM'] += amt;
      else if (hr < 16) hoursMap['3 PM'] += amt;
      else if (hr < 18) hoursMap['5 PM'] += amt;
      else if (hr < 20) hoursMap['7 PM'] += amt;
      else hoursMap['9 PM'] += amt;
    });

    const revTrend = [
      { time: '11 AM', revenue: hoursMap['11 AM'] },
      { time: '1 PM', revenue: hoursMap['1 PM'] },
      { time: '3 PM', revenue: hoursMap['3 PM'] },
      { time: '5 PM', revenue: hoursMap['5 PM'] },
      { time: '7 PM', revenue: hoursMap['7 PM'] },
      { time: '9 PM', revenue: hoursMap['9 PM'] },
    ];

    // Popular Food calculated strictly from paid orders
    const itemCounts = {};
    paid.forEach(o => {
      const itemsList = o.items || [];
      itemsList.forEach(it => {
        const name = it.item_name || it.name || 'Special Dish';
        const qty = Number(it.quantity || 1);
        itemCounts[name] = (itemCounts[name] || 0) + qty;
      });
    });

    const popFood = Object.entries(itemCounts)
      .map(([name, orders]) => ({ name, orders }))
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 5);

    // Category Share calculated strictly from paid orders
    const catMap = { 'Main Course': 0, 'Starters': 0, 'Breads & Rice': 0, 'Beverages': 0 };
    paid.forEach(o => {
      const itemsList = o.items || [];
      itemsList.forEach(it => {
        const cat = String(it.category_id || it.category || 'Main Course');
        const price = Number(it.price || 100) * Number(it.quantity || 1);
        if (cat.toLowerCase().includes('starter') || cat.toLowerCase().includes('tandoori')) {
          catMap['Starters'] += price;
        } else if (cat.toLowerCase().includes('bread') || cat.toLowerCase().includes('rice') || cat.toLowerCase().includes('biryani')) {
          catMap['Breads & Rice'] += price;
        } else if (cat.toLowerCase().includes('drink') || cat.toLowerCase().includes('beverage') || cat.toLowerCase().includes('dessert')) {
          catMap['Beverages'] += price;
        } else {
          catMap['Main Course'] += price;
        }
      });
    });

    const totalCatSales = Object.values(catMap).reduce((a, b) => a + b, 0);
    const catShare = totalCatSales > 0 ? [
      { name: 'Main Course', value: Math.round((catMap['Main Course'] / totalCatSales) * 100) || 0, color: '#3b82f6' },
      { name: 'Starters', value: Math.round((catMap['Starters'] / totalCatSales) * 100) || 0, color: '#10b981' },
      { name: 'Breads & Rice', value: Math.round((catMap['Breads & Rice'] / totalCatSales) * 100) || 0, color: '#f59e0b' },
      { name: 'Beverages', value: Math.round((catMap['Beverages'] / totalCatSales) * 100) || 0, color: '#8b5cf6' },
    ] : [
      { name: 'Main Course', value: 0, color: '#3b82f6' },
      { name: 'Starters', value: 0, color: '#10b981' },
      { name: 'Breads & Rice', value: 0, color: '#f59e0b' },
      { name: 'Beverages', value: 0, color: '#8b5cf6' },
    ];

    return {
      paidOrders: paid,
      totalRevenue: revenue,
      homeDeliveryOrders: homeDel,
      cancelledOrders: cancelled,
      activeProcessingOrders: activeProcessing,
      revenueTrendData: revTrend,
      popularFoodData: popFood,
      categoryShareData: catShare
    };
  }, [orders]);

  const categoryDistribution = categoryShareData;

  return (
    <div className="container-fluid p-0 space-y-5 sm:space-y-6 max-w-7xl mx-auto">

      {/* Executive Overview Hero Banner Card */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 text-white rounded-3xl p-5 sm:p-6 border border-slate-800/80 shadow-xl flex items-center justify-between gap-4 overflow-hidden relative">
        <div className="space-y-2 z-10">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            Executive Overview <Sparkles className="w-5 h-5 text-cyan-400 fill-cyan-400/30 animate-pulse" />
          </h2>
          <p className="text-blue-200/80 text-xs sm:text-sm font-medium max-w-md">
            Real-time revenue tracking, order analytics & operational performance.
          </p>

        </div>

        <div className="w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 shrink-0 flex items-center justify-center -my-4 -mr-2 sm:-mr-4 z-10">
          <img 
            src={MALE_CHEF_IMAGE_BASE64} 
            alt="Admin Male Chef" 
            className="w-full h-full object-contain filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] hover:scale-105 transition duration-300"
          />
        </div>
      </div>

      {/* Top 5 Key Performance Indicator (KPI) Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
        
        {/* KPI Card 1: TOTAL REVENUE */}
        <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-emerald-400/40 shadow-lg shadow-emerald-600/20 flex flex-col justify-between h-100 transform hover:scale-102 transition duration-300">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-[10px] sm:text-xs font-black text-emerald-100 uppercase tracking-wider">Total Revenue</span>
            <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-white/20 text-white backdrop-blur-md flex items-center justify-center shadow-xs shrink-0">
              <IndianRupee className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-white" />
            </div>
          </div>
          <div className="text-xl sm:text-3xl font-black text-white tracking-tight">₹{totalRevenue.toFixed(0)}</div>
          <span className="text-[10px] sm:text-xs text-emerald-100 font-bold flex items-center gap-1 mt-1 sm:mt-2">
            <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-200" /> Settled Revenue (Paid)
          </span>
        </div>

        {/* KPI Card 2: TOTAL ORDERS */}
        <div className="bg-gradient-to-br from-blue-600 via-sky-600 to-blue-700 text-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-blue-400/40 shadow-lg shadow-blue-600/20 flex flex-col justify-between h-100 transform hover:scale-102 transition duration-300">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-[10px] sm:text-xs font-black text-blue-100 uppercase tracking-wider">Total Orders</span>
            <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-white/20 text-white backdrop-blur-md flex items-center justify-center shadow-xs shrink-0">
              <ShoppingBag className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-white" />
            </div>
          </div>
          <div className="text-xl sm:text-3xl font-black text-white tracking-tight">{paidOrders.length}</div>
          <span className="text-[10px] sm:text-xs text-blue-100 font-medium block mt-1 sm:mt-2">Completed & Paid</span>
        </div>

        {/* KPI Card 3: CURRENT PROCESSING (New Dedicated Card with Unique Sunset Amber / Tangerine Theme) */}
        <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 text-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-amber-300/40 shadow-lg shadow-amber-500/25 flex flex-col justify-between h-100 transform hover:scale-102 transition duration-300">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-[10px] sm:text-xs font-black text-amber-100 uppercase tracking-wider">Current Processing</span>
            <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-white/20 text-white backdrop-blur-md flex items-center justify-center shadow-xs shrink-0">
              <Clock className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-white" />
            </div>
          </div>
          <div className="text-xl sm:text-3xl font-black text-white tracking-tight">{activeProcessingOrders.length}</div>
          <span className="text-[10px] sm:text-xs text-amber-100 font-bold flex items-center gap-1.5 mt-1 sm:mt-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-200 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            Awaiting Payment
          </span>
        </div>

        {/* KPI Card 4: HOME DELIVERY */}
        <div className="bg-gradient-to-br from-fuchsia-600 via-pink-600 to-purple-700 text-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-fuchsia-300/40 shadow-lg shadow-fuchsia-600/25 flex flex-col justify-between h-100 transform hover:scale-102 transition duration-300">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-[10px] sm:text-xs font-black text-fuchsia-100 uppercase tracking-wider">Home Delivery</span>
            <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-white/20 text-white backdrop-blur-md flex items-center justify-center shadow-xs shrink-0">
              <Truck className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-white" />
            </div>
          </div>
          <div className="text-xl sm:text-3xl font-black text-white tracking-tight">{homeDeliveryOrders.length}</div>
          <span className="text-[10px] sm:text-xs text-fuchsia-100 font-bold block mt-1 sm:mt-2">Paid Delivery Orders</span>
        </div>

        {/* KPI Card 5: CANCELLED ORDERS */}
        <div className="col-span-2 md:col-span-1 lg:col-span-1 bg-gradient-to-br from-rose-600 via-red-600 to-pink-700 text-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-rose-400/40 shadow-lg shadow-rose-600/20 flex flex-col justify-between h-100 transform hover:scale-102 transition duration-300">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-[10px] sm:text-xs font-black text-rose-100 uppercase tracking-wider">Cancelled Orders</span>
            <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-white/20 text-white backdrop-blur-md flex items-center justify-center shadow-xs shrink-0">
              <XCircle className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-white" />
            </div>
          </div>
          <div className="text-xl sm:text-3xl font-black text-white tracking-tight">{cancelledOrders.length}</div>
          <span className="text-[10px] sm:text-xs text-rose-100 font-bold block mt-1 sm:mt-2">Cancellations</span>
        </div>

      </div>



      {/* Analytics Grid: Interactive Charts */}
      <div className="row g-4">

        {/* Chart 1: Hourly Sales Revenue Trend */}
        <div className="col-12 col-lg-6">
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs h-100 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-900 text-sm sm:text-base tracking-tight flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" /> Hourly Sales Revenue Trend (₹)
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">Real-time hourly earnings trajectory</p>
              </div>
            </div>
            <div className="w-100" style={{ height: '240px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrendData}>
                  <defs>
                    <linearGradient id="blueRevGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip formatter={(val) => [`₹${val}`, 'Revenue']} />
                  <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#blueRevGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Chart 2: Top Selling Food Items */}
        <div className="col-12 col-lg-6">
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs h-100 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-900 text-sm sm:text-base tracking-tight flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-indigo-600" /> Top Selling Food Items
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">Highest order volume dishes</p>
              </div>
            </div>
            <div className="w-100" style={{ height: '240px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={popularFoodData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis dataKey="name" type="category" stroke="#475569" fontSize={11} tickLine={false} width={115} />
                  <Tooltip formatter={(val) => [`${val} orders`, 'Volume']} />
                  <Bar dataKey="orders" fill="#6366f1" radius={[0, 8, 8, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Chart 3: Category Revenue Distribution */}
        <div className="col-12 col-lg-12">
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-900 text-sm sm:text-base tracking-tight flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-emerald-600" /> Category Share & Sales Mix
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">Revenue breakdown by menu section</p>
              </div>
            </div>
            <div className="w-100 flex items-center justify-center" style={{ height: '260px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {categoryDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => [`${val}%`, 'Revenue Share']} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

      </div>

      {/* Clearance spacer for bottom navigation panel */}
      <div className="h-16 w-full" aria-hidden="true" />

    </div>
  );
};
