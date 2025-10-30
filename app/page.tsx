import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <header className="border-b border-border">
        <nav className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg"></div>
              <span className="text-2xl font-bold">EaseMail</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost">Login</Button>
              </Link>
              <Link href="/signup">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="container mx-auto px-6 py-24 text-center">
          <h1 className="text-6xl font-bold mb-6">
            The Future of
            <span className="text-primary"> Email Management</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Enterprise-grade email client powered by AI. Manage multiple accounts, 
            collaborate with your team, and never miss an important message.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" className="text-lg px-8">
                Start Free Trial
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="text-lg px-8">
                View Pricing
              </Button>
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="container mx-auto px-6 py-24 bg-card">
          <h2 className="text-4xl font-bold text-center mb-16">Powerful Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 border border-border rounded-lg">
              <div className="w-12 h-12 bg-primary rounded-lg mb-4"></div>
              <h3 className="text-xl font-bold mb-2">Unified Inbox</h3>
              <p className="text-muted-foreground">
                Connect multiple email accounts and manage them all in one place.
              </p>
            </div>
            <div className="p-6 border border-border rounded-lg">
              <div className="w-12 h-12 bg-primary rounded-lg mb-4"></div>
              <h3 className="text-xl font-bold mb-2">AI-Powered</h3>
              <p className="text-muted-foreground">
                Smart categorization, email summaries, and automated responses.
              </p>
            </div>
            <div className="p-6 border border-border rounded-lg">
              <div className="w-12 h-12 bg-primary rounded-lg mb-4"></div>
              <h3 className="text-xl font-bold mb-2">Contact Management</h3>
              <p className="text-muted-foreground">
                Advanced CRM features with activity tracking and insights.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-6 py-24 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to transform your email?</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of professionals who trust EaseMail.
          </p>
          <Link href="/signup">
            <Button size="lg" className="text-lg px-8">
              Get Started Free
            </Button>
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground">© 2025 EaseMail. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="/privacy" className="text-muted-foreground hover:text-foreground">
                Privacy
              </Link>
              <Link href="/terms" className="text-muted-foreground hover:text-foreground">
                Terms
              </Link>
              <Link href="/contact" className="text-muted-foreground hover:text-foreground">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}


