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

// Convert a browser-decodable image (including HEIC on Safari/iOS) to a
// cross-browser JPEG. We also downscale to a max 1600px edge to avoid
// huge file sizes in blog posts.
function convertHeicToJpeg(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    const timer = window.setTimeout(() => {
      URL.revokeObjectURL(url);
      reject('Image decoding timed out. HEIC/HEIF is not supported in this browser.');
    }, 15000);

    img.onload = () => {
      window.clearTimeout(timer);

      const maxDim = 1600;
      const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
      const width = Math.round(img.naturalWidth * scale);
      const height = Math.round(img.naturalHeight * scale);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject('Canvas not available in this browser.');
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          if (!blob) {
            reject('Could not convert image to JPEG.');
          } else {
            resolve(blob);
          }
        },
        'image/jpeg',
        0.92
      );
    };

    img.onerror = () => {
      window.clearTimeout(timer);
      URL.revokeObjectURL(url);
      reject('Image could not be decoded in this browser. HEIC/HEIF files need to be converted to JPG/PNG first.');
    };

    img.src = url;
  });
}

// Detect HEIC/HEIF by extension/type or by the ISO BMFF ftyp brand.
// Catches misnamed files where the extension has been changed to .jpg.
async function fileIsHeic(file: File): Promise<boolean> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'heic' || ext === 'heif') return true;
  if (file.type === 'image/heic' || file.type === 'image/heif') return true;

  try {
    const buf = await file.slice(0, 32).arrayBuffer();
    const bytes = new Uint8Array(buf);
    const ftyp = String.fromCharCode(...bytes.slice(4, 8));
    if (ftyp !== 'ftyp') return false;

    const brand = String.fromCharCode(...bytes.slice(8, 12));
    const compatible = String.fromCharCode(...bytes.slice(12, 32));
    const brands = ['heic', 'heix', 'heis', 'heim', 'mif1', 'heif'];
    return brands.includes(brand) || brands.some((b) => compatible.includes(b));
  } catch {
    return false;
  }
}

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
        // it natively. Use the browser's own decoder to convert it to a JPEG.
        // If the browser can't decode it, the user has to convert it manually.
        const isHeic = await fileIsHeic(file);

        if (isHeic) {
          try {
            uploadFile = await convertHeicToJpeg(file);
            fileExt = 'jpg';
            contentType = 'image/jpeg';
          } catch (conversionErr) {
            console.error('[PostEditor] HEIC conversion failed:', conversionErr);
            window.alert(
              "This photo's HEIC/HEIF format couldn't be converted in this browser. " +
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
