import { useEffect, useState, useMemo } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Loader2, Sun, CalendarDays, Inbox } from 'lucide-react';
import { DndContext } from '@dnd-kit/core';

import apiClient from '../api/client';
import { hexToRgb } from '../utils/colors';
import { TaskRow } from '../components/workspace/TaskRow';
import { TaskDetailPanel } from '../components/workspace/TaskDetailPanel';

export const SmartView = () => {
  const { view } = useParams();
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  // If the user types a bad URL like /smart/pizza, redirect them
  // If the user types a bad URL like /smart/pizza, redirect them
  if (view !== 'today' && view !== 'upcoming') {
    return <Navigate to="/dashboard" replace />;
  }

  // Fetch tasks when the view changes
  useEffect(() => {
    const fetchSmartTasks = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await apiClient.get(`/tasks/smart?view=${view}`);
        setTasks(res.data);
      } catch (_err) {
        console.error(_err);
        setError("Failed to load tasks");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSmartTasks();
  }, [view]);

  // Group tasks by workspace using useMemo for performance
  const groupedTasks = useMemo(() => {
    return tasks.reduce((groups, task) => {
      const workspace = task.section?.workspace;
      if (!workspace) return groups; // Safety check

      if (!groups[workspace.id]) {
        groups[workspace.id] = {
          workspace: workspace,
          tasks: []
        };
      }
      groups[workspace.id].tasks.push(task);
      return groups;
    }, {});
  }, [tasks]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center text-red-500">
        <p>{error}</p>
      </div>
    );
  }

  const isToday = view === 'today';
  const groupKeys = Object.keys(groupedTasks);

  return (
    // We wrap this in DndContext because TaskRow uses useSortable internally.
    // By not providing drag handlers, it just acts as a static list here!
    <DndContext>
      <div className="min-h-screen p-8 bg-slate-50 relative">
        
        {/* Header */}
        <header className="mb-8 border-b border-slate-200 pb-4 flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isToday ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
            {isToday ? <Sun className="w-6 h-6" /> : <CalendarDays className="w-6 h-6" />}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 capitalize">{view}</h1>
            <p className="text-slate-500 mt-1 text-sm">
              {isToday ? "Tasks due today across all your workspaces" : "Tasks due in the next 7 days"}
            </p>
          </div>
        </header>

        {/* Empty State */}
        {groupKeys.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-slate-200 rounded-xl bg-white">
            <Inbox className="w-12 h-12 text-slate-300 mb-4" />
            <h2 className="text-xl font-semibold text-slate-600">You're all caught up!</h2>
            <p className="text-slate-500 max-w-sm mt-2">
              There are no tasks due {isToday ? 'today' : 'in the next week'} across any of your workspaces. Time to relax!
            </p>
          </div>
        ) : (
          /* Grouped Task Lists */
          <div className="space-y-8">
            {groupKeys.map(workspaceId => {
              const group = groupedTasks[workspaceId];
              const { workspace, tasks: workspaceTasks } = group;
              const rgbColor = workspace.color ? hexToRgb(workspace.color) : '15, 23, 42'; // Default slate-900

              return (
                <div key={workspaceId} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  
                  {/* Workspace Group Header */}
                  <div 
                    className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2"
                  >
                    <div 
                      className="w-3 h-3 rounded-sm" 
                      style={{ backgroundColor: `rgba(${rgbColor}, 1)` }} 
                    />
                    <h3 className="font-semibold text-slate-700 text-sm">{workspace.name}</h3>
                    <span className="text-xs text-slate-400 ml-auto bg-slate-200 px-2 py-0.5 rounded-full">
                      {workspaceTasks.length} {workspaceTasks.length === 1 ? 'task' : 'tasks'}
                    </span>
                  </div>

                  {/* Tasks List */}
                  <div className="p-2 space-y-1 bg-slate-50/50">
                    {workspaceTasks.map(task => (
                      <TaskRow 
                        key={task.id} 
                        task={task} 
                        onClick={() => setSelectedTaskId(task.id)}
                        onUpdate={(taskId, updates) => {
                          setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
                        }}
                      />
                    ))}
                  </div>

                </div>
              );
            })}
          </div>
        )}

        {/* Task Detail Panel Overlay */}
        {selectedTaskId && (
          <TaskDetailPanel 
            taskId={selectedTaskId} 
            onClose={() => setSelectedTaskId(null)}
            onTaskUpdated={(id, updates) => {
              // Local optimistic update from the panel
              setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
            }}
          />
        )}
        
      </div>
    </DndContext>
  );
};