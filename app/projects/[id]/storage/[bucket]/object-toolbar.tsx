"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, FolderPlus, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  createFolderAction,
  presignUploadAction,
} from "@/app/actions";

export function ObjectToolbar({
  projectId,
  branchId,
  bucketName,
  prefix,
}: {
  projectId: string;
  branchId: string;
  bucketName: string;
  prefix: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [folderOpen, setFolderOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [folderError, setFolderError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError(null);
    try {
      for (const file of Array.from(files)) {
        const key = `${prefix}${file.name}`;
        const presigned = await presignUploadAction(
          projectId,
          branchId,
          bucketName,
          key,
          file.type || "application/octet-stream"
        );
        if (!presigned.ok) {
          setUploadError(presigned.error);
          break;
        }
        const res = await fetch(presigned.url, {
          method: presigned.method,
          headers: presigned.headers,
          body: file,
        });
        if (!res.ok) {
          setUploadError(`Upload failed for ${file.name} (${res.status}).`);
          break;
        }
      }
      router.refresh();
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.refresh()}
        aria-label="Refresh objects"
      >
        <RefreshCw className="h-3.5 w-3.5" />
      </Button>

      <Dialog
        open={folderOpen}
        onOpenChange={(o) => {
          setFolderOpen(o);
          if (!o) {
            setFolderName("");
            setFolderError(null);
          }
        }}
      >
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <FolderPlus className="h-3.5 w-3.5" />
            New folder
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
          </DialogHeader>
          <form
            action={async (formData: FormData) => {
              const result = await createFolderAction(formData);
              if (!result.ok) {
                setFolderError(result.error);
                return;
              }
              setFolderOpen(false);
              router.refresh();
            }}
            className="space-y-3"
          >
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="branchId" value={branchId} />
            <input type="hidden" name="bucketName" value={bucketName} />
            <input type="hidden" name="prefix" value={prefix} />
            <div className="space-y-1.5">
              <Label htmlFor="folder-name">Folder name</Label>
              <Input
                id="folder-name"
                name="name"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="uploads"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                required
              />
            </div>
            {folderError && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <div className="font-mono">{folderError}</div>
              </div>
            )}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <SubmitButton disabled={!folderName.trim()} pendingLabel="Creating…">
                Create folder
              </SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <input
        ref={fileRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <Button
        size="sm"
        className="bg-foreground text-background hover:bg-foreground/90"
        disabled={uploading}
        onClick={() => fileRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Upload className="h-3.5 w-3.5" />
        )}
        Upload
      </Button>

      {uploadError && (
        <span className="text-xs text-destructive font-mono max-w-[200px] truncate" title={uploadError}>
          {uploadError}
        </span>
      )}
    </div>
  );
}
