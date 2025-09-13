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
  // Track last HTML we emitted to avoid feedback loops
  const lastHtmlRef = useRef<string | null>(null);

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
        // Ensure Quill knows which element is scrollable for auto-scrolling to the caret
        scrollingContainer: editorRef.current,
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

      // Set initial content safely via Quill clipboard so internal Delta stays consistent
      if (value) {
        lastHtmlRef.current = value;
        // Use clipboard API to avoid selection reset bugs
        if (typeof quill.clipboard?.dangerouslyPasteHTML === 'function') {
          quill.clipboard.dangerouslyPasteHTML(value, 'api');
        } else {
          quill.root.innerHTML = value;
        }
      }

      // Helper to keep the caret in view within our scrolling container
      const ensureCaretInView = () => {
        try {
          const scrollEl: HTMLElement | null = editorRef.current;
          if (!scrollEl) return;
          const range = quill.getSelection();
          if (!range) return;
          const bounds = quill.getBounds(range.index, range.length || 0);
          const margin = 16; // some breathing room
          const top = bounds.top;
          const bottom = (bounds as any).bottom ?? (bounds.top + bounds.height);
          const viewTop = scrollEl.scrollTop;
          const viewBottom = viewTop + scrollEl.clientHeight;
          if (bottom + margin > viewBottom) {
            scrollEl.scrollTop = bottom + margin - scrollEl.clientHeight;
          } else if (top - margin < viewTop) {
            scrollEl.scrollTop = Math.max(0, top - margin);
          }
        } catch (_) { /* ignore */ }
      };

      // Handle changes
      const changeHandler = (_delta: any, _oldDelta: any, source: 'user' | 'api' | 'silent') => {
        if (!mountedRef.current) return;
        // Only propagate changes that originated from the user to avoid loops
        if (source !== 'user') return;
        const html = quill.root.innerHTML;
        lastHtmlRef.current = html;
        onChange?.(html === '<p><br></p>' ? '' : html);
        // Keep caret visible when typing near the bottom
        ensureCaretInView();
      };

      quill.on('text-change', changeHandler);

      // Also react to manual selection changes (mouse click, arrow keys)
      const selHandler = (_range: any, _old: any, source: 'user' | 'api' | 'silent') => {
        if (source === 'user') ensureCaretInView();
      };
      quill.on('selection-change', selHandler);

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
          quillRef.current.off('selection-change');
        } catch (e) {
          // Ignore cleanup errors
        }
        quillRef.current = null;
      }
    };
  }, [isLoaded]);

  // Update content when value prop changes
  useEffect(() => {
    if (!quillRef.current || value === undefined || !mountedRef.current) return;
    const quill = quillRef.current;
    const currentHtml = quill.root.innerHTML;
    // Ignore updates that we ourselves just emitted
    if (value === currentHtml || value === lastHtmlRef.current) return;
    // Preserve cursor position if possible
    const savedRange = quill.getSelection();
    if (typeof quill.clipboard?.dangerouslyPasteHTML === 'function') {
      quill.clipboard.dangerouslyPasteHTML(value || '', 'api');
    } else {
      quill.root.innerHTML = value || '';
    }
    if (savedRange) {
      try { quill.setSelection(savedRange); } catch { /* noop */ }
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
    <div
      className={`professional-rich-text-editor ${className}`}
      id={id}
      style={{ ['--editor-height' as any]: `${height}px` }}
    >
      <div 
        ref={editorRef}
        className="bg-background"
      />
      <style>{`
        /* Wrapper keeps radius and clips inner borders for a clean edge */
        .professional-rich-text-editor {
          background: oklch(var(--background));
          border-radius: 0.375rem;
          overflow: hidden;
          position: relative;
          border: 1px solid oklch(var(--border));
        }
        
        /* Toolbar: bottom divider only (sides provided by wrapper) */
        .professional-rich-text-editor .ql-toolbar {
          box-sizing: border-box;
          border: 0;
          border-bottom: 1px solid oklch(var(--border));
          background: oklch(var(--background));
          border-radius: 0.375rem 0.375rem 0 0;
        }
        
        .professional-rich-text-editor .ql-container {
          box-sizing: border-box;
          border: 0;
          border-radius: 0 0 0.375rem 0.375rem;
          font-family: inherit;
          /* Make the editor area scrollable while keeping a fixed working height */
          min-height: var(--editor-height, 300px);
          max-height: var(--editor-height, 300px);
          overflow-y: auto;
          overflow-x: hidden;
          position: relative;
          /* No bottom border; wrapper provides outer frame */
        }
        
        .professional-rich-text-editor .ql-editor {
          color: oklch(var(--foreground));
          font-size: 14px;
          line-height: 1.5;
          /* Give a bit of padding inside the editor */
          padding: 12px 14px;
        }
        
        .professional-rich-text-editor .ql-editor.ql-blank::before {
          color: oklch(var(--muted-foreground));
          font-style: normal;
        }
        
        /* Dark mode support */
        .dark .professional-rich-text-editor .ql-toolbar {
          background: oklch(var(--background));
          border-color: oklch(var(--border));
        }
        
        .dark .professional-rich-text-editor .ql-toolbar .ql-stroke {
          stroke: oklch(var(--foreground));
        }
        
        .dark .professional-rich-text-editor .ql-toolbar .ql-fill {
          fill: oklch(var(--foreground));
        }
        
        .dark .professional-rich-text-editor .ql-toolbar button:hover {
          background: oklch(var(--muted));
        }
        
        .dark .professional-rich-text-editor .ql-toolbar button.ql-active {
          background: oklch(var(--accent-neutral));
        }
        
        .dark .professional-rich-text-editor .ql-container {
          border-color: oklch(var(--border));
        }
        
        .dark .professional-rich-text-editor .ql-editor {
          background: oklch(var(--background));
          color: oklch(var(--foreground));
        }
        
        /* Dropdown styling */
        .professional-rich-text-editor .ql-picker-options {
          background: oklch(var(--background));
          border: 1px solid oklch(var(--border));
          border-radius: 0.375rem;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        }
        
        .professional-rich-text-editor .ql-picker-item {
          color: oklch(var(--foreground));
        }
        
        .professional-rich-text-editor .ql-picker-item:hover {
          background: oklch(var(--muted));
        }
        
        /* Link tooltip */
        .professional-rich-text-editor .ql-tooltip {
          background: oklch(var(--background));
          border: 1px solid oklch(var(--border));
          border-radius: 0.375rem;
          color: oklch(var(--foreground));
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        }
        
        .professional-rich-text-editor .ql-tooltip input {
          background: oklch(var(--background));
          border: 1px solid oklch(var(--border));
          color: oklch(var(--foreground));
          border-radius: 0.25rem;
          padding: 0.25rem 0.5rem;
        }
        
        .professional-rich-text-editor .ql-tooltip .ql-action,
        .professional-rich-text-editor .ql-tooltip .ql-remove {
          color: oklch(var(--primary));
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
          list-style-position: outside; /* Ensures bullets/numbers are visible */
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
