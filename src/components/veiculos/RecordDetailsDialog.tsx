import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { AttachmentItem } from '@/components/shared/AttachmentItem';

interface RecordDetailsDialogProps {
  notes: string | null | undefined;
  title?: string;
}

const parseNotesAndAttachments = (notes: string | null | undefined) => {
  if (!notes) return { text: '', attachments: [] as string[] };
  const match = notes.match(/\[anexos:([^\]]+)\]/);
  const attachments = match ? match[1].split(',').map(p => p.trim()).filter(Boolean) : [];
  const text = notes.replace(/\n?\[anexos:[^\]]+\]/, '').trim();
  return { text, attachments };
};

const RecordDetailsDialog = ({ notes, title = 'Detalhes do Registro' }: RecordDetailsDialogProps) => {
  const [open, setOpen] = useState(false);
  const { text, attachments } = parseNotesAndAttachments(notes);

  const hasContent = text || attachments.length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">{title}</DialogTitle>
        </DialogHeader>
        {!hasContent ? (
          <p className="text-sm text-muted-foreground py-4">Nenhuma observação ou anexo registrado.</p>
        ) : (
          <div className="space-y-4">
            {text && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Observações</p>
                <p className="text-sm whitespace-pre-wrap">{text}</p>
              </div>
            )}
            {attachments.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Anexos ({attachments.length})</p>
                <div className="space-y-2">
                  {attachments.map((path, i) => (
                    <AttachmentItem key={path} path={path} index={i} bucket="vehicle-attachments" />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RecordDetailsDialog;
