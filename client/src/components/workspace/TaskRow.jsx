import { useState } from 'react';
import { Check, MoreHorizontal, Calendar, GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import apiClient from '../../api/client';

export const TaskRow = ({ task, onUpdate, onClick }) => {
  // Optimistic UI state for instant visual feedback
  const [isDone, setIsDone] = useState(task.status === 'DONE');
  const [isUpdating, setIsUpdating] = useState(false);

  // --- DND KIT: SORTABLE SETUP ---
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: 'Task',
      task, // Pass the full task data to the monitor
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  // -------------------------------

  const toggleStatus = async (e) => {
    e.stopPropagation(); // Prevents opening the detail panel
    const newStatus = isDone ? 'TODO' : 'DONE';
    
    // 1. Instantly update UI
    setIsDone(!isDone);
    setIsUpdating(true);

    // 2. Sync with backend
    try {
      await apiClient.put(`/tasks/${task.id}`, { status: newStatus });
      if (onUpdate) onUpdate(task.id, { status: newStatus });
    } catch (error) {
      console.error("Failed to update task", error);
      setIsDone(isDone); // Revert UI if the network fails
    } finally {
      setIsUpdating(false);
    }
  };

  // Helper for Priority Badge Colors
  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-50 text-red-700 border-red-200';
      case 'HIGH': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'MEDIUM': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'LOW': return 'bg-slate-50 text-slate-600 border-slate-200';
      default: return 'hidden';
    }
  };

  return (
    <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onClick={onClick}
        // Change styles when dragging (creates a ghost effect where the task used to be)
        className={`group flex items-center justify-between p-2 rounded-md border transition-all bg-white cursor-pointer mb-1 ${
          isDragging 
            ? 'opacity-30 border-blue-400 shadow-sm' 
            : 'border-transparent hover:border-slate-200 hover:bg-slate-50 hover:shadow-sm'
        }`}
    >
      
      <div className="flex items-center gap-3 overflow-hidden w-full">
        
        {/* Drag Handle Icon (Visible on hover) */}
        <div className="text-slate-300 group-hover:text-slate-400 cursor-grab active:cursor-grabbing transition-colors flex-shrink-0">
          <GripVertical className="w-4 h-4" />
        </div>

        {/* 1. Custom Checkbox */}
        <button
          onClick={toggleStatus}
          disabled={isUpdating}
          className={`flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-colors duration-200 ${
            isDone 
              ? 'bg-emerald-500 border-emerald-500' 
              : 'border-slate-300 hover:border-emerald-500 bg-white'
          }`}
        >
          <Check 
            className={`w-3 h-3 text-white transition-opacity duration-200 ${isDone ? 'opacity-100' : 'opacity-0'}`} 
            strokeWidth={3} 
          />
        </button>

        {/* 2. Title with Strikethrough Animation */}
        <span 
          className={`text-sm truncate transition-all duration-250 ease-out ${
            isDone ? 'line-through text-slate-400' : 'text-slate-700'
          }`}
        >
          {task.title}
        </span>
        
        {/* 3. Metadata Chips (Hidden on tiny screens) */}
        <div className={`hidden sm:flex items-center gap-2 ml-auto flex-shrink-0 transition-opacity ${isDone ? 'opacity-50' : 'opacity-100'}`}>
          
          {/* Priority Badge */}
          {task.priority && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wide ${getPriorityBadge(task.priority)}`}>
              {task.priority}
            </span>
          )}

          {/* Due Date Chip */}
          {task.dueDate && (
            <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border border-slate-200 text-slate-500 bg-slate-50">
              <Calendar className="w-3 h-3" />
              {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          )}

          {/* Tag Pills */}
          {task.tags && task.tags.length > 0 && (
            <div className="flex items-center gap-1">
              {task.tags.slice(0, 2).map((tag, idx) => (
                 <span key={idx} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-md border border-slate-200">
                   #{tag}
                 </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4. Hover Context Menu (⋯) */}
      <div className="relative">
        <button 
          className="opacity-0 group-hover:opacity-100 p-1 ml-2 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700 transition-all flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            // Toggle local state to show/hide menu
            const menu = e.currentTarget.nextElementSibling;
            menu.classList.toggle('hidden');
          }}
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
        
        {/* Simple Dropdown Menu */}
        <div className="hidden absolute right-0 top-6 w-32 bg-white rounded-lg shadow-lg border border-slate-200 z-10 p-1">
          <button 
            onClick={async (e) => {
              e.stopPropagation();
              try {
                await apiClient.patch(`/tasks/${task.id}/archive`);
                onUpdate(task.id, { isArchived: !task.isArchived });
              } catch (err) { console.error("Archive failed", err); }
            }}
            className="w-full text-left text-sm px-3 py-2 hover:bg-slate-50 rounded text-slate-700"
          >
            {task.isArchived ? 'Unarchive' : 'Archive'}
          </button>
        </div>
      </div>
      
    </div>
  );
};