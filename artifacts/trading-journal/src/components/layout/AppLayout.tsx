'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useClerk, useUser } from '@clerk/nextjs'
import {
  LayoutDashboard,
  List,
  LineChart,
  Calendar as CalendarIcon,
  BookOpen,
  ShieldAlert,
  LogOut,
  Menu
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useState } from 'react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/trades', label: 'Trade Log', icon: List },
  { href: '/analytics', label: 'Analytics', icon: LineChart },
  { href: '/calendar', label: 'Calendar', icon: CalendarIcon },
  { href: '/playbook', label: 'Playbook', icon: BookOpen },
  { href: '/risk', label: 'Risk', icon: ShieldAlert },
]

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { signOut } = useClerk()
  const { user } = useUser()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const NavLinks = () => (
    <>
      {navItems.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link key={item.href} href={item.href}>
            <div
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer ${
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
              }`}
            >
              <item.icon className="h-4 w-4" />
              <span className="font-medium">{item.label}</span>
            </div>
          </Link>
        )
      })}
    </>
  )

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-sidebar h-screen sticky top-0">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <div className="flex items-center gap-2 text-primary font-bold text-lg tracking-tight">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
              <path d="M3 3v18h18" />
              <path d="M7 14l4-4 4 4 6-6" />
              <path d="M18 8h3v3" />
            </svg>
            NEXUS TRADING
          </div>
        </div>
        <div className="flex-1 overflow-auto py-4 px-3 space-y-1">
          <NavLinks />
        </div>
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold uppercase">
              {user?.firstName?.[0] || user?.emailAddresses[0]?.emailAddress?.[0] || 'U'}
            </div>
            <div className="flex-1 truncate">
              <p className="text-sm font-medium truncate">{user?.fullName || 'Trader'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.emailAddresses[0]?.emailAddress}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={() => signOut({ redirectUrl: '/' })}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </Button>
        </div>
      </aside>

      <header className="md:hidden h-16 border-b border-border bg-sidebar flex items-center justify-between px-4 sticky top-0 z-50">
        <div className="flex items-center gap-2 text-primary font-bold">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
            <path d="M3 3v18h18" />
            <path d="M7 14l4-4 4 4 6-6" />
            <path d="M18 8h3v3" />
          </svg>
          NEXUS
        </div>
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-foreground">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 bg-sidebar border-r-border p-0 flex flex-col">
            <div className="h-16 flex items-center px-6 border-b border-border">
              <span className="text-primary font-bold">MENU</span>
            </div>
            <div className="flex-1 overflow-auto py-4 px-3 space-y-1" onClick={() => setIsMobileMenuOpen(false)}>
              <NavLinks />
            </div>
            <div className="p-4 border-t border-border">
              <Button
                variant="ghost"
                className="w-full justify-start text-muted-foreground"
                onClick={() => signOut({ redirectUrl: '/' })}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </header>

      <main className="flex-1 flex flex-col min-h-0 overflow-auto">
        <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  )
}
