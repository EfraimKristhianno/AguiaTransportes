import { useRef, useState, useCallback, useEffect } from "react";
import { Paperclip, X, FileText, Image, File as FileIcon } from "lucide-react";

interface UploadedFile {
  id: string;
  file: globalThis.File;
  preview?: string;
}

interface FileUploadAreaProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
}

const getFileIcon = (type: string) => {
  if (type.startsWith("image/")) return Image;
  if (type.includes("pdf") || type.includes("document") || type.includes("text")) return FileText;
  return FileIcon;
};

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const FileUploadArea = ({ files, onFilesChange }: FileUploadAreaProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<UploadedFile[]>(files);
  filesRef.current = files;

  const [isDragging, setIsDragging] = useState(false);
  const isSelectingFileRef = useRef(false);

  // On mobile, opening the camera/gallery sends the app to background.
  // We track this so parent dialogs know a selection is in progress and should NOT close.
  // When the user returns, visibilitychange fires before the input's onChange.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && isSelectingFileRef.current) {
        // User returned from camera/gallery – keep flag active until onChange fires
        // Set a timeout fallback: if onChange doesn't fire within 2s, user cancelled
        setTimeout(() => {
          isSelectingFileRef.current = false;
        }, 2000);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const addFiles = useCallback(
    (newFiles: FileList | null) => {
      isSelectingFileRef.current = false;
      if (!newFiles || newFiles.length === 0) return;
      const added: UploadedFile[] = Array.from(newFiles).map((file) => {
        const entry: UploadedFile = { id: crypto.randomUUID(), file };
        if (file.type.startsWith("image/")) {
          entry.preview = URL.createObjectURL(file);
        }
        return entry;
      });
      // Use ref to always get the latest files, avoiding stale closure on mobile
      onFilesChange([...filesRef.current, ...added]);
    },
    [onFilesChange]
  );

  const handleAreaClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isSelectingFileRef.current = true;
    inputRef.current?.click();
  };

  const removeFile = (id: string) => {
    const updated = files.filter((f) => {
      if (f.id === id && f.preview) URL.revokeObjectURL(f.preview);
      return f.id !== id;
    });
    onFilesChange(updated);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground">Anexar arquivos</label>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={handleAreaClick}
        className={`
          flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 
          cursor-pointer transition-all duration-200
          ${isDragging
            ? "border-primary bg-accent"
            : "border-border hover:border-primary/50 hover:bg-accent/50"
          }
        `}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent">
          <Paperclip className="h-5 w-5 text-accent-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">
          Toque para selecionar arquivos
        </p>
        <p className="text-xs text-muted-foreground">
          ou arraste e solte aqui
        </p>
      </div>

      {/* Mobile-safe: opacity 0 instead of display:none/hidden to avoid iOS clickjacking guard */}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.gif,.webp,.heic,.bmp,.svg,.pdf,.doc,.docx,.xls,.xlsx,.txt"
        style={{ opacity: 0, position: 'absolute', zIndex: -1, width: 1, height: 1, overflow: 'hidden' }}
        tabIndex={-1}
        onBlur={() => {
          // On some mobile browsers, blur fires when the picker opens – ignore it
        }}
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {/* File list */}
      {files.length > 0 && (
        <ul className="space-y-2 animate-fade-in">
          {files.map((f) => {
            const Icon = getFileIcon(f.file.type);
            return (
              <li
                key={f.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
              >
                {f.preview ? (
                  <img
                    src={f.preview}
                    alt=""
                    className="h-10 w-10 rounded-md object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent">
                    <Icon className="h-5 w-5 text-accent-foreground" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {f.file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatSize(f.file.size)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(f.id);
                  }}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default FileUploadArea;
export type { UploadedFile };
