import { Link } from 'react-router-dom';
import { Users, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

export const WorkspaceCard = ({ workspace }) => {
  // Use backend stats if they exist, otherwise default to 0 for the UI mockup
  const stats = workspace.stats || { members: 1, totalTasks: 0, doneTasks: 0, overdueTasks: 0 };
  const color = workspace.color || '#3b82f6';

  return (
    <Link 
      to={`/w/${workspace.id}`}
      className="group flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md hover:border-slate-300 transition-all duration-200"
    >
      {/* Top Color Bar */}
      <div className="h-2 w-full" style={{ backgroundColor: color }} />
      
      <div className="p-5 flex flex-col flex-1">
        <h3 className="text-lg font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
          {workspace.name}
        </h3>
        {workspace.description ? (
          <p className="text-sm text-slate-500 mt-1 line-clamp-2">{workspace.description}</p>
        ) : (
          <p className="text-sm text-slate-400 mt-1 italic">No description</p>
        )}

        <div className="mt-auto pt-6 grid grid-cols-2 gap-4 text-sm">
          
          <div className="flex items-center gap-1.5 text-slate-500">
            <Users className="w-4 h-4" />
            <span>{stats.members} {stats.members === 1 ? 'Member' : 'Members'}</span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-500">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>{stats.doneTasks} / {stats.totalTasks} Done</span>
          </div>

          {stats.overdueTasks > 0 && (
            <div className="flex items-center gap-1.5 text-red-500 col-span-2 mt-1">
              <AlertCircle className="w-4 h-4" />
              <span className="font-medium">{stats.overdueTasks} Overdue tasks</span>
            </div>
          )}
          
        </div>
      </div>
    </Link>
  );
};