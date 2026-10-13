import React from 'react';

export const StatusBadge = ({ status, type = 'order' }) => {
  if (type === 'table') {
    switch (status) {
      case 'AVAILABLE': return <span className="bg-emerald-100 text-emerald-800 border text-xs px-2.5 py-1 rounded-full font-bold">🟢 AVAILABLE</span>;
      case 'OCCUPIED': return <span className="bg-rose-100 text-rose-800 border text-xs px-2.5 py-1 rounded-full font-bold">🔴 OCCUPIED</span>;
      case 'BILL_REQUESTED': return <span className="bg-amber-100 text-amber-800 border text-xs px-2.5 py-1 rounded-full font-bold animate-pulse">🔔 BILL REQUESTED</span>;
      default: return <span className="bg-gray-100 text-gray-800 text-xs px-2.5 py-1 rounded-full">{status}</span>;
    }
  }

  if (type === 'bill') {
    switch (status) {
      case 'REQUESTED': return <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded font-bold animate-pulse">🔔 Requested</span>;
      case 'PAID': return <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded font-bold">✓ PAID</span>;
      default: return <span className="bg-gray-100 text-gray-800 text-xs px-2 py-0.5 rounded">{status}</span>;
    }
  }

  if (status === 'CANCEL_REQUESTED') return <span className="bg-rose-100 text-rose-800 border border-rose-300 text-xs px-2.5 py-1 rounded-full font-bold animate-pulse">🚫 Cancel Requested</span>;
  if (status === 'CANCELLED') return <span className="bg-rose-100 text-rose-800 border border-rose-300 text-xs px-2.5 py-1 rounded-full font-bold">❌ Cancelled</span>;

  return <span className="bg-gray-100 text-gray-800 text-xs px-2.5 py-1 rounded-full font-semibold">{status}</span>;
};
