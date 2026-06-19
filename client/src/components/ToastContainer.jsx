import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useToastStore } from '../store/useToastStore';

const icons = {
  success: <CheckCircle className="w-5 h-5 text-emerald-500" />,
  error: <AlertCircle className="w-5 h-5 text-red-500" />,
  info: <Info className="w-5 h-5 text-blue-500" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-500" />
};

const styles = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800'
};

export const ToastContainer = () => {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  return (
    // Fixed overlay at the bottom right. pointer-events-none prevents it from blocking clicks behind it
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div 
          key={toast.id}
          // Re-enable pointer events on the actual toast so they can click the X
          className={`pointer-events-auto flex items-start gap-3 p-4 rounded-lg border shadow-lg w-80 transform transition-all duration-300 ${styles[toast.type]}`}
        >
          <div className="flex-shrink-0 mt-0.5">{icons[toast.type]}</div>
          <p className="flex-1 text-sm font-medium">{toast.message}</p>
          <button 
            onClick={() => removeToast(toast.id)} 
            className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};