import { useState, useEffect, useMemo } from 'react';
import { ChevronRight, FolderOpen, Plus, Loader2, GripVertical } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// 1. Import dnd-kit core and sortable packages
import { useDndMonitor } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import apiClient from '../../api/client';
import { hexToRgb } from '../../utils/colors';
import { TaskRow } from './TaskRow';
import { useSocketEvent } from '../../hooks/useSocket';

const taskSchema = z.object({
  title: z.string().min(1, "Task title is required").max(255)
});

export const SectionBlock = ({ section, onOpenTask, filters = { status: [], priority: [], tag: [] } }) => {
  const [isCollapsed, setIsCollapsed] = useState(section.collapsed || false);
  const [tasks, setTasks] = useState([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm({
    resolver: zodResolver(taskSchema)
  });

  // --- DND KIT: SECTION SORTABLE SETUP ---
  const {
    setNodeRef: setSectionNodeRef,
    attributes: sectionAttributes,
    listeners: sectionListeners,
    transform: sectionTransform,
    transition: sectionTransition,
    isDragging: isSectionDragging,
  } = useSortable({
    id: section.id,
    data: { type: 'Section', section }
  });

  const sectionStyle = {
    transform: CSS.Transform.toString(sectionTransform),
    transition: sectionTransition,
  };

  // --- DND KIT: GLOBAL DRAG MONITOR ---
  useDndMonitor({
    onDragOver: (event) => {
      const { active, over } = event;
      if (!over || active.data.current?.type !== 'Task') return;

      const activeTaskId = active.id;
      const activeTask = active.data.current.task;
      const overSectionId = over.data.current?.type === 'Section' ? over.id : over.data.current?.task?.sectionId;

      setTasks(prev => {
        const isSource = prev.some(t => t.id === activeTaskId);
        const isTarget = overSectionId === section.id;

        if (isSource && !isTarget) {
          return prev.filter(t => t.id !== activeTaskId);
        } else if (!isSource && isTarget) {
          const overIndex = over.data.current?.type === 'Task' ? prev.findIndex(t => t.id === over.id) : prev.length;
          const insertIndex = overIndex >= 0 ? overIndex : prev.length;
          const newTasks = [...prev];
          newTasks.splice(insertIndex, 0, { ...activeTask, sectionId: section.id });
          return newTasks;
        } else if (isSource && isTarget) {
          const activeIndex = prev.findIndex(t => t.id === activeTaskId);
          const overIndex = over.data.current?.type === 'Task' ? prev.findIndex(t => t.id === over.id) : activeIndex;
          if (activeIndex !== overIndex && overIndex !== -1) {
            return arrayMove(prev, activeIndex, overIndex);
          }
        }
        return prev;
      });
    },
    
    onDragEnd: (event) => {
      const { active, over } = event;
      if (!over || active.data.current?.type !== 'Task') return;

      const overSectionId = over.data.current?.type === 'Section' ? over.id : over.data.current?.task?.sectionId;

      if (overSectionId === section.id) {
        setTasks(prev => {
          const activeIndex = prev.findIndex(t => t.id === active.id);
          if (activeIndex === -1) return prev;

          let newOrder;
          if (prev.length === 1) {
            newOrder = 1000;
          } else if (activeIndex === 0) {
            newOrder = prev[1].order / 2;
          } else if (activeIndex === prev.length - 1) {
            newOrder = prev[prev.length - 2].order + 1000;
          } else {
            newOrder = (prev[activeIndex - 1].order + prev[activeIndex + 1].order) / 2;
          }

          if (prev[activeIndex].order === newOrder && prev[activeIndex].sectionId === section.id) {
            return prev;
          }

          apiClient.patch(`/tasks/${active.id}/reorder`, {
            sectionId: section.id,
            order: newOrder
          }).catch(err => {
            console.error("Failed to reorder task:", err);
            apiClient.get(`/sections/${section.id}/tasks`).then(res => setTasks(res.data));
          });

          const newTasks = [...prev];
          newTasks[activeIndex] = { ...newTasks[activeIndex], order: newOrder, sectionId: section.id };
          return newTasks;
        });
      }
    }
  });

  // --- REAL-TIME SOCKET LISTENERS ---
  useSocketEvent('task:created', (newTask) => {
    if (newTask.sectionId === section.id) {
      setTasks(prev => {
        if (prev.some(t => t.id === newTask.id)) return prev;
        return [...prev, newTask].sort((a, b) => a.order - b.order);
      });
    }
  });

  useSocketEvent('task:updated', (updatedTask) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
  });

  useSocketEvent('task:deleted', ({ id, sectionId }) => {
    if (sectionId === section.id) {
      setTasks(prev => prev.filter(t => t.id !== id));
    }
  });

  // Fetch tasks
  useEffect(() => {
    let isMounted = true;
    const fetchTasks = async () => {
      if (isCollapsed) return;
      setIsLoadingTasks(true);
      try {
        const res = await apiClient.get(`/sections/${section.id}/tasks`);
        if (isMounted) setTasks(res.data);
      } catch (error) {
        console.error("Failed to load tasks", error);
      } finally {
        if (isMounted) setIsLoadingTasks(false);
      }
    };
    fetchTasks();
    return () => { isMounted = false; };
  }, [section.id, isCollapsed]);

  const onSubmitTask = async (data) => {
    try {
      const res = await apiClient.post(`/sections/${section.id}/tasks`, {
        title: data.title,
        priority: 'MEDIUM'
      });
      setTasks(prev => [...prev, res.data]);
      reset();
      setIsAddingTask(false);
    } catch (error) {
      console.error("Failed to create task", error);
    }
  };

  // --- APPLY FILTERS ---
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchStatus = filters.status.length === 0 || filters.status.includes(task.status);
      const matchPriority = filters.priority.length === 0 || filters.priority.includes(task.priority);
      const matchTags = filters.tag.length === 0 || filters.tag.some(tag => (task.tags || []).includes(tag));
      return matchStatus && matchPriority && matchTags;
    });
  }, [tasks, filters]);

  const depth = section.depth || 0;
  const railOpacity = Math.max(0.2, 1 - (depth * 0.15));
  const rgbColor = section.color ? hexToRgb(section.color) : 'var(--workspace-accent-rgb)';

  return (
    <div 
      ref={setSectionNodeRef}
      style={sectionStyle}
      className={`flex flex-col mt-2 rounded-md ${isSectionDragging ? 'opacity-40 border border-blue-400 shadow-sm bg-blue-50/10' : ''}`}
    >
      <div 
        className="flex items-center gap-2 p-2 rounded-md hover:bg-slate-50 cursor-pointer group transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div
          {...sectionAttributes}
          {...sectionListeners}
          onClick={(e) => e.stopPropagation()}
          className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        >
          <GripVertical className="w-4 h-4" />
        </div>

        <ChevronRight 
          className={`w-4 h-4 text-slate-400 transition-transform duration-150 ease-out ${isCollapsed ? '' : 'rotate-90'}`} 
        />
        <FolderOpen className="w-4 h-4" style={{ color: `rgba(${rgbColor}, 1)` }} />
        <h3 className="font-semibold text-slate-700 text-sm select-none">{section.title}</h3>
        <span className="text-xs text-slate-400 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
          {filteredTasks.length} tasks
        </span>
      </div>

      <div className={`grid transition-all duration-150 ease-out ${isCollapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}>
        <div className="overflow-hidden">
          <div 
            className="ml-5 pl-4 flex flex-col gap-1 mt-1 pb-4 min-h-[40px]" 
            style={{ 
              borderLeft: '2px solid',
              borderLeftColor: `rgba(${rgbColor}, ${railOpacity})` 
            }}
          >
            
            {/* Render Filtered Tasks */}
            {isLoadingTasks ? (
                <div className="py-2 pl-2"><Loader2 className="w-4 h-4 animate-spin text-slate-300" /></div>
            ) : (
              <SortableContext items={filteredTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                {filteredTasks.map(task => (
                    <TaskRow 
                        key={task.id} 
                        task={task} 
                        onClick={() => onOpenTask && onOpenTask(task.id)}
                        onUpdate={(taskId, updates) => {
                          setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
                        }}
                    />
                ))}
              </SortableContext>
            )}

            {isAddingTask ? (
              <form onSubmit={handleSubmit(onSubmitTask)} className="mt-1 flex items-center gap-2 pl-2">
                <input
                  {...register('title')}
                  autoFocus
                  placeholder="What needs to be done?"
                  className="flex-1 text-sm bg-white border border-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  onKeyDown={(e) => { if (e.key === 'Escape') setIsAddingTask(false); }}
                  disabled={isSubmitting}
                />
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
              </form>
            ) : (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAddingTask(true);
                }}
                className="flex items-center gap-2 text-slate-400 hover:text-slate-600 text-sm p-2 rounded-md transition-colors w-max mt-1"
              >
                <Plus className="w-4 h-4" />
                Add task
              </button>
            )}

            {/* Nested Child Sections Wrapper */}
            {section.children && section.children.length > 0 && (
              <div className="mt-2 space-y-1">
                <SortableContext items={section.children.map(c => c.id)} strategy={verticalListSortingStrategy}>
                  {section.children.map((childSection) => (
                    <SectionBlock 
                      key={childSection.id} 
                      section={childSection} 
                      onOpenTask={onOpenTask} 
                      filters={filters} // <-- Pass filters down recursively
                    />
                  ))}
                </SortableContext>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};