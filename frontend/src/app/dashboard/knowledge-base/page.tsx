"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useOrganization } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft, 
  UploadCloud, 
  Trash2, 
  Loader2, 
  FileText, 
  Search, 
  AlertCircle, 
  CheckCircle,
  Database,
  RefreshCw,
  HardDrive
} from "lucide-react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

export default function KnowledgeBasePage() {
  const { isLoaded, userId, getToken } = useAuth();
  const { organization } = useOrganization();
  const router = useRouter();

  const [faqs, setFaqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchFaqs = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/tenant/faq`, { headers });
      if (!res.ok) {
        throw new Error(await res.text() || "Failed to fetch FAQ knowledge base.");
      }
      const data = await res.json();
      setFaqs(data.faqs || []);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to contact API server.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (isLoaded && !userId) {
      router.push("/sign-in");
    } else if (isLoaded && userId) {
      fetchFaqs();
    }
  }, [isLoaded, userId, router, fetchFaqs]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_BASE}/tenant/faq/upload`, {
        method: "POST",
        headers,
        body: formData,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Failed to upload file.");
      }

      setSuccess(`Successfully processed and indexed ${file.name}!`);
      setFile(null);
      await fetchFaqs();
    } catch (e: any) {
      setError(e.message || "Failed to upload file.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm("Are you sure you want to delete all indexed FAQ embeddings for this tenant? This action cannot be undone.")) {
      return;
    }
    setDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/tenant/faq`, {
        method: "DELETE",
        headers,
      });

      if (!res.ok) {
        throw new Error("Failed to clear database embeddings.");
      }

      setSuccess("Successfully cleared all FAQ embeddings.");
      setFaqs([]);
    } catch (e: any) {
      setError(e.message || "Failed to clear knowledge base.");
    } finally {
      setDeleting(false);
    }
  };

  const filteredFaqs = faqs.filter(faq => 
    faq.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isLoaded || loading) {
    return (
      <div className="min-h-[70vh] bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground text-sm">Loading Knowledge Base...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fetchFaqs(true)}
            disabled={refreshing}
            className="border-white/5 bg-white/5 hover:bg-white/10 rounded-xl h-9 gap-2 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Title Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-8">
          <div>
            <h1 className="text-4xl font-extrabold font-outfit tracking-tight mb-2">
              Knowledge Base Manager
            </h1>
            <p className="text-muted-foreground">
              Provide documentation for the AI Agent's RAG system (Supabase pgvector).
            </p>
          </div>
          <div>
            <Badge variant="outline" className="border-primary/20 text-primary py-1 px-3">
              {organization?.name || "Personal Workspace"}
            </Badge>
          </div>
        </div>

        {/* Global Notifications */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive p-5 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        )}
        {success && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-500 p-5 rounded-2xl flex items-start gap-3">
            <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm font-semibold">{success}</p>
          </div>
        )}

        {/* Warning if no organization */}
        {!organization && (
          <div className="p-6 bg-yellow-500/10 border border-yellow-500/20 rounded-3xl text-center space-y-2">
            <h3 className="font-bold text-yellow-500">Authentication Warning</h3>
            <p className="text-sm text-muted-foreground">
              Please join or select a Clerk organization to upload and retrieve tenant FAQ records.
            </p>
          </div>
        )}

        {organization && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left: Drag & Drop upload */}
            <div className="lg:col-span-5 space-y-6">
              <Card className="border-none bg-secondary/10 backdrop-blur-xl rounded-[2.5rem] border border-white/5 p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-bold font-outfit">Upload Document</h3>
                  <p className="text-xs text-muted-foreground mt-1">Upload FAQs in CSV, PDF, Markdown, or TXT format.</p>
                </div>

                <div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`h-60 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all duration-300 ${
                    dragActive 
                      ? "border-primary bg-primary/5 scale-95" 
                      : file 
                        ? "border-emerald-500/40 bg-emerald-500/5"
                        : "border-white/10 bg-black/40 hover:bg-white/[0.02]"
                  }`}
                  onClick={() => document.getElementById("file-input")?.click()}
                >
                  <input 
                    id="file-input"
                    type="file"
                    className="hidden"
                    accept=".csv,.pdf,.txt,.md"
                    onChange={handleFileChange}
                  />

                  {file ? (
                    <div className="space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto text-emerald-400">
                        <FileText className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-semibold truncate max-w-[200px]">{file.name}</p>
                      <p className="text-[10px] text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto text-muted-foreground">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-semibold">Drag & drop your file here</p>
                      <p className="text-[10px] text-muted-foreground">Supports CSV, PDF, Markdown, TXT up to 10MB</p>
                    </div>
                  )}
                </div>

                {file && (
                  <div className="flex gap-3">
                    <Button 
                      onClick={handleUpload}
                      disabled={uploading}
                      className="flex-1 h-12 rounded-2xl gap-2 font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Indexing...
                        </>
                      ) : (
                        <>
                          Generate & Save Embeddings
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setFile(null)}
                      disabled={uploading}
                      className="h-12 rounded-2xl border-white/5 bg-secondary/20 hover:bg-white/5"
                    >
                      Clear
                    </Button>
                  </div>
                )}
              </Card>

              {faqs.length > 0 && (
                <Card className="border-none bg-secondary/10 backdrop-blur-xl rounded-[2.5rem] border border-white/5 p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">Wipe Knowledge Base</h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Delete all chunks and vectors for this tenant.</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline"
                    onClick={handleDeleteAll}
                    disabled={deleting}
                    className="w-full h-11 rounded-2xl border-destructive/20 bg-destructive/5 hover:bg-destructive/10 text-destructive font-semibold"
                  >
                    {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete All Data"}
                  </Button>
                </Card>
              )}
            </div>

            {/* Right: Active Documents / FAQ Chunks */}
            <div className="lg:col-span-7 space-y-6">
              <Card className="border-none bg-secondary/10 backdrop-blur-xl rounded-[2.5rem] border border-white/5 p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold font-outfit flex items-center gap-2">
                      <Database className="w-4 h-4 text-primary" /> Active Knowledge Base
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">Currently indexed chunks in pgvector.</p>
                  </div>
                  <Badge variant="outline" className="border-white/5 bg-black/40 text-slate-300 rounded-full py-1 px-3 self-start">
                    {faqs.length} chunks stored
                  </Badge>
                </div>

                <div className="relative">
                  <Input 
                    placeholder="Search indexed chunks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-black/40 border border-white/5 rounded-2xl pl-10 pr-4 h-11 text-sm focus:ring-1 focus:ring-primary outline-none"
                  />
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3.5" />
                </div>

                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                  {filteredFaqs.length === 0 ? (
                    <div className="text-center py-20 bg-black/20 rounded-3xl border border-white/5 p-8">
                      <HardDrive className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                      <h4 className="font-bold text-sm">No indexed content</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {searchQuery ? "No chunks match your search query." : "Upload a file on the left to start indexing."}
                      </p>
                    </div>
                  ) : (
                    filteredFaqs.map((faq) => (
                      <div 
                        key={faq.id}
                        className="bg-black/40 border border-white/5 p-5 rounded-2xl space-y-3 transition-all hover:bg-white/[0.01]"
                      >
                        <p className="text-xs text-slate-300 leading-relaxed font-mono whitespace-pre-wrap">
                          {faq.text}
                        </p>
                        <div className="flex items-center justify-between text-[9px] text-muted-foreground border-t border-white/5 pt-2">
                          <span>Indexed: {new Date(faq.createdAt).toLocaleString()}</span>
                          <span className="font-mono">ID: {faq.id.split('-')[0]}...</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
