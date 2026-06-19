import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Paperclip, Repeat } from 'lucide-react';
import apiClient from '../../api/client';
import { RichTextEditor } from './RichTextEditor';
import { AttachmentItem } from './AttachmentItem';
import DOMPurify from 'dompurify';

export const TaskDetailPanel = ({ taskId, onClose, onTaskUpdated }) => {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [links, setLinks] = useState({ linksTo: [], linkedFrom: [] });
  const [uploadProgress, setUploadProgress] = useState({});
  
  const [title, setTitle] = useState('');
  
  // Recurring Task State
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurRule, setRecurRule] = useState('');

  useEffect(() => {
    if (!taskId) return;
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [taskRes, linksRes] = await Promise.all([
          apiClient.get(`/tasks/${taskId}`),
          apiClient.get(`/tasks/${taskId}/links`)
        ]);
        setTask(taskRes.data);
        setTitle(taskRes.data.title);
        setIsRecurring(taskRes.data.isRecurring || false);
        setRecurRule(taskRes.data.recurRule || '');
        setLinks(linksRes.data);
      } catch (_error) {
        console.error("Failed to load task details", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [taskId, workspaceId]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiClient.put(`/tasks/${taskId}`, { 
        title, 
        isRecurring, 
        recurRule 
      });
      if (onTaskUpdated) onTaskUpdated();
    } catch (error) {
      console.error("Failed to save task", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUrlPaste = async (url) => {
    try {
      const { data } = await apiClient.post('/media/link-preview', { url });
      const res = await apiClient.post(`/tasks/${taskId}/attachments`, {
        type: 'LINK',
        url,
        metadata: {
          title: DOMPurify.sanitize(data.title),
          description: DOMPurify.sanitize(data.description),
          thumbnail: data.thumbnail,
          favicon: data.favicon,
          domain: DOMPurify.sanitize(data.domain)
        },
        filename: data.title
      });
      setTask(prev => ({ ...prev, attachments: [...(prev.attachments || []), res.data] }));
    } catch (error) { console.error("Link preview failed", error); }
  };

  const onPaste = (e) => {
    const text = e.clipboardData.getData('text');
    const match = text.match(/(https?:\/\/[^\s]+)/g);
    if (match) handleUrlPaste(match[0]);
  };

  const onDrop = async (acceptedFiles) => {
    acceptedFiles.forEach(async (file) => {
      setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await apiClient.post(`/tasks/${taskId}/attachments`, formData, {
          onUploadProgress: (e) => setUploadProgress(p => ({ ...p, [file.name]: Math.round((e.loaded * 100) / e.total) }))
        });
        setTask(prev => ({ ...prev, attachments: [...(prev.attachments || []), res.data] }));
      } finally { setUploadProgress(p => { const n = { ...p }; delete n[file.name]; return n; }); }
    });
  };

  const handleRemoveAttachment = async (attachmentId) => {
    const previousAttachments = task.attachments;
    setTask(prev => ({ ...prev, attachments: prev.attachments.filter(a => a.id !== attachmentId) }));
    try {
      await apiClient.delete(`/attachments/${attachmentId}`); 
    } catch (error) {
      setTask(prev => ({ ...prev, attachments: previousAttachments }));
    }
  };

  const { getRootProps, getInputProps, open: openFileDialog } = useDropzone({ onDrop, noClick: true, noKeyboard: true });

  if (!task) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm" onClick={onClose} />
      <div {...getRootProps()} onPaste={onPaste} className="fixed inset-y-0 right-0 w-full max-w-[500px] bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200">
        <input {...getInputProps()} />
        <div className="p-6 flex-1 overflow-y-auto">
          
          {/* Recurring Badge */}
          {isRecurring && (
            <div className="mb-4 inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 text-xs font-bold rounded-md">
              <Repeat className="w-3 h-3" /> Recurring Task
            </div>
          )}

          <textarea 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            onBlur={handleSave}
            className="w-full text-2xl font-bold border-none outline-none resize-none mb-4" 
            rows={2} 
          />
          
          {/* Repeat Configuration */}
          <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Repeat Rule (iCal)</label>
            <div className="flex gap-3">
              <input 
                type="checkbox" 
                checked={isRecurring} 
                onChange={(e) => { setIsRecurring(e.target.checked); handleSave(); }} 
                className="mt-1.5"
              />
              <input 
                type="text" 
                value={recurRule}
                onChange={(e) => setRecurRule(e.target.value)}
                onBlur={handleSave}
                placeholder="e.g. FREQ=WEEKLY;BYDAY=MO"
                className="flex-1 text-sm px-2 py-1.5 border border-slate-300 rounded outline-none focus:border-blue-500"
              />
            </div>
          </div>
          
          <RichTextEditor content={task.body} />

          {/* Attachments Section */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Paperclip className="w-4 h-4" /> Attachments
              </h4>
              <button onClick={openFileDialog} className="text-xs text-blue-600 hover:text-blue-700 font-medium">+ Add File</button>
            </div>

            {Object.entries(uploadProgress).map(([name, progress]) => (
              <div key={name} className="mb-2 text-xs text-slate-500">{name}: {progress}%</div>
            ))}

            <SortableContext items={(task.attachments || []).map(a => a.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {(task.attachments || []).map(a => (
                  <AttachmentItem key={a.id} attachment={a} onRemove={handleRemoveAttachment} />
                ))}
              </div>
            </SortableContext>
          </div>

          {/* Related Tasks UI */}
          <div className="pt-8 border-t mt-8">
            <h4 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">Related Tasks</h4>
            <div className="space-y-4">
              {links.linksTo?.length > 0 && (
                <div>
                  <p className="text-xs text-slate-400 mb-2 font-medium">LINKS TO</p>
                  {links.linksTo.map(l => (
                    <button key={l.targetId} onClick={() => navigate(`/w/${workspaceId}?task=${l.targetId}`)} className="block w-full text-left text-sm p-2 bg-slate-50 rounded hover:bg-blue-50">{l.target.title}</button>
                  ))}
                </div>
              )}
              {links.linkedFrom?.length > 0 && (
                <div>
                  <p className="text-xs text-slate-400 mb-2 font-medium">REFERENCED BY</p>
                  {links.linkedFrom.map(l => (
                    <button key={l.sourceId} onClick={() => navigate(`/w/${workspaceId}?task=${l.sourceId}`)} className="block w-full text-left text-sm p-2 bg-slate-50 rounded hover:bg-blue-50">{l.source.title}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};