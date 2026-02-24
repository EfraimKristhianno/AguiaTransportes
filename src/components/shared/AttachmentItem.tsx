import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Paperclip, Loader2, Download } from 'lucide-react';

interface AttachmentItemProps {
  path: string;
  index: number;
  bucket?: string;
}

const isImagePath = (path: string) => /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(path);

const getAttachmentName = (path: string) => path.split('/').pop() || path;

export const AttachmentItem = ({ path, index, bucket = 'request-attachments' }: AttachmentItemProps) => {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUrl = async () => {
      setLoading(true);
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 3600);
      if (error) {
        console.error('AttachmentItem: erro ao gerar URL assinada', { path, error });
      } else if (data?.signedUrl) {
        setUrl(data.signedUrl);
      }
      setLoading(false);
    };
    fetchUrl();
  }, [path]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>Carregando anexo...</span>
      </div>
    );
  }

  if (!url) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive py-1">
        <Paperclip className="h-3.5 w-3.5" />
        <span>Erro ao carregar anexo</span>
      </div>
    );
  }

  if (isImagePath(path)) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block">
        <img
          src={url}
          alt={`Anexo ${index + 1}`}
          className="rounded-md max-h-40 object-cover border border-border hover:opacity-90 transition-opacity"
        />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 text-sm text-primary hover:underline"
    >
      <Download className="h-3.5 w-3.5" />
      {getAttachmentName(path)}
    </a>
  );
};
