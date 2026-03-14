import { Switch, Route, Router as WouterRouter, Link, useRoute } from 'wouter';
import FaceScanner from './pages/FaceScanner';
import FaceRegistration from './pages/FaceRegistration';

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const [active] = useRoute(href);
  return (
    <Link href={href} className={`nav-link ${active ? 'active' : ''}`}>
      {children}
    </Link>
  );
}

function Nav() {
  return (
    <nav className="app-nav">
      <div className="nav-brand">
        <div className="brand-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor"/>
          </svg>
        </div>
        <span className="brand-name">AK Pack <span className="brand-accent">Face ID</span></span>
      </div>
      <div className="nav-links">
        <NavLink href="/">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="nav-icon">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
            <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/>
            <path d="M6 20c0-3.31 2.69-6 6-6s6 2.69 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Face Scanner
        </NavLink>
        <NavLink href="/register">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="nav-icon">
            <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/>
            <path d="M20 19c0-3.87-3.58-7-8-7s-8 3.13-8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M19 12v6M16 15h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Register Face
        </NavLink>
      </div>
    </nav>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={FaceScanner} />
      <Route path="/register" component={FaceRegistration} />
    </Switch>
  );
}

export default function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <div className="app-shell">
        <Nav />
        <main className="app-main">
          <Router />
        </main>
      </div>
    </WouterRouter>
  );
}
