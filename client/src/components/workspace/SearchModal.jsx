import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Search, Clock, CheckCircle2, ChevronRight, Command, Circle } from 'lucide-react';
import apiClient from '../../api/client';

export const SearchModal = () => {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  
  const [recentSearches, setRecentSearches] = useState(() => {
    const saved = localStorage.getItem('taskforge_recent_searches');
    return saved ? JSON.parse(saved) : [];
  });

  const inputRef = useRef(null);
  const resultsRef = useRef(null);

  // Toggle modal with Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Debounced Search API Call
  useEffect(() => {
    if (!isOpen) return;
    if (query.trim() === '' && !statusFilter && !priorityFilter) {
      setResults([]);
      return;
    }

    const fetchResults = async () => {
      setIsLoading(true);
      try {
        let endpoint = `/search?workspaceId=${workspaceId || ''}&q=${encodeURIComponent(query)}`;
        if (statusFilter) endpoint += `&status=${statusFilter}`;
        if (priorityFilter) endpoint += `&priority=${priorityFilter}`;

        const { data } = await apiClient.get(endpoint);
        setResults(data);
        setSelectedIndex(0);
      } catch (error) {
        console.error("Search failed", error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceId = setTimeout(fetchResults, 300);
    return () => clearTimeout(debounceId);
  }, [query, workspaceId, statusFilter, priorityFilter, isOpen]);

  // Handle Keyboard Navigation (Up/Down/Enter)
  const handleKeyDown = (e) => {
    if (!results.length && !recentSearches.length) return;

    const listToNavigate = query.trim() === '' && !results.length ? recentSearches : results;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % listToNavigate.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + listToNavigate.length) % listToNavigate.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (listToNavigate[selectedIndex]) {
        if (query.trim() === '' && !results.length) {
          // If entering on a recent search string, set it to query
          setQuery(listToNavigate[selectedIndex]);
        } else {
          // Open the task
          handleSelectTask(listToNavigate[selectedIndex]);
        }
      }
    }
  };

  // Keep selected item in scroll view
  useEffect(() => {
    if (resultsRef.current && resultsRef.current.children[selectedIndex]) {
      resultsRef.current.children[selectedIndex].scrollIntoView({
        block: 'nearest',
      });
    }
  }, [selectedIndex]);

  const saveRecentSearch = (searchQuery) => {
    if (!searchQuery.trim()) return;
    const updated = [searchQuery, ...recentSearches.filter(q => q !== searchQuery)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('taskforge_recent_searches', JSON.stringify(updated));
  };

  const handleSelectTask = (task) => {
    if (query.trim()) saveRecentSearch(query.trim());
    setIsOpen(false);
    // Navigate to workspace and open task detail panel via query param
    navigate(`/w/${task.section.workspaceId}?task=${task.id}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-start justify-center pt-[10vh] px-4" onClick={() => setIsOpen(false)}>
      <div 
        className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Header */}
        <div className="flex items-center gap-3 p-4 border-b border-slate-100">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search tasks... (Type to search)"
            className="flex-1 bg-transparent border-none outline-none text-slate-800 placeholder-slate-400 text-lg"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-xs text-slate-500 font-medium tracking-widest">
            <Command className="w-3 h-3" /> K
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/50 overflow-x-auto">
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-white border border-slate-200 text-slate-600 rounded px-2 py-1 outline-none cursor-pointer hover:border-slate-300"
          >
            <option value="">Any Status</option>
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="DONE">Done</option>
          </select>

          <select 
            value={priorityFilter} 
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs bg-white border border-slate-200 text-slate-600 rounded px-2 py-1 outline-none cursor-pointer hover:border-slate-300"
          >
            <option value="">Any Priority</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        {/* Results Body */}
        <div className="max-h-[60vh] overflow-y-auto p-2" ref={resultsRef}>
          {isLoading && query ? (
            <div className="p-4 text-center text-sm text-slate-500">Searching...</div>
          ) : query.trim() || statusFilter || priorityFilter ? (
            results.length > 0 ? (
              results.map((task, index) => (
                <div
                  key={task.id}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => handleSelectTask(task)}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    index === selectedIndex ? 'bg-blue-50' : 'hover:bg-slate-50'
                  }`}
                >
                  {task.status === 'DONE' ? <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" /> : <Circle className="w-5 h-5 text-slate-300 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-sm font-medium truncate ${index === selectedIndex ? 'text-blue-700' : 'text-slate-700'}`}>
                      {task.title}
                    </h4>
                    <div className="flex items-center gap-1 mt-1 text-xs text-slate-400 truncate">
                      {task.section?.workspace?.name} 
                      <ChevronRight className="w-3 h-3" /> 
                      {task.section?.title}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-500">
                <Search className="w-8 h-8 mx-auto mb-3 text-slate-300" />
                <p>No tasks found matching your search.</p>
              </div>
            )
          ) : (
            /* Recent Searches State */
            <div className="p-2">
              <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">Recent Searches</h5>
              {recentSearches.length > 0 ? (
                recentSearches.map((search, index) => (
                  <div
                    key={index}
                    onMouseEnter={() => setSelectedIndex(index)}
                    onClick={() => setQuery(search)}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      index === selectedIndex ? 'bg-slate-100' : 'hover:bg-slate-50'
                    }`}
                  >
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-600">{search}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400 px-2">No recent searches</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 p-3 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded">↑↓</span> to navigate</span>
            <span className="flex items-center gap-1"><span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded">↵</span> to open</span>
            <span className="flex items-center gap-1"><span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded">esc</span> to close</span>
          </div>
        </div>
      </div>
    </div>
  );
};