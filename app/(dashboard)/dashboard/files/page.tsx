"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { createClient } from "@/supabase/client";
import {
  UploadCloud,
  FileText,
  Trash2,
  Eye,
  Search,
  Plus,
  Loader2,
  Clock,
  Download,
  File as FileIcon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type Document = {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  created_at: string;
};

export default function FilesPage() {
  const supabase = createClient();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  const [search, setSearch] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  async function onFileSelect(file: File) {
    if (!file) return;
    
    if (file.type !== "application/pdf") {
      return toast.error("Only PDF files are allowed.");
    }
    if (file.size > 10 * 1024 * 1024) {
      return toast.error("File size exceeds 10MB limit.");
    }

    setIsUploading(true);
    setUploadProgress(20);
    setUploadStatus("Uploading to storage...");
    
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      setUploadProgress(70);
      setUploadStatus("Saving metadata...");
      
      const contentType = res.headers.get("content-type");
      let data;
      
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        throw new Error("Server error. Please try again.");
      }

      if (!res.ok) {
        throw new Error(data.error || "Failed to upload");
      }

      setUploadProgress(100);
      toast.success("File uploaded successfully!");
      await loadDocuments();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStatus("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFileSelect(file);
  };

  async function removeDocument(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this file?")) return;
    
    try {
      const { error } = await supabase.from("documents").delete().eq("id", id);
      if (error) throw error;
      setDocuments((old) => old.filter((doc) => doc.id !== id));
      toast.success("File deleted");
    } catch (error: any) {
      toast.error(error.message);
    }
  }

  const filteredDocs = documents.filter(d => d.file_name.toLowerCase().includes(search.toLowerCase()));

  const formatSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-600">
            Notes & Files
          </h1>
          <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-lg">
            Manage your study materials and PDFs in one place.
          </p>
        </div>
        <div className="relative w-full md:w-80 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-border/60 bg-card/50 py-2.5 sm:py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-muted-foreground shadow-sm"
            placeholder="Search files..."
          />
        </div>
      </div>

      <div className="grid gap-6 sm:gap-8">
        {/* Upload Section */}
        <div 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "glass rounded-2xl sm:rounded-3xl p-6 sm:p-10 border-2 border-dashed transition-all duration-300 relative overflow-hidden group",
            isDragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-border/60 hover:border-primary/40 hover:bg-primary/[0.02]",
            isUploading && "pointer-events-none opacity-80"
          )}
        >
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])}
            accept=".pdf" 
            className="hidden" 
          />
          
          <div className="flex flex-col items-center text-center space-y-3 sm:space-y-4">
            <div className={cn(
              "h-14 w-14 sm:h-20 sm:w-20 rounded-2xl sm:rounded-3xl flex items-center justify-center transition-all duration-500",
              isDragging ? "bg-primary text-white rotate-12" : "bg-primary/10 text-primary group-hover:rotate-6"
            )}>
              {isUploading ? (
                <Loader2 className="h-6 w-6 sm:h-10 sm:w-10 animate-spin" />
              ) : (
                <UploadCloud className="h-6 w-6 sm:h-10 sm:w-10" />
              )}
            </div>
            
            <div className="space-y-1 sm:space-y-2">
              <h3 className="text-xl sm:text-2xl font-bold">
                {isUploading ? "Uploading file..." : "Drop your PDF here"}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
                PDF format only • Max 10MB per file
              </p>
            </div>

            {!isUploading && (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl sm:rounded-2xl bg-primary px-6 sm:px-8 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-1 transition-all flex items-center gap-2"
              >
                <Plus className="h-4 w-4 sm:h-5 sm:w-5" /> Select File
              </button>
            )}

            {isUploading && (
              <div className="w-full max-w-xs space-y-2 pt-2 sm:pt-4">
                <div className="h-1.5 sm:h-2 w-full bg-muted rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-[10px] sm:text-xs font-medium text-primary animate-pulse">
                  {uploadStatus}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Files List */}
        <div className="space-y-4">
          <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <FileIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" /> Your Library
          </h2>
          
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
                ))
              ) : filteredDocs.length === 0 ? (
                <div className="col-span-full py-12 sm:py-16 text-center glass rounded-2xl sm:rounded-3xl border-dashed border-border/50">
                  <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm sm:text-base text-muted-foreground font-medium">Your library is empty.</p>
                </div>
              ) : (
                filteredDocs.map((doc) => (
                  <motion.div
                    key={doc.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass group p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-transparent hover:border-primary/20 transition-all flex flex-col justify-between h-full relative"
                  >
                    <div className="flex gap-3 sm:gap-4">
                      <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg sm:rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-xs sm:text-sm truncate pr-8" title={doc.file_name}>{doc.file_name}</h4>
                        <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-1 mt-1.5 sm:mt-2 text-[9px] sm:text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                          <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> {new Date(doc.created_at).toLocaleDateString()}</span>
                          <span>{formatSize(doc.file_size)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border/50">
                      <button 
                        onClick={() => window.open(doc.file_url, '_blank')}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg sm:rounded-xl bg-foreground text-background py-2 text-[11px] sm:text-xs font-bold hover:opacity-90 transition-all shrink-0"
                      >
                        <Eye className="h-3.5 w-3.5 shrink-0" /> View
                      </button>
                      <a 
                        href={doc.file_url} 
                        download={doc.file_name}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-lg sm:rounded-xl border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0"
                      >
                        <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </a>
                      <button 
                        onClick={(e) => removeDocument(doc.id, e)}
                        className="p-2 rounded-lg sm:rounded-xl border border-border hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
