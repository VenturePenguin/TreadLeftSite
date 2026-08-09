'use client';

import { useRef, useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import 'react-quill/dist/quill.snow.css';

const ReactQuill = dynamic(
  () => import('react-quill'),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 w-full animate-pulse rounded-md bg-slate-100" />
    ),
  }
) as any;

interface PostEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const BUCKET_NAME = 'blog-assets';

export default function PostEditor({
  value,
  onChange,
  placeholder = 'Write your post...',
}: PostEditorProps) {
  const quillRef = useRef<any>(null);
  const [isUploading, setIsUploading] = useState(false);

  const imageHandler = useCallback(() => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.style.display = 'none';

    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;

      setIsUploading(true);
      try {
        const fileExt = file.name.split('.').pop() ?? 'png';
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type,
          });

        if (uploadError) {
          console.error('[PostEditor] Image upload failed:', uploadError);
          window.alert(`Image upload failed: ${uploadError.message}`);
          return;
        }

        const { data: publicUrlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(filePath);

        const publicUrl = publicUrlData.publicUrl;

        const editor = quillRef.current?.getEditor();
        if (!editor) return;

        const range = editor.getSelection(true);
        const index = range ? range.index : editor.getLength();
        editor.insertEmbed(index, 'image', publicUrl);
        editor.setSelection(index + 1, 0);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('[PostEditor] Exception during image upload:', err);
        window.alert(`Image upload failed: ${message}`);
      } finally {
        setIsUploading(false);
        input.remove();
      }
    });

    document.body.appendChild(input);
    input.click();
  }, []);

  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          [{ header: [1, 2, false] }],
          ['bold', 'italic', 'underline', 'blockquote'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['link', 'image'],
          ['clean'],
        ],
        handlers: {
          image: imageHandler,
        },
      },
    }),
    [imageHandler]
  );

  const formats = [
    'header',
    'bold',
    'italic',
    'underline',
    'blockquote',
    'list',
    'bullet',
    'link',
    'image',
  ];

  return (
    <div className="relative">
      {isUploading && (
        <div className="absolute right-2 top-2 z-10 flex items-center gap-2 rounded-md bg-white/90 px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Uploading...
        </div>
      )}
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        className="min-h-[400px] rounded-md border border-slate-200 bg-white"
      />
    </div>
  );
}
