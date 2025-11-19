'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import useSticky from '@/hooks/use-sticky';
import ScrollToTop from '@/hooks/scroll-to-top';
import { Mail } from 'lucide-react';
import Script from 'next/script';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Load Vorix CSS
  useEffect(() => {
    // Create link elements for CSS files
    const cssFiles = [
      '/assets/vorix/css/bootstrap.min.css',
      '/assets/vorix/css/animate.css',
      '/assets/vorix/css/swiper-bundle.min.css',
      '/assets/vorix/css/style.css',
    ];

    // Google Fonts
    const googleFonts = [
      'https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&family=Unbounded:wght@200..900&display=swap',
      'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200',
      'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200',
      'https://fonts.googleapis.com/css2?family=Material+Symbols+Sharp:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200',
    ];

    const allCssFiles = [...cssFiles, ...googleFonts];
    const linkElements: HTMLLinkElement[] = [];

    allCssFiles.forEach(href => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
      linkElements.push(link);
    });

    // Cleanup on unmount
    return () => {
      linkElements.forEach(link => {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
      });
    };
  }, []);
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('marketing-theme') || 'light-mode';
    }
    return 'light-mode';
  });

  const [menuOpen, setMenuOpen] = useState(false);
  const { sticky } = useSticky();

  useEffect(() => {
    // Apply theme class to body
    document.body.className = theme;
    localStorage.setItem('marketing-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light-mode' ? 'dark-mode' : 'light-mode'));
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="marketing-layout">
      {/* Header */}
      <header className={`header-area ${sticky ? 'sticky-on' : ''} ${menuOpen ? 'mobile-menu-open' : ''}`}>
        <nav className="navbar navbar-expand-lg">
          <div className="container">
            {/* Logo */}
            <Link className="navbar-brand" href="/" onClick={closeMenu}>
              <img 
                className="dark-logo" 
                src="/assets/vorix/img/core-img/logo.svg" 
                alt="EaseMail" 
                style={{ height: '40px' }}
              />
              <img 
                className="light-logo" 
                src="/assets/vorix/img/core-img/logo-light.svg" 
                alt="EaseMail" 
                style={{ height: '40px' }}
              />
            </Link>

            {/* Mobile Toggle */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="navbar-toggler"
              type="button"
              aria-label="Toggle navigation"
            >
              <span className="material-symbols-outlined">view_cozy</span>
            </button>

            {/* Navigation */}
            <div className={`collapse navbar-collapse justify-content-end ${menuOpen ? 'show' : ''}`}>
              <ul className="navbar-nav navbar-nav-scroll">
                <li>
                  <Link href="/" onClick={closeMenu}>Home</Link>
                </li>
                <li>
                  <Link href="/features" onClick={closeMenu}>Features</Link>
                </li>
                <li>
                  <Link href="/ai-features" onClick={closeMenu}>AI Features</Link>
                </li>
                <li>
                  <Link href="/pricing" onClick={closeMenu}>Pricing</Link>
                </li>
                <li>
                  <Link href="/faq" onClick={closeMenu}>FAQ</Link>
                </li>
                <li>
                  <Link href="/contact" onClick={closeMenu}>Contact</Link>
                </li>
              </ul>

              <div className="d-flex align-items-center gap-2">
                {/* Theme Toggle */}
                <button
                  id="theme-toggle"
                  onClick={toggleTheme}
                  className={`theme-btn ${theme === 'light-mode' ? '' : 'light-mode-active'}`}
                  aria-label="Toggle theme"
                >
                  <span className="material-symbols-outlined moon">clear_day</span>
                  <span className="material-symbols-outlined sun">bedtime</span>
                </button>

                {/* Login Button */}
                <Link className="btn btn-outline-primary d-none d-sm-inline-flex" href="/login" onClick={closeMenu}>
                  <span>LOG IN</span>
                </Link>

                {/* Get Started Button */}
                <Link className="btn btn-primary" href="/signup" onClick={closeMenu}>
                  <span>GET STARTED</span>
                  <span>GET STARTED</span>
                </Link>
              </div>
            </div>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="footer-wrapper">
        <div className="divider"></div>

        <div className="container">
          <div className="row g-5">
            {/* Brand Column */}
            <div className="col-12 col-md-6 col-xl">
              <div className="footer-card">
                <Link href="/">
                  <img 
                    className="dark-logo" 
                    src="/assets/vorix/img/core-img/logo.svg" 
                    alt="EaseMail" 
                    style={{ height: '36px', marginBottom: '1rem' }}
                  />
                  <img 
                    className="light-logo" 
                    src="/assets/vorix/img/core-img/logo-light.svg" 
                    alt="EaseMail" 
                    style={{ height: '36px', marginBottom: '1rem' }}
                  />
                </Link>
                <p className="mb-0">
                  AI-powered email management that transforms how you communicate. 
                  Smart, efficient, and built for the modern professional.
                </p>

                {/* Social Links */}
                <div className="social-nav mt-4">
                  <a href="https://twitter.com/easemail" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865z" />
                    </svg>
                  </a>
                  <a href="https://linkedin.com/company/easemail" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854zm4.943 12.248V6.169H2.542v7.225zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248S2.4 3.226 2.4 3.934c0 .694.521 1.248 1.327 1.248zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016l.016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225z" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>

            {/* Product Column */}
            <div className="col-12 col-md-6 col-xl">
              <div className="footer-card">
                <h5 className="mb-0">Product</h5>
                <ul className="footer-nav">
                  <li><Link href="/features">Features</Link></li>
                  <li><Link href="/ai-features">AI Features</Link></li>
                  <li><Link href="/use-cases">Use Cases</Link></li>
                  <li><Link href="/pricing">Pricing</Link></li>
                </ul>
              </div>
            </div>

            {/* Support Column */}
            <div className="col-12 col-md-6 col-xl">
              <div className="footer-card">
                <h5 className="mb-0">Support</h5>
                <ul className="footer-nav">
                  <li><Link href="/faq">FAQ</Link></li>
                  <li><Link href="/contact">Contact Us</Link></li>
                  <li><a href="mailto:support@easemail.app">Email Support</a></li>
                  <li><Link href="/about">About Us</Link></li>
                </ul>
              </div>
            </div>

            {/* Newsletter Column */}
            <div className="col-12 col-md-6 col-xl-4">
              <div className="footer-card">
                <h5 className="mb-0">Stay Updated</h5>
                <p className="text-sm mb-3">Get the latest updates on new features and releases.</p>
                <form className="subscribe-form" onSubmit={(e) => e.preventDefault()}>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="Enter your email"
                    required
                  />
                  <button className="btn" type="submit" aria-label="Subscribe">
                    <span className="material-symbols-outlined">arrow_forward</span>
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </button>
                </form>
                <div className="form-check mt-3">
                  <input className="form-check-input" type="checkbox" id="privacyCheck" />
                  <label className="form-check-label ps-2 text-sm" htmlFor="privacyCheck">
                    I agree with the <Link href="/legal/privacy">privacy policy</Link>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="container">
          <div className="footer-line"></div>
        </div>

        {/* Bottom Footer */}
        <div className="container">
          <div className="row align-items-center">
            <div className="col-12 col-lg-6">
              <p className="mb-0 copyright">
                Copyright © {new Date().getFullYear()} <Link href="/">EaseMail</Link>. All rights reserved.
              </p>
            </div>
            <div className="col-12 col-lg-6">
              <div className="footer-bottom-nav">
                <Link href="/legal/terms">Terms & Conditions</Link>
                <Link href="/legal/privacy">Privacy Policy</Link>
              </div>
            </div>
          </div>
        </div>

        <div className="divider-sm"></div>
      </footer>

      {/* Scroll to Top */}
      <ScrollToTop />
    </div>
  );
}
