import { useEditor, EditorContent, ReactRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Mention from '@tiptap/extension-mention';
import tippy from 'tippy.js';
import DOMPurify from 'dompurify';
import { 
  Bold, Italic, Heading1, Heading2, List, 
  ListOrdered, Quote, Code, Minus 
} from 'lucide-react';
import { useParams } from 'react-router-dom';
import apiClient from '../../api/client';
import { MentionList } from './MentionList'; // Ensure you have this component created

const MenuBar = ({ editor }) => {
  if (!editor) return null;
  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b border-slate-200 bg-slate-50 rounded-t-md">
      {/* ... keep your existing buttons exactly as they were ... */}
      <button onClick={() => editor.chain().focus().toggleBold().run()} className={`p-1.5 rounded-md ${editor.isActive('bold') ? 'bg-slate-200' : ''}`}><Bold className="w-4 h-4" /></button>
      <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-1.5 rounded-md ${editor.isActive('italic') ? 'bg-slate-200' : ''}`}><Italic className="w-4 h-4" /></button>
      <div className="w-px h-4 bg-slate-300 mx-1" />
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={`p-1.5 rounded-md ${editor.isActive('heading', { level: 1 }) ? 'bg-slate-200' : ''}`}><Heading1 className="w-4 h-4" /></button>
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`p-1.5 rounded-md ${editor.isActive('heading', { level: 2 }) ? 'bg-slate-200' : ''}`}><Heading2 className="w-4 h-4" /></button>
      <div className="w-px h-4 bg-slate-300 mx-1" />
      <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={`p-1.5 rounded-md ${editor.isActive('bulletList') ? 'bg-slate-200' : ''}`}><List className="w-4 h-4" /></button>
      <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`p-1.5 rounded-md ${editor.isActive('orderedList') ? 'bg-slate-200' : ''}`}><ListOrdered className="w-4 h-4" /></button>
      <div className="w-px h-4 bg-slate-300 mx-1" />
      <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={`p-1.5 rounded-md ${editor.isActive('blockquote') ? 'bg-slate-200' : ''}`}><Quote className="w-4 h-4" /></button>
      <button onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={`p-1.5 rounded-md ${editor.isActive('codeBlock') ? 'bg-slate-200' : ''}`}><Code className="w-4 h-4" /></button>
      <button onClick={() => editor.chain().focus().setHorizontalRule().run()} className="p-1.5 rounded-md text-slate-600 hover:bg-slate-200"><Minus className="w-4 h-4" /></button>
    </div>
  );
};

export const RichTextEditor = ({ content, onChange }) => {
  const { workspaceId } = useParams();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Mention.configure({
        HTMLAttributes: { class: 'mention text-blue-600 bg-blue-50 px-1 rounded font-medium' },
        suggestion: {
          items: async ({ query }) => {
            const { data } = await apiClient.get(`/workspaces/${workspaceId}/search-tasks?q=${query}`);
            return data;
          },
          render: () => {
            let component;
            let popup;
            return {
              onStart: (props) => {
                component = new ReactRenderer(MentionList, { props, editor: props.editor });
                popup = tippy('body', {
                  getReferenceClientRect: props.clientRect,
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: 'manual',
                  placement: 'bottom-start',
                });
              },
              onUpdate: (props) => {
                component.updateProps(props);
                popup[0].setProps({ getReferenceClientRect: props.clientRect });
              },
              onKeyDown: (props) => component.ref?.onKeyDown(props),
              onExit: () => { popup[0].destroy(); component.destroy(); },
            };
          },
        },
      }),
    ],
    content: content || '',
    editorProps: {
      attributes: { className: 'prose prose-sm max-w-none focus:outline-none min-h-[150px] p-4 text-slate-700' },
      transformPastedHTML: (html) => DOMPurify.sanitize(html),
    },
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
  });

  return (
    <div className="border border-slate-200 rounded-md bg-white overflow-hidden shadow-sm">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
};