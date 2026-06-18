import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import apiClient from '../../api/client';
import { useParams } from 'react-router-dom';

export const MentionList = forwardRef((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { taskId } = useParams(); // Get current task context

  const selectItem = async (index) => {
    const item = props.items[index];
    if (item) {
      try {
        // 1. Create database link (TF-045 functionality)
        await apiClient.post(`/tasks/${taskId}/links`, { targetId: item.id });
        
        // 2. Command Tiptap to insert the chip
        props.command({ id: item.id, label: item.label });
      } catch (error) {
        console.error("Failed to link task:", error);
      }
    }
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
        return true;
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((selectedIndex + 1) % props.items.length);
        return true;
      }
      if (event.key === 'Enter') {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  useEffect(() => setSelectedIndex(0), [props.items]);

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden w-64 z-[9999]">
      {props.items.length ? (
        props.items.map((item, index) => (
          <button
            key={item.id}
            className={`w-full text-left px-4 py-2 text-sm ${index === selectedIndex ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'}`}
            onClick={() => selectItem(index)}
          >
            {item.label}
          </button>
        ))
      ) : (
        <div className="px-4 py-2 text-sm text-slate-400 italic">No tasks found</div>
      )}
    </div>
  );
});