import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-md' }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className={`bg-white rounded-2xl shadow-2xl border border-slate-100 w-full ${maxWidth} transform transition-all overflow-hidden relative`}
        onClick={e => e.stopPropagation()}
      >
        {title ? (
          <div className="px-6 py-4 border-b flex items-center justify-between bg-slate-50">
            <h3 className="font-bold text-slate-800 text-lg">{title}</h3>
            <button 
              type="button"
              onClick={onClose} 
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-200 transition cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <button 
            type="button"
            onClick={onClose} 
            className="absolute top-3 right-3 z-50 bg-slate-900/60 hover:bg-slate-900/80 text-white p-2 rounded-full backdrop-blur-md transition shadow-md cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

