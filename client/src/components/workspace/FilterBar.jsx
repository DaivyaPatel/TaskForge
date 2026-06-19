import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, X } from 'lucide-react';
import apiClient from '../../api/client';

export const FilterBar = ({ workspaceId }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isExpanded, setIsExpanded] = useState(false);
  const [availableTags, setAvailableTags] = useState([]);

  // Fetch unique tags for this workspace to populate the dropdown
  useEffect(() => {
    if (workspaceId) {
      apiClient.get(`/workspaces/${workspaceId}/tags`)
        .then(res => setAvailableTags(res.data))
        .catch(console.error);
    }
  }, [workspaceId]);

  // Parse active filters from URL
  const activeStatuses = searchParams.getAll('status');
  const activePriorities = searchParams.getAll('priority');
  const activeTags = searchParams.getAll('tag');
  
  const hasActiveFilters = activeStatuses.length > 0 || activePriorities.length > 0 || activeTags.length > 0;

  const toggleParam = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    const currentValues = newParams.getAll(key);
    
    newParams.delete(key); // Clear existing for this key
    
    if (currentValues.includes(value)) {
      // Remove it
      currentValues.filter(v => v !== value).forEach(v => newParams.append(key, v));
    } else {
      // Add it
      currentValues.push(value);
      currentValues.forEach(v => newParams.append(key, v));
    }
    
    setSearchParams(newParams);
  };

  const clearFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors border ${
            hasActiveFilters || isExpanded 
              ? 'bg-blue-50 border-blue-200 text-blue-700' 
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Filter className="w-4 h-4" />
          Filter
          {hasActiveFilters && (
            <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1">
              {activeStatuses.length + activePriorities.length + activeTags.length}
            </span>
          )}
        </button>

        {/* Active Filter Chips */}
        {activeStatuses.map(status => (
          <span key={`status-${status}`} className="flex items-center gap-1 text-xs px-2 py-1 bg-slate-100 border border-slate-200 rounded-full text-slate-600">
            Status: {status}
            <button onClick={() => toggleParam('status', status)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
          </span>
        ))}
        {activePriorities.map(priority => (
          <span key={`priority-${priority}`} className="flex items-center gap-1 text-xs px-2 py-1 bg-slate-100 border border-slate-200 rounded-full text-slate-600">
            Priority: {priority}
            <button onClick={() => toggleParam('priority', priority)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
          </span>
        ))}
        {activeTags.map(tag => (
          <span key={`tag-${tag}`} className="flex items-center gap-1 text-xs px-2 py-1 bg-slate-100 border border-slate-200 rounded-full text-slate-600">
            Tag: #{tag}
            <button onClick={() => toggleParam('tag', tag)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
          </span>
        ))}

        {hasActiveFilters && (
          <button onClick={clearFilters} className="text-xs text-slate-400 hover:text-slate-600 ml-2">Clear all</button>
        )}
      </div>

      {/* Expanded Filter Panel */}
      {isExpanded && (
        <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm flex flex-wrap gap-6 mb-6 animate-in slide-in-from-top-2 duration-200">
          
          {/* Status Filter */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</h4>
            <div className="flex flex-col gap-1.5">
              {['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE'].map(status => (
                <label key={status} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer hover:text-slate-900">
                  <input 
                    type="checkbox" 
                    checked={activeStatuses.includes(status)}
                    onChange={() => toggleParam('status', status)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  {status.replace('_', ' ')}
                </label>
              ))}
            </div>
          </div>

          {/* Priority Filter */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Priority</h4>
            <div className="flex flex-col gap-1.5">
              {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(priority => (
                <label key={priority} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer hover:text-slate-900">
                  <input 
                    type="checkbox" 
                    checked={activePriorities.includes(priority)}
                    onChange={() => toggleParam('priority', priority)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  {priority}
                </label>
              ))}
            </div>
          </div>

          {/* Tag Filter */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tags</h4>
            {availableTags.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No tags in workspace</p>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto pr-4">
                {availableTags.map(tag => (
                  <label key={tag} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer hover:text-slate-900">
                    <input 
                      type="checkbox" 
                      checked={activeTags.includes(tag)}
                      onChange={() => toggleParam('tag', tag)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    #{tag}
                  </label>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};