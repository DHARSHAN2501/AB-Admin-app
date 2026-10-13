import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { LayoutDashboard, UtensilsCrossed, Store, Users } from 'lucide-react';

export const Sidebar = () => {
  // Navigation Links: 1. Customer, 2. Dashboard (Center), 3. Menu Page
  const links = [
    { to: '/customers', label: 'Customers & Orders', icon: Users },
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/menu', label: 'Menu & Categories', icon: UtensilsCrossed },
  ];

  return (
    <>
      {/* Top Admin Header Bar - Prominent & Easy to Read */}
      <header className="bg-white/95 backdrop-blur-xl border-b border-slate-200/90 sticky top-0 z-40 shadow-xs">
        {/* Top Gradient Accent Line */}
        <div className="h-1.5 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-700 w-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-4">
          {/* Logo & Restaurant Title */}
          <Link to="/" className="flex items-center gap-3 sm:gap-4 text-decoration-none">
            <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-tr from-slate-900 via-blue-900 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-blue-500/25 shrink-0">
              <Store className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>
            <div>
              <h1 className="font-black text-slate-950 text-lg sm:text-2xl tracking-tight leading-none mb-1">
                Arunachala <span className="text-blue-700">Bhavan</span>
              </h1>
              <span className="text-[10px] sm:text-xs text-slate-500 font-extrabold tracking-wider uppercase block">
                Restaurant Executive
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-2">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/'}
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-2 text-decoration-none transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 text-white shadow-md shadow-blue-500/20'
                        : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100/80'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
      </header>

      {/* Compact & Slim Icon-Only Bottom Navigation Panel */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl border-t border-slate-200/90 z-50 py-1.5 sm:py-2 px-4 sm:px-10 flex items-center justify-around shadow-[0_-8px_20px_-4px_rgba(15,23,42,0.06)]">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              title={link.label}
              className={({ isActive }) =>
                `p-2.5 sm:p-3 rounded-xl text-decoration-none flex items-center justify-center transition-all duration-200 relative ${
                  isActive 
                    ? 'bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 text-white shadow-md shadow-blue-500/20 px-3.5 py-2' 
                    : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100/80'
                }`
              }
            >
              <Icon className="w-5 h-5 shrink-0" />
            </NavLink>
          );
        })}
      </nav>
    </>
  );
};
