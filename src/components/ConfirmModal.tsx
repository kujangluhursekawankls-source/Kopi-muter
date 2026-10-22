import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDangerous?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Hapus',
  cancelLabel = 'Batal',
  isDangerous = true,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-[#EADBCC]">
        <div className="flex items-center gap-3 mb-3">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
              isDangerous ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
            }`}
          >
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-[#24140B] font-serif">{title}</h3>
        </div>

        <p className="text-sm text-[#4A382C] leading-relaxed mb-6">{message}</p>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 px-4 rounded-xl border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50 active:bg-gray-100 transition min-h-[46px]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 py-3 px-4 rounded-xl text-white font-semibold text-sm transition min-h-[46px] shadow-sm ${
              isDangerous
                ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800'
                : 'bg-[#24140B] hover:bg-[#3D2314]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
