import React from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export const ModalUI = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Notification",
  message,
  type = "info", // "info" | "success" | "confirm" | "danger"
  confirmText = "Confirm",
  cancelText = "Cancel",
  okText = "OK"
}) => {
  if (!isOpen) return null;

  const isConfirmType = type === 'confirm' || type === 'danger';

  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto mb-4 shadow-xs">
            <CheckCircle2 className="w-7 h-7" />
          </div>
        );
      case 'danger':
        return (
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center mx-auto mb-4 shadow-xs">
            <AlertTriangle className="w-7 h-7" />
          </div>
        );
      case 'confirm':
        return (
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center mx-auto mb-4 shadow-xs">
            <AlertTriangle className="w-7 h-7" />
          </div>
        );
      default:
        return (
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mx-auto mb-4 shadow-xs">
            <Info className="w-7 h-7" />
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-2xl max-w-sm w-full text-center relative z-50 transform transition-all scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {getIcon()}

        <h3 className="text-lg font-black text-slate-900 tracking-tight mb-1.5">
          {title}
        </h3>

        <p className="text-slate-600 text-xs sm:text-sm font-medium leading-relaxed mb-6">
          {message}
        </p>

        {isConfirmType ? (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-2xl text-xs transition active:scale-95"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={() => {
                if (onConfirm) onConfirm();
                onClose();
              }}
              className={`flex-1 text-white font-bold py-3 px-4 rounded-2xl text-xs transition shadow-md active:scale-95 ${
                type === 'danger' 
                  ? 'bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 shadow-rose-500/20' 
                  : 'bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 shadow-blue-500/20'
              }`}
            >
              {confirmText}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 hover:opacity-95 text-white font-black py-3.5 px-6 rounded-2xl text-xs tracking-wide shadow-md shadow-blue-500/20 transition active:scale-95"
          >
            {okText}
          </button>
        )}
      </div>
    </div>
  );
};
