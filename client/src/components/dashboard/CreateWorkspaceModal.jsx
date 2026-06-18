import { useState } from 'react';
import { X, Loader2, Check } from 'lucide-react';
import { useForm } from 'react-hook-form';
import apiClient from '../../api/client';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#10b981', '#06b6d4', '#64748b'];

export const CreateWorkspaceModal = ({ isOpen, onClose, onSuccess }) => {
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const { register, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm();

  if (!isOpen) return null;

  const onSubmit = async (data) => {
    try {
      const res = await apiClient.post('/workspaces', { ...data, color: selectedColor });
      reset();
      onSuccess(res.data);
      onClose();
    } catch (error) {
      console.error("Failed to create workspace", error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md relative z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">Create Workspace</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:bg-slate-100 rounded-md transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
            <input
              {...register('name', { required: "Name is required" })}
              autoFocus
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Engineering Team"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description (Optional)</label>
            <textarea
              {...register('description')}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="What is this workspace for?"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Accent Color</label>
            <div className="flex gap-2">
              {COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                  style={{ backgroundColor: color }}
                >
                  {selectedColor === color && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-100 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Workspace
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};