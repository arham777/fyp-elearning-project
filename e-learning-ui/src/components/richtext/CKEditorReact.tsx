import React from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';

export type RichTextEditorProps = {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  height?: number; // min height in px
  className?: string;
  id?: string;
};

const CKEditorReact: React.FC<RichTextEditorProps> = ({
  value = '',
  onChange,
  placeholder,
  disabled = false,
  height = 300,
  className,
  id,
}) => {
  const config: any = {
    placeholder,
    toolbar: [
      'undo', 'redo', '|',
      'heading', '|',
      'bold', 'italic', 'link', '|',
      'bulletedList', 'numberedList', '|',
      'blockQuote'
    ],
    link: { addTargetToExternalLinks: true, defaultProtocol: 'https://' },
  };

  return (
    <div className={className} id={id}>
      <CKEditor
        editor={ClassicEditor}
        data={value || ''}
        disabled={disabled}
        config={config}
        onReady={(editor: any) => {
          try {
            const editableEl = editor.ui.view.editable.element as HTMLElement;
            if (editableEl) {
              editableEl.style.minHeight = `${height}px`;
            }
            editor.editing.view.focus();
          } catch {}
        }}
        onChange={(_event: any, editor: any) => {
          try {
            const data = editor.getData();
            onChange?.(data);
          } catch {}
        }}
      />
    </div>
  );
};

export default CKEditorReact;
