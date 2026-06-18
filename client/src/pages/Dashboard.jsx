import { useState, useEffect } from 'react';
import { Plus, LayoutGrid, Loader2 } from 'lucide-react';
import apiClient from '../api/client';
import { WorkspaceCard } from '../components/dashboard/WorkspaceCard';
import { CreateWorkspaceModal } from '../components/dashboard/CreateWorkspaceModal';

export const Dashboard = () => {
  const [workspaces, setWorkspaces] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const res = await apiClient.get('/workspaces');
        // Sort by updatedAt descending (recent activity)
        const sorted = res.data.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        setWorkspaces(sorted);
      } catch (error) {
        console.error("Failed to load dashboard workspaces", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchWorkspaces();
  }, []);

  const handleWorkspaceCreated = (newWorkspace) => {
    setWorkspaces(prev => [newWorkspace, ...prev]);
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Overview of all your active workspaces.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors shrink-0 w-max"
        >
          <Plus className="w-4 h-4" />
          New Workspace
        </button>
      </div>

      {/* Grid or Empty State */}
      {workspaces.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
          <LayoutGrid className="w-12 h-12 text-slate-300 mb-4" />
          <h2 className="text-xl font-semibold text-slate-700">No workspaces yet</h2>
          <p className="text-slate-500 max-w-sm mt-2 mb-6">
            Workspaces are where your team organizes tasks and projects. Create one to get started.
          </p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create Workspace
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workspaces.map(ws => (
            <WorkspaceCard key={ws.id} workspace={ws} />
          ))}
        </div>
      )}

      {/* Modal */}
      <CreateWorkspaceModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleWorkspaceCreated}
      />
      
    </div>
  );
};