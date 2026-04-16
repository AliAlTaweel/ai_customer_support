'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Send, Database, RefreshCw, Terminal, CheckCircle2, AlertCircle, Search } from 'lucide-react';

export default function IndexingPage() {
  const [status, setStatus] = useState<'Ready' | 'Not Indexed' | 'Indexing'>('Not Indexed');
  const [isSyncing, setIsSyncing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Fetch initial status
  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const fetchStatus = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/indexing/status');
      const data = await res.json();
      setStatus(data.status);
    } catch (error) {
      console.error('Failed to fetch status:', error);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setStatus('Indexing');
    setLogs(prev => [...prev, '[SYSTEM] Starting indexing process...', 'Reading FAQ/faq.json...', 'Generating embeddings via Ollama...']);
    
    try {
      const res = await fetch('http://localhost:8000/api/indexing/run', { method: 'POST' });
      const data = await res.json();
      if (data.status === 'success') {
        setLogs(prev => [...prev, `[SUCCESS] Indexed ${data.count} entries.`, 'ChromaDB collection updated.']);
        setStatus('Ready');
      } else {
        throw new Error('Sync failed');
      }
    } catch (error) {
      setLogs(prev => [...prev, '[ERROR] Indexing failed. Make sure backend and Ollama are running.']);
      setStatus('Not Indexed');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    const userMsg = chatMessage;
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatMessage('');
    setIsChatLoading(true);

    try {
      const res = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg }),
      });
      const data = await res.json();
      setChatHistory(prev => [...prev, { role: 'assistant', content: data.answer }]);
    } catch (error) {
      setChatHistory(prev => [...prev, { role: 'assistant', content: 'Sorry, I failed to connect to the brain.' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            Knowledge Indexing
          </h1>
          <p className="text-muted-foreground mt-2">Manage your local RAG knowledge base and vector store.</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant={status === 'Ready' ? 'default' : status === 'Indexing' ? 'secondary' : 'outline'} className="px-4 py-1 text-sm">
            {status === 'Ready' ? <CheckCircle2 className="w-3 h-3 mr-2" /> : status === 'Indexing' ? <RefreshCw className="w-3 h-3 mr-2 animate-spin" /> : <AlertCircle className="w-3 h-3 mr-2" />}
            {status}
          </Badge>
          <Button onClick={handleSync} disabled={isSyncing} className="bg-blue-600 hover:bg-blue-700">
            {isSyncing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Database className="w-4 h-4 mr-2" />}
            Sync Knowledge
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Control & Logs */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="w-5 h-5" />
                Index Progress
              </CardTitle>
              <CardDescription>Real-time updates from the indexing engine.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-black/80 rounded-lg p-4 font-mono text-xs text-emerald-400 h-64 overflow-y-auto scrollbar-hide">
                {logs.length === 0 && <span className="text-zinc-600">Waiting for trigger...</span>}
                {logs.map((log, i) => (
                  <div key={i} className="mb-1">
                    <span className="text-zinc-500 mr-2">[{new Date().toLocaleTimeString()}]</span>
                    {log}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Source Document</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">FAQ/faq.json</div>
                <p className="text-xs text-muted-foreground">Main knowledge source</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Embedding Model</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">nomic-embed-text</div>
                <p className="text-xs text-muted-foreground">Via Local Ollama</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right: Assistant Chat */}
        <Card className="flex flex-col h-[600px] border-border/40 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-400" />
              Indexing Assistant
            </CardTitle>
            <CardDescription>Ask me anything about the knowledge base.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-4 pr-2">
            {chatHistory.length === 0 && (
              <div className="text-center text-muted-foreground mt-10">
                <p>Hello! I can help you verify what's in your vector store.</p>
                <p className="text-xs mt-2">Example: "What services do we have?"</p>
              </div>
            )}
            {chatHistory.map((chat, i) => (
              <div key={i} className={`flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${chat.role === 'user' ? 'bg-blue-600 text-white' : 'bg-secondary'}`}>
                  {chat.content}
                </div>
              </div>
            ))}
            {isChatLoading && (
              <div className="flex justify-start">
                <div className="bg-secondary rounded-2xl px-4 py-2 text-sm animate-pulse">Thinking...</div>
              </div>
            )}
          </CardContent>
          <Separator />
          <CardFooter className="p-4">
            <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2">
              <Input
                placeholder="Type your message..."
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                autoComplete="off"
              />
              <Button type="submit" size="icon" disabled={isChatLoading || !chatMessage.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
