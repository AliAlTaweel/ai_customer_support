import HomeCTA from "@/components/HomeCTA";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ShieldCheck, Zap, Globe } from "lucide-react";

export default function Home() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 max-w-7xl">
      <section className="text-center mb-24 max-w-4xl mx-auto">
        <h2 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 bg-gradient-to-br from-primary to-indigo-700 bg-clip-text text-transparent drop-shadow-sm">
          Intelligent Support for Modern Problems
        </h2>
        <p className="text-xl text-muted-foreground/80 max-w-3xl mx-auto mb-10 leading-relaxed font-light">
          Managing your orders has never been simpler. Access your history,
          track shipments, and get AI-powered assistance for all your needs.
        </p>
        <div className="flex justify-center animate-in fade-in slide-in-from-bottom-4 duration-700">
          <HomeCTA />
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="border-primary/5 bg-card/80 backdrop-blur-md hover-lift border-t-4 border-t-primary/40">
          <CardHeader>
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 ring-1 ring-primary/20">
              <Globe className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">Real-time Tracking</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">
              Get instant updates on your orders from warehouse to doorstep with our integrated tracking system.
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/5 bg-card/80 backdrop-blur-md hover-lift border-t-4 border-t-primary/40">
          <CardHeader>
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-4 ring-1 ring-indigo-500/20">
              <Zap className="w-6 h-6 text-indigo-600" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">AI Assistance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">
              Human-like support for common issues, available 24/7 to help you resolve problems instantly.
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/5 bg-card/80 backdrop-blur-md hover-lift border-t-4 border-t-primary/40">
          <CardHeader>
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4 ring-1 ring-blue-500/20">
              <ShieldCheck className="w-6 h-6 text-blue-600" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">Secure Portal</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">
              Enterprise-grade security powered by Clerk authentication ensures your data is always protected.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
