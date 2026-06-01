"use client";

import { useAuth, useOrganization, useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Database, 
  Settings, 
  Code, 
  Copy, 
  Check, 
  ArrowRight,
  TrendingUp, 
  MessageSquare,
  Sparkles,
  Layers,
  CheckCircle2
} from "lucide-react";
import Link from "next/link";

export default function TenantDashboard() {
  const { isLoaded, userId } = useAuth();
  const { organization } = useOrganization();
  const { user } = useUser();
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isLoaded && !userId) {
      router.push("/sign-in");
    }
  }, [isLoaded, userId, router]);

  if (!isLoaded || !userId) {
    return (
      <div className="min-h-[70vh] bg-black flex items-center justify-center">
        <div className="w-8 h-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const publicTenantKey = organization?.id || "tenant_pub_guest_workspace";
  const widgetScriptCode = `<!-- Luxe AI Customer Support Chat Widget -->
<script 
  src="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/widget.js" 
  data-tenant-key="${publicTenantKey}"
  defer>
</script>`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(widgetScriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-8">
          <div>
            <h1 className="text-4xl font-extrabold font-outfit tracking-tight mb-2">
              Welcome, {user?.firstName || "Partner"}
            </h1>
            <p className="text-muted-foreground">
              Manage your AI agents, custom knowledge base, and live widget integrations.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="border-primary/20 text-primary py-1 px-3">
              {organization?.name || "Personal Workspace"}
            </Badge>
            {!organization && (
              <Badge variant="destructive" className="py-1 px-3">
                No Organization Joined
              </Badge>
            )}
          </div>
        </div>

        {/* Setup Warning if not in Org */}
        {!organization && (
          <div className="p-6 bg-yellow-500/10 border border-yellow-500/20 rounded-3xl flex items-start gap-4">
            <Sparkles className="w-6 h-6 text-yellow-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-bold text-yellow-500">Enable Multi-Tenancy</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Please create or select an organization in the header switcher to access isolated database storage, upload custom RAG data, and generate valid widget integration script tags.
              </p>
            </div>
          </div>
        )}

        {/* Dashboard Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Knowledge Base Card */}
          <Card className="border-none bg-secondary/10 backdrop-blur-xl rounded-[2.5rem] border border-white/5 overflow-hidden transition-all hover:bg-secondary/15 group">
            <CardHeader className="p-8">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 transition-transform group-hover:scale-110 duration-300">
                <Database className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold font-outfit">Knowledge Base (RAG)</CardTitle>
              <CardDescription className="text-muted-foreground text-sm leading-relaxed mt-2">
                Upload Markdown, CSV, or PDF files. Our backend automatically chunks the text, computes vector embeddings, and stores them securely in isolated pgvector databases.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8 pt-0">
              <Link href="/dashboard/knowledge-base">
                <Button className="w-full h-12 rounded-2xl gap-2 font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all">
                  Manage Knowledge Base <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Config Card */}
          <Card className="border-none bg-secondary/10 backdrop-blur-xl rounded-[2.5rem] border border-white/5 overflow-hidden transition-all hover:bg-secondary/15 group">
            <CardHeader className="p-8">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-4 transition-transform group-hover:scale-110 duration-300">
                <Settings className="w-6 h-6 text-purple-400" />
              </div>
              <CardTitle className="text-2xl font-bold font-outfit">Agent Settings</CardTitle>
              <CardDescription className="text-muted-foreground text-sm leading-relaxed mt-2">
                Configure your AI Agent persona, customized base prompt instructions, accent colors, custom welcome triggers, and custom avatar assets for the widget.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8 pt-0">
              <Button disabled variant="outline" className="w-full h-12 rounded-2xl border-white/5 bg-secondary/20 hover:bg-white/5 cursor-not-allowed">
                Customizer (Phase 3)
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Script Embed integration section */}
        {organization && (
          <Card className="border-none bg-secondary/10 backdrop-blur-xl rounded-[2.5rem] border border-white/5 p-8 md:p-10 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Code className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold font-outfit">Connect to your Website</h3>
                <p className="text-sm text-muted-foreground">Add the following script code to your HTML file to load the chat bubble.</p>
              </div>
            </div>

            <div className="relative">
              <pre className="bg-black/60 rounded-2xl p-6 border border-white/5 text-xs font-mono text-emerald-400/90 leading-relaxed overflow-x-auto select-all">
                {widgetScriptCode}
              </pre>
              <Button
                variant="ghost"
                size="icon"
                onClick={copyToClipboard}
                className="absolute top-4 right-4 h-10 w-10 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 text-white"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 text-xs text-muted-foreground bg-white/[0.02] border border-white/5 p-4 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
              <p>
                <strong>Security Guard Note</strong>: Whitelist your domain names (origins) in settings to restrict access to your key. Anonymous requests originating from unauthorized domains will be rejected by our CORS gateway.
              </p>
            </div>
          </Card>
        )}

      </div>
    </div>
  );
}
