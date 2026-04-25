import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Shield, Zap, Globe } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-5rem)]">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-24 md:py-32">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full" />
        </div>
        
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 backdrop-blur-sm border border-primary/10 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">New Arrival: UltraTech M3 Laptops</span>
          </div>
          
          <h1 className="text-5xl md:text-8xl font-bold font-outfit tracking-tight mb-8 bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/50 animate-in fade-in slide-in-from-bottom-8 duration-700">
            Elevate Your <br /> <span className="text-primary italic">Digital Lifestyle.</span>
          </h1>
          
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground mb-12 animate-in fade-in slide-in-from-bottom-12 duration-1000">
            Discover a curated collection of premium electronics, fashion, and home essentials
            designed for the modern innovator. Quality meets aesthetic.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200">
            <Button asChild size="lg" className="h-14 px-10 rounded-2xl text-lg font-semibold gap-2 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-primary/20">
              <Link href="/shop">
                Shop Collection <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
            <Button variant="ghost" size="lg" className="h-14 px-10 rounded-2xl text-lg font-medium hover:bg-secondary/50">
              View Lookbook
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-secondary/20 border-y border-primary/5">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-background/50 backdrop-blur-sm border border-primary/5 hover:border-primary/20 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold font-outfit mb-3">Lightning Fast</h3>
              <p className="text-muted-foreground leading-relaxed">
                Experience same-day delivery on selected premium items across major metropolitan areas.
              </p>
            </div>
            
            <div className="p-8 rounded-3xl bg-background/50 backdrop-blur-sm border border-primary/5 hover:border-primary/20 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold font-outfit mb-3">Verified Quality</h3>
              <p className="text-muted-foreground leading-relaxed">
                Every product in our catalog undergoes a rigorous 12-point quality inspection before shipping.
              </p>
            </div>
            
            <div className="p-8 rounded-3xl bg-background/50 backdrop-blur-sm border border-primary/5 hover:border-primary/20 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Globe className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold font-outfit mb-3">Global Curation</h3>
              <p className="text-muted-foreground leading-relaxed">
                We source our products from artisans and tech-hubs around the globe, ensuring unique selections.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Categories Preview */}
      <section className="py-32">
        <div className="container mx-auto px-4">
          <div className="flex items-end justify-between mb-16">
            <div>
              <h2 className="text-3xl md:text-5xl font-bold font-outfit tracking-tight mb-4">Focus Genres</h2>
              <p className="text-muted-foreground text-lg">Our most popular categories of the season.</p>
            </div>
            <Button variant="link" className="text-primary font-semibold text-lg hidden sm:flex">
              Explore All <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {['electronics', 'clothing', 'home_garden', 'sports'].map((cat, i) => (
               <Link 
                href={`/shop?category=${cat}`} 
                key={cat}
                className="relative aspect-[4/5] rounded-[2.5rem] overflow-hidden group border border-primary/10"
               >
                 <Image 
                  src={`/images/${cat}/${cat === 'electronics' ? 'ultratech_laptop.png' : cat === 'clothing' ? 'urbanstyle_hoodie.png' : cat === 'home_garden' ? 'ecocomfort_chair.png' : 'titanium_yoga_mat.png'}`}
                  alt={cat}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-110 grayscale-[30%] group-hover:grayscale-0"
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-8">
                    <h4 className="text-2xl font-bold text-white font-outfit uppercase tracking-tighter">
                      {cat.replace('_', ' & ')}
                    </h4>
                    <p className="text-white/60 text-sm mt-2 opacity-0 group-hover:opacity-100 transition-opacity translate-y-4 group-hover:translate-y-0 duration-300">
                      Browse Full Collection
                    </p>
                 </div>
               </Link>
            ))}
          </div>
        </div>
      </section>
      
      {/* Newsletter */}
      <section className="py-32 container mx-auto px-4">
        <div className="rounded-[3rem] bg-primary p-12 md:p-24 text-primary-foreground text-center relative overflow-hidden shadow-2xl shadow-primary/40">
           <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[80px] rounded-full -mr-32 -mt-32" />
           <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 blur-[80px] rounded-full -ml-32 -mb-32" />
           
           <h2 className="text-4xl md:text-6xl font-bold font-outfit mb-8 relative z-10">
             Join the inner <span className="text-black italic">circle.</span>
           </h2>
           <p className="text-primary-foreground/80 text-lg mb-12 max-w-xl mx-auto relative z-10">
             Subscribe to get early access to new drops, exclusive discounts, and minimalist lifestyle tips.
           </p>
           
           <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
              <input 
                type="email" 
                placeholder="Enter your email" 
                className="h-14 px-8 rounded-2xl bg-white/10 border border-white/20 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/40 w-full max-w-sm backdrop-blur-md"
              />
              <Button size="lg" variant="secondary" className="h-14 px-10 rounded-2xl text-lg font-bold">
                Subscribe
              </Button>
           </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-20 border-t border-primary/5 bg-secondary/10">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-12 text-center md:text-left">
          <div className="col-span-1 md:col-span-1">
             <div className="flex items-center justify-center md:justify-start gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg font-outfit">L</span>
              </div>
              <span className="text-lg font-bold font-outfit tracking-tight">LuxeCatalog</span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Premium commerce simplified. Designed for the modern age with attention to detail and user experience.
            </p>
          </div>
          
          <div>
            <h5 className="font-bold mb-6 font-outfit uppercase text-xs tracking-widest text-primary">Shop</h5>
            <ul className="space-y-4 text-sm text-muted-foreground">
              <li><Link href="/shop" className="hover:text-primary transition-colors">All Products</Link></li>
              <li><Link href="/shop?category=electronics" className="hover:text-primary transition-colors">Electronics</Link></li>
              <li><Link href="/shop?category=clothing" className="hover:text-primary transition-colors">Clothing</Link></li>
              <li><Link href="/shop?category=home_garden" className="hover:text-primary transition-colors">Home & Garden</Link></li>
            </ul>
          </div>
          
          <div>
            <h5 className="font-bold mb-6 font-outfit uppercase text-xs tracking-widest text-primary">Company</h5>
            <ul className="space-y-4 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Ethical Sourcing</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Press</a></li>
            </ul>
          </div>
          
          <div>
            <h5 className="font-bold mb-6 font-outfit uppercase text-xs tracking-widest text-primary">Support</h5>
            <ul className="space-y-4 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Shipping Policy</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Returns & Exchanges</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Privacy Center</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-20 pt-8 border-t border-primary/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground uppercase tracking-widest">
           <p>© 2026 LuxeCatalog Inc. All rights reserved.</p>
           <div className="flex items-center gap-8">
              <a href="#" className="hover:text-primary">Twitter</a>
              <a href="#" className="hover:text-primary">Instagram</a>
              <a href="#" className="hover:text-primary">LinkedIn</a>
           </div>
        </div>
      </footer>
    </div>
  );
}
