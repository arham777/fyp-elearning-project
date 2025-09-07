import React, { useEffect, useRef, useState } from 'react';

export type ProfessionalRichTextEditorProps = {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  height?: number;
  className?: string;
  id?: string;
  autoFocus?: boolean;
};

declare global {
  interface Window {
    Quill: any;
  }
}

const ProfessionalRichTextEditor: React.FC<ProfessionalRichTextEditorProps> = ({
  value = '',
  onChange,
  placeholder = 'Start writing...',
  disabled = false,
  height = 300,
  className = '',
  id,
  autoFocus = false,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    
    const loadQuill = async () => {
      if (window.Quill) {
        if (mountedRef.current) setIsLoaded(true);
        return;
      }

      // Load CSS if not already loaded
      if (!document.querySelector('link[href*="quill.snow.css"]')) {
        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = 'https://cdn.quilljs.com/1.3.6/quill.snow.css';
        document.head.appendChild(cssLink);
      }

      // Load JS if not already loaded
      if (!document.querySelector('script[src*="quill.min.js"]')) {
        const script = document.createElement('script');
        script.src = 'https://cdn.quilljs.com/1.3.6/quill.min.js';
        script.onload = () => {
          if (mountedRef.current) setIsLoaded(true);
        };
        document.head.appendChild(script);
      } else if (mountedRef.current) {
        setIsLoaded(true);
      }
    };

    loadQuill();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded || !editorRef.current || quillRef.current) return;

    try {
      const quill = new window.Quill(editorRef.current, {
        theme: 'snow',
        placeholder,
        readOnly: disabled,
        modules: {
          toolbar: [
            [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
            [{ 'font': [] }],
            [{ 'size': ['small', false, 'large', 'huge'] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'script': 'sub'}, { 'script': 'super' }],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'indent': '-1'}, { 'indent': '+1' }],
            [{ 'align': [] }],
            ['blockquote', 'code-block'],
            ['link', 'image', 'video'],
            ['clean']
          ],
          clipboard: {
            matchVisual: false,
          }
        },
        formats: [
          'header', 'font', 'size',
          'bold', 'italic', 'underline', 'strike',
          'color', 'background',
          'script',
          'list', 'bullet', 'indent',
          'align',
          'blockquote', 'code-block',
          'link', 'image', 'video'
        ]
      });

      quillRef.current = quill;

      // Set initial content
      if (value) {
        quill.root.innerHTML = value;
      }

      // Handle changes
      const changeHandler = () => {
        if (!mountedRef.current) return;
        const html = quill.root.innerHTML;
        onChange?.(html === '<p><br></p>' ? '' : html);
      };

      quill.on('text-change', changeHandler);

      // Auto focus if needed
      if (autoFocus) {
        setTimeout(() => {
          if (mountedRef.current) quill.focus();
        }, 100);
      }
    } catch (error) {
      console.error('Error initializing Quill:', error);
    }

    return () => {
      if (quillRef.current) {
        try {
          quillRef.current.off('text-change');
        } catch (e) {
          // Ignore cleanup errors
        }
        quillRef.current = null;
      }
    };
  }, [isLoaded]);

  // Update content when value prop changes
  useEffect(() => {
    if (quillRef.current && value !== undefined && mountedRef.current) {
      const currentContent = quillRef.current.root.innerHTML;
      if (currentContent !== value) {
        quillRef.current.root.innerHTML = value || '';
      }
    }
  }, [value]);

  // Update disabled state
  useEffect(() => {
    if (quillRef.current && mountedRef.current) {
      quillRef.current.enable(!disabled);
    }
  }, [disabled]);

  if (!isLoaded) {
    return (
      <div 
        className={`border rounded-md p-4 bg-muted/50 ${className}`}
        style={{ minHeight: height }}
      >
        <div className="flex items-center justify-center h-full">
          <div className="text-sm text-muted-foreground">Loading editor...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`professional-rich-text-editor ${className}`} id={id}>
      <div 
        ref={editorRef}
        style={{ minHeight: height }}
        className="bg-background"
      />
      <style jsx>{`
        .professional-rich-text-editor .ql-toolbar {
          border-top: 1px solid hsl(var(--border));
          border-left: 1px solid hsl(var(--border));
          border-right: 1px solid hsl(var(--border));
          border-bottom: none;
          background: hsl(var(--background));
          border-radius: 0.375rem 0.375rem 0 0;
        }
        
        .professional-rich-text-editor .ql-container {
          border-bottom: 1px solid hsl(var(--border));
          border-left: 1px solid hsl(var(--border));
          border-right: 1px solid hsl(var(--border));
          border-top: none;
          border-radius: 0 0 0.375rem 0.375rem;
          font-family: inherit;
        }
        
        .professional-rich-text-editor .ql-editor {
          color: hsl(var(--foreground));
          font-size: 14px;
          line-height: 1.5;
        }
        
        .professional-rich-text-editor .ql-editor.ql-blank::before {
          color: hsl(var(--muted-foreground));
          font-style: normal;
        }
        
        /* Dark mode support */
        .dark .professional-rich-text-editor .ql-toolbar {
          background: hsl(var(--background));
          border-color: hsl(var(--border));
        }
        
        .dark .professional-rich-text-editor .ql-toolbar .ql-stroke {
          stroke: hsl(var(--foreground));
        }
        
        .dark .professional-rich-text-editor .ql-toolbar .ql-fill {
          fill: hsl(var(--foreground));
        }
        
        .dark .professional-rich-text-editor .ql-toolbar button:hover {
          background: hsl(var(--muted));
        }
        
        .dark .professional-rich-text-editor .ql-toolbar button.ql-active {
          background: hsl(var(--accent));
        }
        
        .dark .professional-rich-text-editor .ql-container {
          border-color: hsl(var(--border));
        }
        
        .dark .professional-rich-text-editor .ql-editor {
          background: hsl(var(--background));
          color: hsl(var(--foreground));
        }
        
        /* Dropdown styling */
        .professional-rich-text-editor .ql-picker-options {
          background: hsl(var(--background));
          border: 1px solid hsl(var(--border));
          border-radius: 0.375rem;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        }
        
        .professional-rich-text-editor .ql-picker-item {
          color: hsl(var(--foreground));
        }
        
        .professional-rich-text-editor .ql-picker-item:hover {
          background: hsl(var(--muted));
        }
        
        /* Link tooltip */
        .professional-rich-text-editor .ql-tooltip {
          background: hsl(var(--background));
          border: 1px solid hsl(var(--border));
          border-radius: 0.375rem;
          color: hsl(var(--foreground));
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        }
        
        .professional-rich-text-editor .ql-tooltip input {
          background: hsl(var(--background));
          border: 1px solid hsl(var(--border));
          color: hsl(var(--foreground));
          border-radius: 0.25rem;
          padding: 0.25rem 0.5rem;
        }
        
        .professional-rich-text-editor .ql-tooltip .ql-action,
        .professional-rich-text-editor .ql-tooltip .ql-remove {
          color: hsl(var(--primary));
        }
        
        /* Content styling */
        .professional-rich-text-editor .ql-editor h1 {
          font-size: 2.25rem;
          font-weight: 700;
          line-height: 1.2;
          margin: 1rem 0 0.5rem 0;
        }
        
        .professional-rich-text-editor .ql-editor h2 {
          font-size: 1.875rem;
          font-weight: 600;
          line-height: 1.3;
          margin: 0.875rem 0 0.5rem 0;
        }
        
        .professional-rich-text-editor .ql-editor h3 {
          font-size: 1.5rem;
          font-weight: 600;
          line-height: 1.4;
          margin: 0.75rem 0 0.5rem 0;
        }
        
        .professional-rich-text-editor .ql-editor h4 {
          font-size: 1.25rem;
          font-weight: 600;
          line-height: 1.4;
          margin: 0.625rem 0 0.5rem 0;
        }
        
        .professional-rich-text-editor .ql-editor h5 {
          font-size: 1.125rem;
          font-weight: 600;
          line-height: 1.4;
          margin: 0.5rem 0 0.5rem 0;
        }
        
        .professional-rich-text-editor .ql-editor h6 {
          font-size: 1rem;
          font-weight: 600;
          line-height: 1.4;
          margin: 0.5rem 0 0.5rem 0;
        }
        
        .professional-rich-text-editor .ql-editor ul,
        .professional-rich-text-editor .ql-editor ol {
          margin: 0.5rem 0;
          padding-left: 1.5rem;
        }
        
        .professional-rich-text-editor .ql-editor li {
          margin: 0.25rem 0;
        }
        
        .professional-rich-text-editor .ql-editor blockquote {
          border-left: 4px solid hsl(var(--border));
          padding-left: 1rem;
          margin: 1rem 0;
          font-style: italic;
          color: hsl(var(--muted-foreground));
        }
        
        .professional-rich-text-editor .ql-editor code {
          background: hsl(var(--muted));
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          font-family: 'Courier New', monospace;
          font-size: 0.875em;
        }
        
        .professional-rich-text-editor .ql-editor pre {
          background: hsl(var(--muted));
          padding: 1rem;
          border-radius: 0.375rem;
          overflow-x: auto;
          margin: 1rem 0;
        }
        
        .professional-rich-text-editor .ql-editor a {
          color: hsl(var(--primary));
          text-decoration: underline;
        }
        
        .professional-rich-text-editor .ql-editor a:hover {
          color: hsl(var(--primary));
          opacity: 0.8;
        }
        
        .professional-rich-text-editor .ql-editor img {
          max-width: 100%;
          height: auto;
          border-radius: 0.375rem;
          margin: 0.5rem 0;
        }
        
        .professional-rich-text-editor .ql-editor p {
          margin: 0.5rem 0;
        }
        
        .professional-rich-text-editor .ql-editor p:first-child {
          margin-top: 0;
        }
        
        .professional-rich-text-editor .ql-editor p:last-child {
          margin-bottom: 0;
        }
      `}</style>
    </div>
  );
};

export default ProfessionalRichTextEditor;
