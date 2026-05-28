import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="h-20 border-b border-border flex items-center justify-between px-6 md:px-12 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2 text-primary font-bold text-xl tracking-tight">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
            <path d="M3 3v18h18" />
            <path d="M7 14l4-4 4 4 6-6" />
            <path d="M18 8h3v3" />
          </svg>
          NEXUS TRADING
        </div>
        <div className="flex gap-4">
          <Link href="/sign-in">
            <Button variant="ghost" className="hidden md:flex">Sign In</Button>
          </Link>
          <Link href="/sign-up">
            <Button>Get Started</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 max-w-4xl mx-auto">
        <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-8">
          <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
          Terminal Online
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6">
          Quantify your <span className="text-primary text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">Edge</span>
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl leading-relaxed">
          The terminal for serious traders. Log setups, analyze performance, and extract alpha across equities, forex, and crypto. No noise, just data.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          <Link href="/sign-up" className="w-full sm:w-auto">
            <Button size="lg" className="w-full text-lg h-14 px-8 shadow-[0_0_20px_rgba(0,255,65,0.3)] hover:shadow-[0_0_30px_rgba(0,255,65,0.5)] transition-shadow">
              Initialize Terminal
            </Button>
          </Link>
        </div>
      </main>
    </div>
  )
}
