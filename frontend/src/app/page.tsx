import HomeCTA from "@/components/HomeCTA";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ShieldCheck, Zap, Globe } from "lucide-react";

export default function Home() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 max-w-7xl">
      <section className="text-center mb-24 max-w-4xl mx-auto">
        <h2 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
          Intelligent Support for Modern Problems
        </h2>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          Managing your orders has never been simpler. Access your order history,
          track shipments, and get AI-powered assistance for all your customer support needs.
        </p>
        <HomeCTA />
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:-translate-y-2 transition-transform duration-300">
          <CardHeader>
            <Globe className="w-10 h-10 text-primary mb-2" />
            <CardTitle className="text-2xl font-bold tracking-tight">Real-time Tracking</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">
              Get instant updates on your orders from warehouse to doorstep with our integrated tracking system.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:-translate-y-2 transition-transform duration-300">
          <CardHeader>
            <Zap className="w-10 h-10 text-primary mb-2" />
            <CardTitle className="text-2xl font-bold tracking-tight">AI Assistance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">
              Human-like support for common issues, available 24/7 to help you resolve problems instantly.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:-translate-y-2 transition-transform duration-300">
          <CardHeader>
            <ShieldCheck className="w-10 h-10 text-primary mb-2" />
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
