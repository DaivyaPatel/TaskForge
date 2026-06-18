import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Loader2, Plus, LayoutDashboard, FolderOpen, Archive } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

import apiClient from '../api/client';
import { hexToRgb } from '../utils/colors';
import { SectionBlock } from '../components/workspace/SectionBlock';
import { TaskDetailPanel } from '../components/workspace/TaskDetailPanel';
import { TaskRow } from '../components/workspace/TaskRow';
import { FilterBar } from '../components/workspace/FilterBar';
import { SearchModal } from '../components/workspace/SearchModal';

// 1. Import Socket Hooks
import { useSocketStore } from '../store/socketStore';
import { useSocketEvent } from '../hooks/useSocket';

export const WorkspaceView = () => {
  const { workspaceId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [workspace, setWorkspace] = useState(null);
  
  // Data States
  const [sectionsTree, setSectionsTree] = useState([]);
  const [archivedTasks, setArchivedTasks] = useState([]);
  
  // UI States
  const [viewMode, setViewMode] = useState('active'); // 'active' | 'archived'
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  
  // Drag Tracking State
  const [activeTask, setActiveTask] = useState(null); 
  const [activeSection, setActiveSection] = useState(null);

  // 2. Get the socket instance and presence actions
  const socket = useSocketStore(state => state.socket);
  const { setActiveUsers, addActiveUser, removeActiveUser, clearActiveUsers } = useSocketStore();

  // --- PARSE FILTERS ---
  const activeFilters = {
    status: searchParams.getAll('status'),
    priority: searchParams.getAll('priority'),
    tag: searchParams.getAll('tag'),
  };

  // --- SYNC URL PARAMS WITH TASK PANEL ---
  const taskIdParam = searchParams.get('task');
  useEffect(() => {
    if (taskIdParam) {
      setSelectedTaskId(taskIdParam);
    }
  }, [taskIdParam]);

  const handleCloseTaskPanel = () => {
    setSelectedTaskId(null);
    setSearchParams(prev => {
      prev.delete('task');
      return prev;
    }, { replace: true });
  };

  // --- DND KIT SETUP ---
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 500, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event) => {
    const { active } = event;
    if (active.data.current?.type === 'Task') {
      setActiveTask(active.data.current.task);
    } else if (active.data.current?.type === 'Section') {
      setActiveSection(active.data.current.section);
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    // Handle SECTION Reordering
    if (active.data.current?.type === 'Section' && over?.data.current?.type === 'Section' && active.id !== over.id) {
      const activeSectionData = active.data.current.section;
      const overSectionData = over.data.current.section;

      if (activeSectionData.parentId === overSectionData.parentId) {
        setSectionsTree(prevTree => {
          const updateTreeRecursively = (nodes) => {
            const activeIdx = nodes.findIndex(n => n.id === active.id);
            const overIdx = nodes.findIndex(n => n.id === over.id);

            if (activeIdx !== -1 && overIdx !== -1) {
              const newNodes = [...nodes];
              let newOrder;

              if (newNodes.length === 1) {
                newOrder = 1000;
              } else if (overIdx === 0) {
                newOrder = newNodes[1].order / 2;
              } else if (overIdx === newNodes.length - 1) {
                newOrder = newNodes[newNodes.length - 2].order + 1000;
              } else {
                const isMovingDown = activeIdx < overIdx;
                const prevOrder = newNodes[isMovingDown ? overIdx : overIdx - 1].order;
                const nextOrder = newNodes[isMovingDown ? overIdx + 1 : overIdx].order;
                newOrder = (prevOrder + nextOrder) / 2;
              }

              apiClient.patch(`/workspaces/${workspaceId}/sections/${active.id}/reorder`, {
                order: newOrder,
                parentId: activeSectionData.parentId
              }).catch(err => {
                console.error("Failed to reorder section", err);
                apiClient.get(`/workspaces/${workspaceId}/sections`).then(res => setSectionsTree(res.data));
              });

              newNodes[activeIdx] = { ...newNodes[activeIdx], order: newOrder };
              return newNodes.sort((a, b) => a.order - b.order);
            }

            return nodes.map(n => ({
              ...n,
              children: n.children ? updateTreeRecursively(n.children) : []
            }));
          };

          return updateTreeRecursively(prevTree);
        });
      }
    }

    setActiveTask(null);
    setActiveSection(null);
  };

  // 3. Join the Workspace Room & Setup Presence!
  useEffect(() => {
    if (socket && workspaceId) {
      socket.emit('workspace:join', workspaceId, (response) => {
        if (response?.success && response.activeUsers) {
          setActiveUsers(response.activeUsers);
        }
      });
    }

    return () => {
      if (socket) {
        socket.emit('workspace:leave');
      }
      clearActiveUsers();
    };
  }, [socket, workspaceId, setActiveUsers, clearActiveUsers]);

  useSocketEvent('presence:join', (user) => addActiveUser(user));
  useSocketEvent('presence:leave', (userId) => removeActiveUser(userId));

  useSocketEvent('section:created', (newSection) => {
    if (viewMode === 'active') {
      setSectionsTree(prev => [...prev, newSection]);
    }
  });
  useSocketEvent('section:deleted', ({ id }) => {
    if (viewMode === 'active') {
      setSectionsTree(prev => prev.filter(s => s.id !== id));
    }
  });
  useSocketEvent('section:updated', () => {
    if (viewMode === 'active') {
      apiClient.get(`/workspaces/${workspaceId}/sections`).then(res => setSectionsTree(res.data));
    }
  });

  // --- FETCH DATA BASED ON VIEW MODE ---
  useEffect(() => {
    const fetchWorkspaceData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (viewMode === 'active') {
          const [wsRes, sectionsRes] = await Promise.all([
            apiClient.get(`/workspaces/${workspaceId}`),
            apiClient.get(`/workspaces/${workspaceId}/sections`)
          ]);
          setWorkspace(wsRes.data);
          setSectionsTree(sectionsRes.data);
        } else {
          // Fetch archive and ensure we have basic workspace data
          const [wsRes, archiveRes] = await Promise.all([
            workspace ? { data: workspace } : apiClient.get(`/workspaces/${workspaceId}`),
            apiClient.get(`/workspaces/${workspaceId}/archive`)
          ]);
          setWorkspace(wsRes.data);
          setArchivedTasks(archiveRes.data);
        }
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load workspace data");
      } finally {
        setIsLoading(false);
      }
    };
    
    if (workspaceId) {
      fetchWorkspaceData();
    }
  }, [workspaceId, viewMode]);

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

  const accentRgb = hexToRgb(workspace?.color);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveTask(null);
        setActiveSection(null);
      }}
    >
      <div 
        className="min-h-screen p-8 bg-white relative"
        style={{ '--workspace-accent-rgb': `rgb(${accentRgb})` }}
      >
        <header className="mb-6 border-b pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{workspace?.name}</h1>
            {workspace?.description && (
              <p className="text-slate-500 mt-1">{workspace.description}</p>
            )}
          </div>
          
          {/* View Mode Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-lg self-start sm:self-auto">
            <button
              onClick={() => setViewMode('active')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'active' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Active Board
            </button>
            <button
              onClick={() => setViewMode('archived')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                viewMode === 'archived' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Archive className="w-4 h-4" />
              Archive
            </button>
          </div>
        </header>

        {/* --- ACTIVE BOARD VIEW --- */}
        {viewMode === 'active' && (
          <>
            <FilterBar workspaceId={workspaceId} />

            {sectionsTree.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                <LayoutDashboard className="w-12 h-12 text-slate-400 mb-4" />
                <h2 className="text-xl font-semibold text-slate-700">No sections yet</h2>
                <p className="text-slate-500 max-w-md mt-2 mb-6">
                  Sections help you organize your tasks. Create your first section to get started.
                </p>
                <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors">
                  <Plus className="w-4 h-4" />
                  Add Section
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <SortableContext items={sectionsTree.map(s => s.id)} strategy={verticalListSortingStrategy}>
                  {sectionsTree.map((section) => (
                    <SectionBlock 
                      key={section.id} 
                      section={section} 
                      onOpenTask={(taskId) => {
                        setSelectedTaskId(taskId);
                        setSearchParams(prev => { prev.set('task', taskId); return prev; });
                      }}
                      filters={activeFilters}
                    />
                  ))}
                </SortableContext>
              </div>
            )}
          </>
        )}

        {/* --- ARCHIVED TASKS VIEW --- */}
        {viewMode === 'archived' && (
          <div className="space-y-2 max-w-4xl">
            {archivedTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                <Archive className="w-12 h-12 text-slate-300 mb-4" />
                <h2 className="text-xl font-semibold text-slate-700">Archive is empty</h2>
                <p className="text-slate-500 mt-2">
                  When you archive tasks, they will appear here.
                </p>
              </div>
            ) : (
              archivedTasks.map(task => (
                <TaskRow 
                  key={task.id} 
                  task={task} 
                  onClick={() => {
                    setSelectedTaskId(task.id);
                    setSearchParams(prev => { prev.set('task', task.id); return prev; });
                  }}
                  onUpdate={(id, updates) => {
                    // Remove from view immediately if unarchived
                    if (updates.isArchived === false) {
                      setArchivedTasks(prev => prev.filter(t => t.id !== id));
                    }
                  }}
                />
              ))
            )}
          </div>
        )}

        {/* Task Detail Panel */}
        {selectedTaskId && (
          <TaskDetailPanel 
            taskId={selectedTaskId} 
            onClose={handleCloseTaskPanel}
            onTaskUpdated={(id, updates) => {
              // Trigger a refetch or partial update to keep view fresh
              if (viewMode === 'archived') {
                apiClient.get(`/workspaces/${workspaceId}/archive`).then(res => setArchivedTasks(res.data));
              } else {
                apiClient.get(`/workspaces/${workspaceId}/sections`).then(res => setSectionsTree(res.data));
              }
            }}
          />
        )}

        {/* Drag Overlay */}
        <DragOverlay>
          {activeTask ? (
            <div className="opacity-90 shadow-2xl scale-[1.02] rotate-2 cursor-grabbing bg-white rounded-md border border-slate-200">
              <TaskRow task={activeTask} />
            </div>
          ) : activeSection ? (
             <div className="opacity-90 shadow-2xl scale-[1.02] rotate-2 cursor-grabbing bg-white rounded-md border border-slate-200 p-3 flex items-center gap-2 w-64">
               <FolderOpen className="w-5 h-5 text-slate-400" />
               <span className="font-semibold text-slate-700">{activeSection.title}</span>
             </div>
          ) : null}
        </DragOverlay>
        
        {/* Search Modal */}
        <SearchModal />
      </div>
    </DndContext>
  );
};