'use client';

import { useRef, useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import 'react-quill/dist/quill.snow.css';

const ReactQuill = dynamic(
  async () => {
    const { default: RQ } = await import('react-quill');
    // next/dynamic does not forward refs by default, which silently breaks
    // imperative access to the Quill instance (e.g. the image upload handler).
    // Wrap in a small forwardRef component to pass the ref through.
    return function ForwardedReactQuill({ forwardedRef, ...props }: any) {
      return <RQ ref={forwardedRef} {...props} />;
    };
  },
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
        let uploadFile: File | Blob = file;
        let fileExt = file.name.split('.').pop()?.toLowerCase() ?? 'png';
        let contentType = file.type;

        // HEIC/HEIF (default iPhone photo format) isn't renderable in an <img>
        // tag by most browsers (Chrome, Firefox, etc.) - only Safari/iOS support
        // it natively. Convert to JPEG client-side so it displays everywhere.
        const isHeic =
          fileExt === 'heic' ||
          fileExt === 'heif' ||
          file.type === 'image/heic' ||
          file.type === 'image/heif';

        if (isHeic) {
          try {
            const heic2any = (await import('heic2any')).default;
            const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 });
            uploadFile = Array.isArray(converted) ? converted[0] : converted;
            fileExt = 'jpg';
            contentType = 'image/jpeg';
          } catch (conversionErr) {
            // Some HEIC variants (e.g. certain burst/live-photo profiles) aren't
            // supported by the client-side decoder. Don't upload a file that
            // will just show as broken - guide the user to convert it instead.
            console.error('[PostEditor] HEIC conversion failed:', conversionErr);
            window.alert(
              "This photo's HEIC format couldn't be converted automatically. " +
                'Please convert it to JPG or PNG first (e.g. open it in Photos and use "Export" or "Share" as JPEG), then try uploading again.'
            );
            return;
          }
        }

        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(filePath, uploadFile, {
            cacheControl: '3600',
            upsert: false,
            contentType,
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
        if (!editor) {
          window.alert('Editor not ready. Please try again in a moment.');
          return;
        }

        const range = editor.getSelection(true);
        const index = range ? range.index : editor.getLength();
        editor.insertEmbed(index, 'image', publicUrl);
        editor.setSelection(index + 1, 0);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : typeof err === 'string'
              ? err
              : (err as any)?.message ?? JSON.stringify(err);
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
        forwardedRef={quillRef}
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
