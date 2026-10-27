import React from 'react';
import { AlertTriangle, HelpCircle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  loading = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  let icon = <HelpCircle className="w-6 h-6 text-[#6D4C41]" />;
  let btnClass = 'bg-[#4E342E] hover:bg-[#3E2723] text-white';

  if (variant === 'danger') {
    icon = <AlertTriangle className="w-6 h-6 text-rose-600" />;
    btnClass = 'bg-rose-600 hover:bg-rose-700 text-white';
  } else if (variant === 'warning') {
    icon = <AlertTriangle className="w-6 h-6 text-amber-600" />;
    btnClass = 'bg-amber-600 hover:bg-amber-700 text-white';
  }

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white border border-[#D7CCC8] rounded-3xl w-full max-w-md p-6 shadow-2xl text-[#2D1E18] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#EFEBE9]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-[#F7F2EF] border border-[#D7CCC8]/60 shrink-0">
              {icon}
            </div>
            <h3 className="text-base font-bold text-[#2D1E18]">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            disabled={loading}
            className="text-[#8D6E63] hover:text-[#2D1E18] p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-[#5D4037] leading-relaxed">{message}</p>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6D4C41] hover:text-[#2D1E18] hover:bg-[#F7F2EF] transition"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-5 py-2 rounded-xl text-xs font-semibold shadow-md transition disabled:opacity-50 flex items-center gap-2 ${btnClass}`}
          >
            {loading && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
