import React, { useState, useEffect, useContext, createContext } from 'react';
import {
  Routes,
  Route,
  Link,
  NavLink,
  Navigate,
  useNavigate,
  useSearchParams,
  useLocation,
} from 'react-router-dom';
import {
  ArrowUpRight,
  ArrowRight,
  Heart,
  ShieldCheck,
  Clock,
  MapPin,
  Sparkles,
  Gift,
  Check,
  Menu,
  X,
  Copy,
  LogOut,
  Users,
  Calendar,
  Flag,
  Lock,
  ChevronDown,
  Settings,
  Mail,
  CheckCircle2,
  UserRound,
  RefreshCw,
} from 'lucide-react';
import {
  configured,
  supabase,
  formUrl,
  siteUrl,
  defaultSettings,
  rpc,
  read,
  signedPhoto,
  preparePhoto,
} from './lib.js';
import {
  money,
  validateRegistration,
  interestsFromText,
  completion,
  rewardTotals,
  friendlyError,
  localDate,
  safeExternalUrl,
} from './utils.js';
const Ctx = createContext();
const useApp = () => useContext(Ctx);
const durations = [30, 60, 90, 120],
  locations = [
    'Cafe',
    'Restaurant',
    'Public park',
    'Museum',
    'Other public place',
  ];
const districtList = [
  'Dhaka',
  'Chattogram',
  'Sylhet',
  'Rajshahi',
  'Khulna',
  'Barishal',
  'Rangpur',
  'Mymensingh',
  'Gazipur',
  'Narayanganj',
  'Cumilla',
  'Cox’s Bazar',
];
function Field({ label, children, hint, ...props }) {
  const id = React.useId();
  const attrs = {
    id,
    'aria-labelledby': `${id}-label`,
    'aria-describedby': hint ? `${id}-hint` : undefined,
  };
  return (
    <label className="field" htmlFor={id}>
      <span id={`${id}-label`}>{label}</span>
      {children ? (
        React.cloneElement(children, attrs)
      ) : (
        <input {...props} {...attrs} />
      )}{' '}
      {hint && <small id={`${id}-hint`}>{hint}</small>}
    </label>
  );
}
function Notice({ children, type = 'info' }) {
  return (
    <div
      className={`notice ${type}`}
      role={type === 'error' ? 'alert' : 'status'}
    >
      {children}
    </div>
  );
}
function Badge({ value }) {
  return (
    <span className={`badge ${value}`}>
      {String(value || 'pending').replaceAll('_', ' ')}
    </span>
  );
}
function Loading() {
  return (
    <div className="empty">
      <RefreshCw className="spin" />
      <p>Loading your account…</p>
    </div>
  );
}
function PageHead({ eyebrow, title, children }) {
  return (
    <header className="page-head">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      {children && <p>{children}</p>}
    </header>
  );
}
function Setup({ feature = 'This feature' }) {
  return (
    <div className="panel setup">
      <Lock size={32} />
      <h2>{feature} is not connected yet</h2>
      <p>
        This is the static starter version. Add the Supabase project URL and
        browser-safe key, then run the SQL migration to enable real accounts. No
        registrations, payments, or rewards are being simulated.
      </p>
      {formUrl ? (
        <a
          className="button primary"
          href={formUrl}
          target="_blank"
          rel="noreferrer"
        >
          Register with Google Forms <ArrowUpRight size={18} />
        </a>
      ) : (
        <Notice>
          The Google Forms link is also not configured. See the included README.
        </Notice>
      )}
      <Link className="text-link" to="/how-it-works">
        How Datezy works <ArrowRight size={16} />
      </Link>
    </div>
  );
}
function RegisterLink({
  className = 'button primary',
  children = 'Create Your Profile',
}) {
  return !configured && formUrl ? (
    <a className={className} href={formUrl} target="_blank" rel="noreferrer">
      {children}
      <ArrowUpRight size={18} />
    </a>
  ) : (
    <Link className={className} to="/register">
      {children}
      <ArrowUpRight size={18} />
    </Link>
  );
}
function Photo({ path, name }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    let live = true;
    signedPhoto(path).then((u) => {
      if (live) setUrl(u);
    });
    return () => {
      live = false;
    };
  }, [path]);
  return url ? (
    <img src={url} alt={`${name}'s profile`} loading="lazy" />
  ) : (
    <div className="avatar-placeholder">
      <UserRound size={40} />
      <span>Photo not added</span>
    </div>
  );
}
function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    const titles = {
      '/': 'Quick Dating Bangladesh',
      '/register': 'Create your profile',
      '/login': 'Login',
      '/explore': 'Explore profiles',
      '/admin': 'Admin dashboard',
      '/dashboard': 'Your dashboard',
    };
    document.title = `${titles[pathname] || pathname.slice(1).replaceAll('-', ' ')} — Datezy`;
  }, [pathname]);
  return null;
}
export default function App() {
  const [user, setUser] = useState(null),
    [profile, setProfile] = useState(null),
    [admin, setAdmin] = useState(false),
    [settings, setSettings] = useState(defaultSettings),
    [loading, setLoading] = useState(configured),
    [error, setError] = useState(''),
    [menu, setMenu] = useState(false);
  async function reload(u = user) {
    if (!u || !supabase) {
      setProfile(null);
      setAdmin(false);
      return;
    }
    const [{ data: p, error: pe }, { data: role, error: re }] =
      await Promise.all([
        supabase.from('profiles').select('*').eq('id', u.id).maybeSingle(),
        supabase.rpc('is_admin'),
      ]);
    if (pe || re) {
      setError(friendlyError(pe || re));
      setProfile(null);
      setAdmin(false);
    } else {
      setError('');
      setProfile(p);
      setAdmin(!!role);
    }
  }
  async function loadSettings() {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .eq('id', 1)
      .single();
    if (error)
      setError('Database setup is incomplete or unavailable. ' + error.message);
    else setSettings(data);
  }
  useEffect(() => {
    if (!supabase) return;
    let live = true;
    loadSettings();
    supabase.auth.getSession().then(async ({ data, error }) => {
      if (!live) return;
      if (error) setError(error.message);
      setUser(data.session?.user || null);
      await reload(data.session?.user);
      if (live) setLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!live) return;
      setUser(s?.user || null);
      setLoading(true);
      setTimeout(() => {
        reload(s?.user).finally(() => {
          if (live) setLoading(false);
        });
      }, 0);
    });
    return () => {
      live = false;
      subscription.unsubscribe();
    };
  }, []);
  const ctx = {
    user,
    profile,
    admin,
    settings,
    loading,
    error,
    reload,
    loadSettings,
  };
  async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) setError(error.message);
    else {
      setUser(null);
      setProfile(null);
      setAdmin(false);
    }
  }
  return (
    <Ctx.Provider value={ctx}>
      <ScrollTop />
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="container nav">
          <Link
            to="/"
            className="brand"
            aria-label={`${settings.site_name} home`}
          >
            <img
              src={
                /^https:\/\/[^/]+\.supabase\.co\//.test(settings.logo_url)
                  ? settings.logo_url
                  : '/logo.svg'
              }
              alt=""
            />
            {settings.site_name}
            <span className="brand-dot">.</span>
          </Link>
          <nav
            className={menu ? 'nav-links open' : 'nav-links'}
            aria-label="Main navigation"
          >
            <NavLink to="/how-it-works" onClick={() => setMenu(false)}>
              How it works
            </NavLink>
            <NavLink to="/explore" onClick={() => setMenu(false)}>
              Explore
            </NavLink>
            <NavLink to="/about" onClick={() => setMenu(false)}>
              Our story
            </NavLink>
            <NavLink to="/faq" onClick={() => setMenu(false)}>
              FAQs
            </NavLink>
          </nav>
          <div className="nav-actions">
            {user ? (
              <>
                <Link className="button small ghost" to="/dashboard">
                  Dashboard
                </Link>
                <button
                  className="icon-button"
                  onClick={logout}
                  aria-label="Log out"
                >
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <>
                <Link className="login-link" to="/login">
                  Log in
                </Link>
                <RegisterLink className="button primary small">
                  Get started
                </RegisterLink>
              </>
            )}
            <button
              className="icon-button mobile-menu"
              aria-label="Toggle navigation"
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
      {error && (
        <div className="container global-error">
          <Notice type="error">
            {error}{' '}
            <button
              className="text-link"
              onClick={() => {
                loadSettings();
                reload();
              }}
            >
              Retry
            </button>
          </Notice>
        </div>
      )}
      <main id="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/explore" element={<Explore />} />
          <Route
            path="/dashboard"
            element={
              <Guard>
                <Dashboard />
              </Guard>
            }
          />
          <Route
            path="/edit-profile"
            element={
              <Guard>
                <EditProfile />
              </Guard>
            }
          />
          <Route
            path="/referrals"
            element={
              <Guard>
                <ReferralPage />
              </Guard>
            }
          />
          <Route
            path="/payment"
            element={
              <Guard>
                <Payment />
              </Guard>
            }
          />
          <Route path="/admin/login" element={<Login adminLogin />} />
          <Route
            path="/admin"
            element={
              <Guard requireAdmin>
                <Admin />
              </Guard>
            }
          />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/terms" element={<Policy kind="terms" />} />
          <Route path="/privacy" element={<Policy kind="privacy" />} />
          <Route path="/community" element={<Policy kind="community" />} />
          <Route
            path="*"
            element={
              <div className="container page">
                <PageHead title="A little off course." />
                <p>This page doesn’t exist.</p>
                <Link to="/" className="button primary">
                  Back home
                </Link>
              </div>
            }
          />
        </Routes>
      </main>
      <footer className="site-footer">
        <div className="container">
          <div className="footer-top">
            <div>
              <Link to="/" className="brand">
                <img
                  src={
                    /^https:\/\/[^/]+\.supabase\.co\//.test(settings.logo_url)
                      ? settings.logo_url
                      : '/logo.svg'
                  }
                  alt=""
                />
                {settings.site_name}
                <span className="brand-dot">.</span>
              </Link>
              <p>
                Meet Someone New.
                <br />
                Make Time for Connection.
              </p>
              <span className="mini-label">
                Made for Bangladesh · Adults 18+
              </span>
            </div>
            <div>
              <h3>Discover</h3>
              <Link to="/how-it-works">How it works</Link>
              <Link to="/explore">Explore profiles</Link>
              <Link to="/about">About us</Link>
              <Link to="/faq">FAQs</Link>
            </div>
            <div>
              <h3>Your Datezy</h3>
              <Link to="/dashboard">Dashboard</Link>
              <Link to="/referrals">Referrals & rewards</Link>
              <Link to="/payment">Payment instructions</Link>
              <Link to="/contact">Contact & support</Link>
            </div>
            <div>
              <h3>Trust & safety</h3>
              <Link to="/community">Community guidelines</Link>
              <Link to="/privacy">Privacy policy</Link>
              <Link to="/terms">Terms & conditions</Link>
              <Link to="/admin/login">Admin access</Link>
            </div>
          </div>
          <div className="footer-bottom">
            <span>
              © {new Date().getFullYear()} Datezy · English / Bangla planned
            </span>
            <span>
              <ShieldCheck size={15} /> Respect. Consent. Connection.
            </span>
          </div>
        </div>
      </footer>
    </Ctx.Provider>
  );
}
function Guard({ children, requireAdmin = false }) {
  const { user, admin, loading, profile } = useApp();
  if (!configured)
    return (
      <div className="container page">
        <Setup feature={requireAdmin ? 'Admin dashboard' : 'Your account'} />
      </div>
    );
  if (loading) return <Loading />;
  if (!user)
    return <Navigate to={requireAdmin ? '/admin/login' : '/login'} replace />;
  if (requireAdmin && !admin)
    return (
      <div className="container page">
        <Notice type="error">
          Access denied. An administrator role must be assigned securely in
          Supabase.
        </Notice>
      </div>
    );
  if (!requireAdmin && !profile)
    return (
      <div className="container page">
        <Notice type="error">
          Your account profile is unavailable. Ask support to check the database
          setup.
        </Notice>
      </div>
    );
  return children;
}
function Home() {
  const { settings } = useApp();
  return (
    <>
      <section className="hero container">
        <div className="hero-copy">
          <div className="hero-kicker">
            <span className="status-dot" /> A new way to connect in Bangladesh
          </div>
          <h1>
            Make time for
            <br />a <span className="gradient-text">real connection.</span>
          </h1>
          <p className="hero-description">
            Discover new people, start meaningful conversations, and plan
            respectful dates with Datezy.
          </p>
          <div className="hero-buttons">
            <RegisterLink />
            <Link className="button ghost" to="/how-it-works">
              How It Works <ArrowRight size={18} />
            </Link>
          </div>
          <div className="hero-assurances">
            <span>
              <ShieldCheck size={17} /> 18+ community
            </span>
            <span>
              <Heart size={17} /> Consent comes first
            </span>
          </div>
        </div>
        <div
          className="hero-art"
          aria-label="Plan a respectful connection at a public place"
        >
          <div className="orbital orbital-one" />
          <div className="orbital orbital-two" />
          <div className="orbit-label">
            <Sparkles size={16} /> Less scrolling. More connection.
          </div>
          <div className="connection-card">
            <div className="connection-card-top">
              <span className="mini-label">YOUR NEXT CHAPTER</span>
              <span className="symbol-heart">
                <Heart size={19} />
              </span>
            </div>
            <div className="connection-symbol">
              <span className="connection-ring first" />
              <span className="connection-ring second" />
              <span className="spark-mark">✦</span>
            </div>
            <h2>
              Good company.
              <br />
              Great possibilities.
            </h2>
            <p>It starts with a little hello.</p>
            <div className="connection-plan">
              <span>
                <MapPin size={16} /> Somewhere public
              </span>
              <span>
                <Clock size={16} /> At your pace
              </span>
            </div>
          </div>
          <div className="floating-chip">
            <ShieldCheck size={21} />
            <div>
              <strong>Your comfort matters</strong>
              <span>Every step. Every connection.</span>
            </div>
          </div>
          <span className="tiny-star">✧</span>
        </div>
      </section>
      {!configured && (
        <div className="container starter-banner">
          <span className="badge pending">Starter mode</span>
          <p>
            {formUrl
              ? 'Registrations are collected by Google Forms. Built-in accounts are not yet enabled.'
              : 'Preview the website. Registration opens once Supabase or a Google Forms link is configured.'}
          </p>
        </div>
      )}
      <section className="trust-strip">
        <div className="container">
          <span>
            <Lock size={19} /> Private details stay private
          </span>
          <span>
            <ShieldCheck size={19} /> Manually reviewed profiles
          </span>
          <span>
            <MapPin size={19} /> Public-place meetups
          </span>
        </div>
      </section>
      <section className="container section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              CONNECTION, WITHOUT THE COMPLICATION
            </span>
            <h2>
              A little spark.
              <br />A world of possibility.
            </h2>
          </div>
          <p>
            Good connections shouldn’t feel rushed.
            <br />
            Find your people, on your terms.
          </p>
        </div>
        <div className="feature-grid">
          <Feature
            icon={<Users />}
            title="Meet new people"
            text="Discover approved adult profiles and find people who share your interests."
          />
          <Feature
            icon={<Sparkles />}
            title="Express your interests"
            text="Books, coffee, art, cricket. Start with the things that make you, you."
          />
          <Feature
            icon={<Calendar />}
            title="Plan a date"
            text="Pick a day, a duration, and a public place. Send an invitation, not an expectation."
          />
        </div>
      </section>
      <section className="container section steps-section">
        <div className="steps-intro">
          <span className="eyebrow">A BETTER FIRST HELLO</span>
          <h2>
            From a profile
            <br />
            to a possibility.
          </h2>
          <Link className="text-link" to="/how-it-works">
            See how it works <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className="steps-list">
          {[
            [
              '01',
              'Be yourself',
              'Create a profile. Share a little about your interests.',
            ],
            [
              '02',
              'Get approved',
              'Complete the required payment and our separate profile review.',
            ],
            [
              '03',
              'Make a connection',
              'Explore, express interest, and plan a respectful public meetup.',
            ],
          ].map(([n, t, d]) => (
            <div className="step" key={n}>
              <span>{n}</span>
              <div>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
              <ArrowUpRight size={21} />
            </div>
          ))}
        </div>
      </section>
      <section className="container section">
        <div className="reward-banner">
          <div className="reward-symbol">
            <Gift size={46} />
          </div>
          <div>
            <span className="eyebrow">GOOD CONNECTIONS ARE WORTH SHARING</span>
            <h2>
              Bring a friend.
              <br />
              Share the possibilities.
            </h2>
            <p>
              Invite friends and earn {money(settings.referral_reward)} per
              eligible referral, subject to verified payment, approval, and
              fraud review.
            </p>
            <Link className="text-link" to="/referrals">
              Explore referral rewards <ArrowRight size={18} />
            </Link>
          </div>
          <div className="reward-number">
            <span>UP TO</span>
            <strong>{money(settings.referral_reward)}</strong>
            <span>PER ELIGIBLE REFERRAL</span>
            <small>Not guaranteed. Terms apply.</small>
          </div>
        </div>
      </section>
      <section className="container section safety-section">
        <div>
          <span className="eyebrow">BUILT ON TRUST</span>
          <h2>
            Real connection.
            <br />
            Real boundaries.
          </h2>
          <p>
            Datezy is for adults aged 18 and above. Your privacy, comfort, and
            consent always come before a connection.
          </p>
          <Link className="text-link" to="/community">
            Read our community guidelines <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className="safety-cards">
          <Feature
            icon={<ShieldCheck />}
            title="Adult community"
            text="18+ eligibility, manual review, and tools to report or block."
          />
          <Feature
            icon={<Heart />}
            title="Respect & consent"
            text="An invitation is never an obligation. No payment guarantees a date."
          />
        </div>
      </section>
      <section className="container section final-cta">
        <span className="eyebrow">MAKE SPACE FOR SOMETHING NEW</span>
        <h2>
          Your next hello
          <br />
          could be something <em>special.</em>
        </h2>
        <RegisterLink />
        <p>18+ only · Thoughtful profiles · Respectful connections</p>
      </section>
    </>
  );
}
function Feature({ icon, title, text }) {
  return (
    <article className="feature">
      <div className="feature-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}
function HowItWorks() {
  const { settings } = useApp();
  return (
    <div className="container page">
      <PageHead
        eyebrow="SIMPLE. RESPECTFUL. YOUR PACE."
        title="A better way to meet."
      >
        Every connection begins with a choice. Here’s what happens next.
      </PageHead>
      <div className="feature-grid">
        {[
          [
            '01 · Create',
            'Start with yourself',
            'Register as a man or woman, confirm you’re 18+, and add a respectful bio, interests, and location.',
          ],
          [
            '02 · Review',
            'Two separate approvals',
            `Required registration fees are ${money(settings.male_fee)} for men and ${money(settings.female_fee)} for women${settings.fees_enabled ? '' : ' (currently disabled)'}. Payment verification never means your profile is automatically approved.`,
          ],
          [
            '03 · Connect',
            'An invitation, not a promise',
            'Once approved, discover profiles and propose a public-place meeting. The other person freely accepts or declines.',
          ],
        ].map(([n, t, d]) => (
          <article className="panel" key={n}>
            <span className="eyebrow">{n}</span>
            <h2>{t}</h2>
            <p>{d}</p>
          </article>
        ))}
      </div>
      <div className="panel wide-callout">
        <ShieldCheck />
        <div>
          <h2>Safety is part of every step.</h2>
          <p>
            Meet in public, tell someone you trust, arrange your own transport,
            and leave any situation that feels uncomfortable. Never send money
            to another member.
          </p>
        </div>
      </div>
      <RegisterLink />
    </div>
  );
}
function Register() {
  const { settings, user } = useApp();
  const [params] = useSearchParams();
  const [f, setF] = useState({
    full_name: '',
    display_name: '',
    email: '',
    phone: '+880',
    password: '',
    birth_date: '',
    gender: params.get('gender') || 'male',
    preferred_gender: 'any',
    district: 'Dhaka',
    area: '',
    bio: '',
    interests: '',
    duration: 60,
    location_type: 'Cafe',
    referral_code: params.get('ref') || '',
    terms_accepted: false,
    adult_confirmed: false,
    listing_consent: false,
  });
  const [error, setError] = useState(''),
    [success, setSuccess] = useState(''),
    [busy, setBusy] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  if (!configured)
    return (
      <div className="container page">
        <PageHead title="Your next chapter starts here." />
        <Setup feature="Registration" />
      </div>
    );
  if (user) return <Navigate to="/dashboard" replace />;
  async function submit(e) {
    e.preventDefault();
    setError('');
    const issue = validateRegistration(f);
    if (issue) {
      setError(issue);
      return;
    }
    setBusy(true);
    try {
      const { password, email, ...metadata } = f;
      metadata.interests = interestsFromText(f.interests);
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: metadata, emailRedirectTo: `${siteUrl}/dashboard` },
      });
      if (error) throw error;
      setSuccess(
        data.session
          ? 'Your profile was created and is pending approval. Continue to your dashboard to review the payment instructions.'
          : 'Check your email to confirm your account. If you already have an account, log in or reset your password. Profiles remain pending until separate payment and profile reviews.',
      );
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container page narrow">
      <PageHead eyebrow="YOUR FIRST HELLO" title="Create your profile.">
        Adults 18+ only. Your phone, email, and birth date stay private.
      </PageHead>
      {success ? (
        <div className="panel">
          <Notice type="success">{success}</Notice>
          <Link className="button primary" to="/login">
            Continue to login
          </Link>
        </div>
      ) : (
        <form className="panel form-panel" onSubmit={submit}>
          <div className="segmented" aria-label="Registration options">
            <button
              type="button"
              className={f.gender === 'male' ? 'selected' : ''}
              onClick={() => set('gender', 'male')}
            >
              Register as a man
            </button>
            <button
              type="button"
              className={f.gender === 'female' ? 'selected' : ''}
              onClick={() => set('gender', 'female')}
            >
              Register as a woman
            </button>
          </div>
          <Notice>
            {settings.fees_enabled
              ? `Registration fee: ${money(f.gender === 'male' ? settings.male_fee : settings.female_fee)}. Payment verification and profile approval are separate. No fee guarantees a date.`
              : 'Registration fees are disabled. Your profile still requires manual review.'}
          </Notice>
          <div className="form-grid">
            <Field
              label="Full name"
              required
              minLength={2}
              maxLength={100}
              autoComplete="name"
              value={f.full_name}
              onChange={(e) => set('full_name', e.target.value)}
            />
            <Field
              label="Display name"
              required
              minLength={2}
              maxLength={50}
              value={f.display_name}
              onChange={(e) => set('display_name', e.target.value)}
              hint="This is the name shown on your public profile."
            />
            <Field
              label="Email address"
              type="email"
              required
              autoComplete="email"
              value={f.email}
              onChange={(e) => set('email', e.target.value)}
            />
            <Field
              label="Mobile number (+880)"
              type="tel"
              required
              pattern="\+8801[3-9][0-9]{8}"
              autoComplete="tel"
              value={f.phone}
              onChange={(e) => set('phone', e.target.value)}
              hint="Example: +8801712345678"
            />
            <Field
              label="Date of birth"
              type="date"
              required
              max={localDate()}
              value={f.birth_date}
              onChange={(e) => set('birth_date', e.target.value)}
            />
            <Field
              label="Password"
              type="password"
              required
              minLength={12}
              autoComplete="new-password"
              value={f.password}
              onChange={(e) => set('password', e.target.value)}
              hint="At least 12 characters. Never shared with Datezy staff."
            />
            <Field label="Preferred gender to meet">
              <select
                value={f.preferred_gender}
                onChange={(e) => set('preferred_gender', e.target.value)}
              >
                <option value="any">Any</option>
                <option value="male">Men</option>
                <option value="female">Women</option>
              </select>
            </Field>
            <Field
              label="District"
              required
              list="districts"
              maxLength={80}
              value={f.district}
              onChange={(e) => set('district', e.target.value)}
            />
            <Field
              label="City / area"
              maxLength={100}
              value={f.area}
              onChange={(e) => set('area', e.target.value)}
            />
            <Field
              label="Interests & hobbies"
              maxLength={480}
              value={f.interests}
              onChange={(e) => set('interests', e.target.value)}
              hint="Comma-separated; up to 12 interests, 40 characters each."
            />
            <Field label="Preferred duration">
              <select
                value={f.duration}
                onChange={(e) => set('duration', Number(e.target.value))}
              >
                {durations.map((n) => (
                  <option value={n} key={n}>
                    {n} minutes
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Preferred meeting place">
              <select
                value={f.location_type}
                onChange={(e) => set('location_type', e.target.value)}
              >
                {locations.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>
          </div>
          <datalist id="districts">
            {districtList.map((x) => (
              <option value={x} key={x} />
            ))}
          </datalist>
          <Field label="A little about you">
            <textarea
              maxLength={500}
              rows={3}
              value={f.bio}
              onChange={(e) => set('bio', e.target.value)}
              placeholder="A favorite activity, an interesting detail, or your ideal first hello…"
            />
          </Field>
          <Field
            label="Referral code (optional)"
            maxLength={12}
            value={f.referral_code}
            onChange={(e) => set('referral_code', e.target.value.toUpperCase())}
          />
          <p className="muted small-text">
            A profile photo is optional. You can securely upload one after email
            confirmation.
          </p>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={f.listing_consent}
              onChange={(e) => set('listing_consent', e.target.checked)}
            />
            I consent to my public profile being listed after admin approval.
            Private contact details are never included.
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              required
              checked={f.terms_accepted}
              onChange={(e) => set('terms_accepted', e.target.checked)}
            />
            <span>
              I accept the{' '}
              <Link to="/terms" target="_blank">
                Terms
              </Link>{' '}
              and{' '}
              <Link to="/privacy" target="_blank">
                Privacy Policy
              </Link>
              .
            </span>
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              required
              checked={f.adult_confirmed}
              onChange={(e) => set('adult_confirmed', e.target.checked)}
            />
            I confirm I am at least 18 years old.
          </label>
          {error && <Notice type="error">{error}</Notice>}
          <button className="button primary full" disabled={busy}>
            {busy ? 'Creating your profile…' : 'Create your profile'}
            <ArrowRight size={18} />
          </button>
          <p className="center muted">
            Already registered? <Link to="/login">Log in</Link>
          </p>
        </form>
      )}
    </div>
  );
}
function Login({ adminLogin = false }) {
  const { user, admin, loading } = useApp();
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const nav = useNavigate();
  if (!configured)
    return (
      <div className="container page">
        <Setup feature={adminLogin ? 'Admin login' : 'Login'} />
      </div>
    );
  if (user && !loading)
    return adminLogin && !admin ? (
      <div className="container page">
        <Notice type="error">
          This account is not an administrator. Role checks are enforced on the
          server.
        </Notice>
        <Link to="/dashboard">Open your dashboard</Link>
      </div>
    ) : (
      <Navigate to={adminLogin ? '/admin' : '/dashboard'} replace />
    );
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      nav(adminLogin ? '/admin' : '/dashboard');
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  async function reset() {
    setError('');
    setMessage('');
    if (!email) {
      setError('Enter your email address first.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/reset-password`,
    });
    setBusy(false);
    if (error) setError(error.message);
    else
      setMessage(
        'If an account exists, a password reset link will be emailed to you.',
      );
  }
  return (
    <div className="container page auth-page">
      <PageHead
        eyebrow={adminLogin ? 'PROTECTED ADMIN ACCESS' : 'WELCOME BACK'}
        title={adminLogin ? 'Admin sign in.' : 'Your next hello awaits.'}
      />
      <form className="panel" onSubmit={submit}>
        <Field
          label="Email address"
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label="Password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="muted small-text">
          You’ll stay signed in on this device until you log out. Use a trusted
          device.
        </p>
        {error && <Notice type="error">{error}</Notice>}
        {message && <Notice>{message}</Notice>}
        <button className="button primary full" disabled={busy}>
          {busy ? 'Please wait…' : 'Sign in'}
          <ArrowRight size={18} />
        </button>
        <button
          className="text-link"
          type="button"
          onClick={reset}
          disabled={busy}
        >
          Forgot your password?
        </button>
        {!adminLogin && (
          <p className="muted">
            New here? <Link to="/register">Create a profile</Link>
          </p>
        )}
      </form>
    </div>
  );
}
function ResetPassword() {
  const { user, loading } = useApp();
  const [value, setValue] = useState(''),
    [msg, setMsg] = useState(''),
    [err, setErr] = useState(''),
    [busy, setBusy] = useState(false);
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: value });
    setBusy(false);
    if (error) setErr(error.message);
    else setMsg('Password updated. You can now return to your dashboard.');
  }
  return (
    <div className="container page auth-page">
      <PageHead title="Choose a new password." />
      {!configured ? (
        <Setup feature="Password recovery" />
      ) : loading ? (
        <Loading />
      ) : !user ? (
        <Notice type="error">
          Open the recovery link from your email first.
        </Notice>
      ) : (
        <form className="panel" onSubmit={save}>
          <Field
            label="New password"
            type="password"
            required
            minLength={12}
            autoComplete="new-password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          {err && <Notice type="error">{err}</Notice>}
          {msg && <Notice type="success">{msg}</Notice>}
          <button className="button primary" disabled={busy}>
            Update password
          </button>
          <Link to="/dashboard" className="text-link">
            Dashboard
          </Link>
        </form>
      )}
    </div>
  );
}
function useOwnData() {
  const { user } = useApp();
  const [data, setData] = useState({
      payments: [],
      rewards: [],
      dates: [],
      blocks: [],
    }),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true);
  async function refresh() {
    setLoading(true);
    setError('');
    try {
      const [payments, rewards, dates, blocks] = await Promise.all([
        read('payments', { own: user.id }),
        read('referral_rewards', { own: user.id, key: 'referrer_id' }),
        read('date_requests'),
        read('blocks'),
      ]);
      const ids = [
        ...new Set(dates.flatMap((r) => [r.sender_id, r.recipient_id])),
      ];
      let names = {};
      if (ids.length) {
        const result = await supabase
          .from('public_profiles')
          .select('id,display_name')
          .in('id', ids);
        if (result.error) throw result.error;
        names = Object.fromEntries(
          (result.data || []).map((p) => [p.id, p.display_name]),
        );
      }
      setData({
        payments,
        rewards,
        dates: dates.map((r) => ({
          ...r,
          sender_name: names[r.sender_id] || 'Unavailable profile',
          recipient_name: names[r.recipient_id] || 'Unavailable profile',
        })),
        blocks,
      });
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
  }, [user.id]);
  return { ...data, error, loading, refresh };
}
function ReferralCard({ rewards = [] }) {
  const { profile, settings } = useApp();
  const [copied, setCopied] = useState(false),
    [err, setErr] = useState('');
  const link = `${siteUrl}/register?ref=${profile.referral_code}`,
    totals = rewardTotals(rewards);
  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setErr('');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setErr(
        'Copy is unavailable in this browser. Select and copy the link below.',
      );
    }
  }
  return (
    <>
      <div className="panel referral-card">
        <span className="eyebrow">SHARE THE POSSIBILITIES</span>
        <h2>Invite friends. Make connections.</h2>
        <p>
          Invite friends to Datezy. Earn {money(settings.referral_reward)} for
          each eligible referral after registration and payment verification.
          Rewards are subject to approval and the published referral terms.
        </p>
        <div className="referral-code">
          <span>Your referral code</span>
          <strong>{profile.referral_code}</strong>
        </div>
        <div className="copy-row">
          <input
            aria-label="Your personal referral link"
            readOnly
            value={link}
            onFocus={(e) => e.target.select()}
          />
          <button className="button primary" onClick={copy}>
            <Copy size={17} />
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>
        {err && <Notice>{err}</Notice>}
        <p className="small-text muted">
          Rewards use the amount applicable when each referred account
          registered. No guaranteed cash or instant payout.{' '}
          <Link to="/terms">Read the referral terms.</Link>
        </p>
      </div>
      <div className="stats-grid">
        <Stat label="Total referrals" value={rewards.length} />
        <Stat label="Pending rewards" value={money(totals.pending)} />
        <Stat label="Approved rewards" value={money(totals.approved)} />
        <Stat label="Paid rewards" value={money(totals.paid)} />
      </div>
    </>
  );
}
function Stat({ label, value }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
function ReferralHistory({ rewards }) {
  return (
    <div className="panel">
      <h2>Referral history</h2>
      <p className="muted small-text">
        Anonymous referral IDs protect your friends’ account details.
      </p>
      {!rewards.length ? (
        <Empty text="Your referral story starts with your first invitation." />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Referral</th>
                <th>Registered</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rewards.map((r) => (
                <tr key={r.id}>
                  <td>{r.referral_id.slice(0, 8)}</td>
                  <td>{new Date(r.created_at).toLocaleDateString()}</td>
                  <td>{money(r.amount)}</td>
                  <td>
                    <Badge value={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
function Empty({ text }) {
  return (
    <div className="empty">
      <Sparkles size={26} />
      <p>{text}</p>
    </div>
  );
}
function Dashboard() {
  const { profile, user, reload, admin } = useApp();
  const d = useOwnData();
  const [msg, setMsg] = useState(''),
    [err, setErr] = useState(''),
    [busy, setBusy] = useState(false);
  const verified = d.payments.some((p) => p.status === 'verified');
  async function remove() {
    if (
      !window.confirm(
        'Request deletion? Your public listing will be hidden immediately. Support will securely remove your account and photos.',
      )
    )
      return;
    setBusy(true);
    try {
      await rpc('request_account_deletion');
      await reload();
      setMsg(
        'Deletion requested. Your listing is hidden. Support will review required financial retention and remove your account.',
      );
    } catch (e) {
      setErr(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  async function respond(id, action) {
    setBusy(true);
    try {
      await rpc('respond_date_request', { p_id: id, p_action: action });
      await d.refresh();
    } catch (e) {
      setErr(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container page">
      <PageHead eyebrow="YOUR DATEZY" title={`Hello, ${profile.display_name}.`}>
        Make a little space for something new.
      </PageHead>
      {d.error && <Notice type="error">{d.error}</Notice>}
      {err && <Notice type="error">{err}</Notice>}
      {msg && <Notice type="success">{msg}</Notice>}
      {profile.deletion_requested_at && (
        <Notice>
          Your account is awaiting deletion and your public listing is hidden.
        </Notice>
      )}
      <div className="dashboard-top">
        <div className="panel profile-summary">
          <div className="small-avatar">
            <Photo path={profile.photo_path} name={profile.display_name} />
          </div>
          <div>
            <h2>{profile.display_name}</h2>
            <p>
              {profile.district} · {profile.gender === 'male' ? 'Man' : 'Woman'}
            </p>
            <Badge value={profile.status} />
          </div>
          <Link className="button ghost" to="/edit-profile">
            Edit profile
          </Link>
        </div>
        <div className="panel">
          <div className="completion-label">
            <h3>Profile completion</h3>
            <strong>{completion(profile)}%</strong>
          </div>
          <progress
            value={completion(profile)}
            max={100}
            aria-label="Profile completion"
          />
          <p className="small-text muted">
            Photo, bio, interests, display name, area, and district.
          </p>
        </div>
      </div>
      <div className="panel status-panel">
        <div>
          <h3>Registration payment</h3>
          <Badge
            value={
              profile.required_fee === 0
                ? 'not_required'
                : verified
                  ? 'verified'
                  : d.payments.some((p) => p.status === 'pending')
                    ? 'pending_verification'
                    : 'awaiting_payment'
            }
          />
          <p>
            {profile.required_fee === 0
              ? 'No registration fee is required.'
              : `Your registration fee: ${money(profile.required_fee)}. Profile review is separate.`}
          </p>
        </div>
        <Link className="button ghost" to="/payment">
          Payment instructions <ArrowRight size={17} />
        </Link>
      </div>
      <ReferralCard rewards={d.rewards} />
      <div className="dashboard-links">
        <Link className="button ghost" to="/explore">
          Explore profiles <ArrowUpRight size={17} />
        </Link>
        <Link className="button ghost" to="/referrals">
          Referral history <ArrowUpRight size={17} />
        </Link>
        {admin && (
          <Link className="button ghost" to="/admin">
            Admin dashboard
          </Link>
        )}
      </div>
      <section className="panel">
        <h2>Your invitations</h2>
        <p className="muted">
          Acceptance is a choice, not an obligation. Public places only. Both
          users can withdraw.
        </p>
        {!d.dates.length ? (
          <Empty text="Your incoming and outgoing date invitations will appear here." />
        ) : (
          d.dates.map((r) => (
            <div className="request-row" key={r.id}>
              <div>
                <strong>
                  {r.sender_id === user.id
                    ? `Invitation to ${r.recipient_name}`
                    : `Invitation from ${r.sender_name}`}
                </strong>
                <p>
                  {r.meeting_date} · {r.duration} min · {r.location_type}
                  <br />
                  {r.activity} · {r.availability}
                </p>
                <Badge value={r.status} />
              </div>
              <div className="action-row">
                {r.recipient_id === user.id && r.status === 'pending' && (
                  <>
                    <button
                      className="button small primary"
                      disabled={busy}
                      onClick={() => respond(r.id, 'accepted')}
                    >
                      Accept
                    </button>
                    <button
                      className="button small ghost"
                      disabled={busy}
                      onClick={() => respond(r.id, 'declined')}
                    >
                      Decline
                    </button>
                  </>
                )}
                {((r.sender_id === user.id &&
                  ['pending', 'accepted'].includes(r.status)) ||
                  (r.recipient_id === user.id && r.status === 'accepted')) && (
                  <button
                    className="button small ghost"
                    disabled={busy}
                    onClick={() =>
                      respond(
                        r.id,
                        r.sender_id === user.id ? 'cancelled' : 'declined',
                      )
                    }
                  >
                    Withdraw
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </section>
      <section className="panel">
        <h2>Account settings</h2>
        <p>
          Your private email: {profile.email}
          <br />
          Your private phone: {profile.phone}
        </p>
        <Link to="/reset-password" className="text-link">
          Change password <ArrowRight size={16} />
        </Link>
        <h3>Blocked profiles</h3>
        {!d.blocks.length ? (
          <p className="muted">No blocked profiles.</p>
        ) : (
          d.blocks.map((b) => (
            <div className="request-row" key={b.blocked_id}>
              <span>Profile {b.blocked_id.slice(0, 8)}</span>
              <button
                className="button small ghost"
                onClick={async () => {
                  try {
                    await rpc('block_profile', {
                      p_id: b.blocked_id,
                      p_block: false,
                    });
                    await d.refresh();
                  } catch (e) {
                    setErr(friendlyError(e));
                  }
                }}
              >
                Unblock
              </button>
            </div>
          ))
        )}
        <div className="danger-zone">
          <h3>Request account deletion</h3>
          <p>
            Your public listing is removed immediately. Private deletion and
            lawful retention are handled by support.
          </p>
          <button
            className="button danger"
            disabled={busy || !!profile.deletion_requested_at}
            onClick={remove}
          >
            Request deletion
          </button>
        </div>
      </section>
    </div>
  );
}
function ReferralPage() {
  const d = useOwnData();
  const { settings } = useApp();
  return (
    <div className="container page">
      <PageHead
        eyebrow="REFERRALS & REWARDS"
        title="Good company starts with you."
      />
      {d.error && <Notice type="error">{d.error}</Notice>}
      <ReferralCard rewards={d.rewards} />
      <ReferralHistory rewards={d.rewards} />
      <div className="panel">
        <h2>What makes a referral eligible?</h2>
        <ol className="policy-list">
          <li>
            A new, unique adult completes registration using your referral code.
          </li>
          <li>The required payment is verified, if fees apply.</li>
          <li>The administrator approves the profile.</li>
          <li>
            A documented fraud review passes; self-referrals and duplicate
            rewards are rejected.
          </li>
          <li>
            The admin approves the reward and records a payout reference after
            payment.
          </li>
        </ol>
        <p className="policy-copy">{settings.referral_terms}</p>
      </div>
    </div>
  );
}
function EditProfile() {
  const { profile, reload } = useApp();
  const [f, setF] = useState({
      ...profile,
      interests: profile.interests.join(', '),
    }),
    [photo, setPhoto] = useState(null),
    [error, setError] = useState(''),
    [msg, setMsg] = useState(''),
    [busy, setBusy] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  async function save(e) {
    e.preventDefault();
    setError('');
    setMsg('');
    setBusy(true);
    let newPath = null;
    try {
      let path = f.photo_path;
      if (photo) {
        const sanitized = await preparePhoto(photo);
        newPath = `${profile.id}/${crypto.randomUUID()}.webp`;
        const { error } = await supabase.storage
          .from('profile-photos')
          .upload(newPath, sanitized, {
            contentType: 'image/webp',
            upsert: false,
          });
        if (error) throw error;
        path = newPath;
      }
      const allowed = {
        display_name: f.display_name,
        preferred_gender: f.preferred_gender,
        district: f.district,
        area: f.area,
        bio: f.bio,
        interests: interestsFromText(f.interests),
        photo_path: path,
        duration: Number(f.duration),
        location_type: f.location_type,
        listing_consent: f.listing_consent,
      };
      const { error, data } = await supabase
        .from('profiles')
        .update(allowed)
        .eq('id', profile.id)
        .select('id');
      if (error) throw error;
      if (!data?.length)
        throw new Error(
          'Profile cannot be edited while suspended or awaiting deletion.',
        );
      if (path !== profile.photo_path && profile.photo_path)
        await supabase.storage
          .from('profile-photos')
          .remove([profile.photo_path]);
      await reload();
      setF((x) => ({ ...x, photo_path: path }));
      setMsg(
        'Profile updated. Changes to public profile details require a new admin review.',
      );
      setPhoto(null);
    } catch (e) {
      if (newPath)
        await supabase.storage.from('profile-photos').remove([newPath]);
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container page narrow">
      <PageHead title="A little more you.">
        Private identity fields cannot be changed here. Contact support for
        corrections.
      </PageHead>
      <form className="panel" onSubmit={save}>
        <div className="form-grid">
          <Field
            label="Display name"
            required
            minLength={2}
            maxLength={50}
            value={f.display_name}
            onChange={(e) => set('display_name', e.target.value)}
          />
          <Field
            label="District"
            required
            minLength={2}
            maxLength={80}
            value={f.district}
            onChange={(e) => set('district', e.target.value)}
          />
          <Field
            label="City / area"
            maxLength={100}
            value={f.area}
            onChange={(e) => set('area', e.target.value)}
          />
          <Field
            label="Interests"
            value={f.interests}
            maxLength={480}
            onChange={(e) => set('interests', e.target.value)}
          />
          <Field label="Preferred gender">
            <select
              value={f.preferred_gender}
              onChange={(e) => set('preferred_gender', e.target.value)}
            >
              <option value="any">Any</option>
              <option value="male">Men</option>
              <option value="female">Women</option>
            </select>
          </Field>
          <Field label="Preferred duration">
            <select
              value={f.duration}
              onChange={(e) => set('duration', +e.target.value)}
            >
              {durations.map((n) => (
                <option key={n} value={n}>
                  {n} minutes
                </option>
              ))}
            </select>
          </Field>
          <Field label="Public meeting place">
            <select
              value={f.location_type}
              onChange={(e) => set('location_type', e.target.value)}
            >
              {locations.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field
            label="Profile photo (optional)"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setPhoto(e.target.files?.[0] || null)}
            hint="Maximum 5 MB. Re-encoded to remove EXIF/GPS metadata. No private documents."
          />
        </div>
        {profile.photo_path && (
          <label className="checkbox">
            <input
              type="checkbox"
              checked={!f.photo_path}
              onChange={(e) =>
                set('photo_path', e.target.checked ? null : profile.photo_path)
              }
            />
            Remove my current profile photo
          </label>
        )}
        <Field label="Bio">
          <textarea
            rows={4}
            maxLength={500}
            value={f.bio}
            onChange={(e) => set('bio', e.target.value)}
          />
        </Field>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={f.listing_consent}
            onChange={(e) => set('listing_consent', e.target.checked)}
          />
          I consent to my approved public profile being listed.
        </label>
        {error && <Notice type="error">{error}</Notice>}
        {msg && <Notice type="success">{msg}</Notice>}
        <button
          className="button primary"
          disabled={
            busy ||
            profile.status === 'suspended' ||
            !!profile.deletion_requested_at
          }
        >
          {busy ? 'Saving…' : 'Save profile'}
        </button>
      </form>
    </div>
  );
}
function Payment() {
  const { profile, settings } = useApp();
  const [pays, setPays] = useState([]),
    [method, setMethod] = useState(''),
    [tx, setTx] = useState(''),
    [msg, setMsg] = useState(''),
    [err, setErr] = useState(''),
    [busy, setBusy] = useState(false);
  const methods = settings.payment_methods.filter((m) => m.enabled),
    verified = pays.some((p) => p.status === 'verified'),
    pending = pays.some((p) => p.status === 'pending');
  async function refresh() {
    try {
      setPays(await read('payments', { own: profile.id }));
    } catch (e) {
      setErr(friendlyError(e));
    }
  }
  useEffect(() => {
    refresh();
  }, []);
  async function submit(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await rpc('submit_payment', { p_method: method, p_transaction: tx });
      setMsg(
        'Reference submitted. Payment is Pending Verification, not yet successful.',
      );
      setTx('');
      await refresh();
    } catch (e) {
      setErr(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container page narrow">
      <PageHead eyebrow="TRANSPARENT FEES" title="Payment instructions.">
        Payment verification and profile approval are always separate.
      </PageHead>
      <div className="panel">
        <div className="payment-price">
          <span>Your required registration fee</span>
          <strong>{money(profile.required_fee)}</strong>
        </div>
        <Notice>
          {profile.required_fee === 0
            ? 'No payment is required for this account.'
            : verified
              ? 'Your registration payment is verified. This does not guarantee profile approval or another person’s consent.'
              : pending
                ? 'Your payment is pending manual verification. Please do not submit or send another payment.'
                : 'Submit a reference only after paying through a configured method. Submission is not confirmation of payment.'}
        </Notice>
        <p className="policy-copy">{settings.payment_instructions}</p>
        {!methods.length && profile.required_fee > 0 && (
          <Notice>
            No payment method is enabled. Do not send money. Ask support for
            official instructions.
          </Notice>
        )}
        <div className="method-list">
          {methods.map((m) => (
            <div className="method" key={m.name}>
              <strong>{m.name}</strong>
              <p>Official account: {m.account}</p>
              <p>{m.instructions}</p>
            </div>
          ))}
        </div>
        {profile.required_fee > 0 &&
          !verified &&
          !pending &&
          methods.length > 0 && (
            <form onSubmit={submit}>
              <Field label="Payment method">
                <select
                  required
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                >
                  <option value="">Select a method</option>
                  {methods.map((m) => (
                    <option key={m.name}>{m.name}</option>
                  ))}
                </select>
              </Field>
              <Field
                label="Transaction ID / payment reference"
                required
                minLength={5}
                maxLength={100}
                value={tx}
                onChange={(e) => setTx(e.target.value)}
              />
              <button className="button primary" disabled={busy}>
                Submit for verification
              </button>
            </form>
          )}
        {err && <Notice type="error">{err}</Notice>}
        {msg && <Notice type="success">{msg}</Notice>}
      </div>
      <section className="panel">
        <h2>Payment history</h2>
        {!pays.length ? (
          <Empty text="No payment references have been submitted." />
        ) : (
          pays.map((p) => (
            <div className="request-row" key={p.id}>
              <div>
                <strong>
                  {p.method} · {money(p.amount)}
                </strong>
                <p>Reference: {p.transaction_id}</p>
                {p.review_note && <p>{p.review_note}</p>}
                {p.status === 'refunded' && (
                  <p>
                    Refund: {money(p.refund_amount)} · {p.refund_reference}
                  </p>
                )}
              </div>
              <Badge value={p.status} />
            </div>
          ))
        )}
      </section>
      <section className="panel">
        <h2>Refunds & cancellation</h2>
        <p className="policy-copy">{settings.refund_policy}</p>
        <p>
          For a dispute, contact support with your payment reference. Never
          share account passwords or OTPs. Provider integrations are not enabled
          in this release.
        </p>
        <Link className="text-link" to="/contact">
          Contact support <ArrowRight size={17} />
        </Link>
      </section>
    </div>
  );
}
function Explore() {
  const { user, profile, loading } = useApp();
  const [filters, setFilters] = useState({
      gender: '',
      min_age: 18,
      max_age: 65,
      district: '',
      interest: '',
      duration: 0,
    }),
    [rows, setRows] = useState([]),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [offset, setOffset] = useState(0),
    [selected, setSelected] = useState(null),
    [message, setMessage] = useState('');
  async function search(e, off = 0) {
    e?.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = await rpc('discover_profiles', {
        p_gender: filters.gender,
        p_min_age: Number(filters.min_age),
        p_max_age: Number(filters.max_age),
        p_district: filters.district,
        p_interest: filters.interest,
        p_duration: Number(filters.duration),
        p_offset: off,
      });
      setRows(data);
      setOffset(off);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (user && profile?.status === 'approved') search(null);
  }, [user?.id, profile?.status]);
  const set = (k, v) => setFilters((x) => ({ ...x, [k]: v }));
  async function report(id) {
    const reason = window.prompt(
      'Explain your concern (at least 5 characters). This is sent privately to moderators.',
    );
    if (!reason) return;
    setBusy(true);
    try {
      await rpc('report_profile', { p_id: id, p_reason: reason });
      setMessage('Report sent privately to moderators.');
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  async function block(id) {
    if (
      !window.confirm(
        'Block this profile? Invitations will be cancelled and neither profile will appear in the other’s discovery.',
      )
    )
      return;
    setBusy(true);
    try {
      await rpc('block_profile', { p_id: id, p_block: true });
      await search(null);
      setMessage('Profile blocked. You can manage blocks in account settings.');
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container page">
      <PageHead
        eyebrow="FIND YOUR KIND OF COMPANY"
        title="A new hello is out there."
      >
        Explore approved adult profiles. No pressure, no promises — just
        possibilities.
      </PageHead>
      {!configured ? (
        <Setup feature="Profile discovery" />
      ) : loading ? (
        <Loading />
      ) : !user ? (
        <div className="panel">
          <Lock size={30} />
          <h2>Connections begin with a profile.</h2>
          <p>
            Discovery is available only to approved adult members. We never
            publish fake profiles as real people.
          </p>
          <RegisterLink />
          <Link className="text-link" to="/login">
            Already registered? Log in
          </Link>
        </div>
      ) : profile?.status !== 'approved' ? (
        <div className="panel">
          <Notice>
            Your profile must be approved before you can explore. Payment
            verification is separate from profile approval.
          </Notice>
          <Link className="button primary" to="/dashboard">
            Check your status
          </Link>
        </div>
      ) : (
        <>
          <form className="panel filter-grid" onSubmit={search}>
            <Field label="Meet">
              <select
                value={filters.gender}
                onChange={(e) => set('gender', e.target.value)}
              >
                <option value="">Everyone</option>
                <option value="male">Men</option>
                <option value="female">Women</option>
              </select>
            </Field>
            <Field
              label="Age from"
              type="number"
              min={18}
              max={120}
              value={filters.min_age}
              onChange={(e) => set('min_age', e.target.value)}
            />
            <Field
              label="Age to"
              type="number"
              min={filters.min_age}
              max={120}
              value={filters.max_age}
              onChange={(e) => set('max_age', e.target.value)}
            />
            <Field
              label="District / city"
              value={filters.district}
              onChange={(e) => set('district', e.target.value)}
              placeholder="Anywhere"
            />
            <Field
              label="Interest"
              value={filters.interest}
              onChange={(e) => set('interest', e.target.value)}
              placeholder="Coffee, books…"
            />
            <Field label="Duration">
              <select
                value={filters.duration}
                onChange={(e) => set('duration', e.target.value)}
              >
                <option value={0}>Any duration</option>
                {durations.map((n) => (
                  <option value={n} key={n}>
                    {n} min
                  </option>
                ))}
              </select>
            </Field>
            <button className="button primary" disabled={busy}>
              {busy ? 'Searching…' : 'Find people'}
            </button>
          </form>
          {error && <Notice type="error">{error}</Notice>}
          {message && <Notice type="success">{message}</Notice>}
          {!rows.length && !busy && !error ? (
            <div className="panel">
              <Empty text="No matching approved profiles yet. Try different filters or check back soon." />
            </div>
          ) : (
            <div className="profiles-grid">
              {rows.map((p) => (
                <article className="panel person-card" key={p.id}>
                  <div className="profile-photo">
                    <Photo path={p.photo_path} name={p.display_name} />
                    <span className="approved-label">
                      <CheckCircle2 size={14} /> Approved
                    </span>
                  </div>
                  <h2>
                    {p.display_name}, {p.age}
                  </h2>
                  <span className="muted inline-icon">
                    <MapPin size={16} />
                    {p.district}
                  </span>
                  <p>{p.bio || 'A new connection starts with a hello.'}</p>
                  <div className="tags">
                    {p.interests.map((i) => (
                      <span key={i}>{i}</span>
                    ))}
                  </div>
                  <span className="muted small-text">
                    {p.duration} minutes · {p.location_type}
                  </span>
                  <button
                    className="button primary full"
                    disabled={busy}
                    onClick={() => setSelected(p)}
                  >
                    Express interest <Heart size={17} />
                  </button>
                  <div className="profile-tools">
                    <button onClick={() => report(p.id)} disabled={busy}>
                      <Flag size={14} /> Report
                    </button>
                    <button onClick={() => block(p.id)} disabled={busy}>
                      Block
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
          <div className="action-row pagination">
            <button
              className="button ghost"
              disabled={busy || offset === 0}
              onClick={() => search(null, Math.max(0, offset - 24))}
            >
              Previous
            </button>
            <span>Page {Math.floor(offset / 24) + 1}</span>
            <button
              className="button ghost"
              disabled={busy || rows.length < 24}
              onClick={() => search(null, offset + 24)}
            >
              Next
            </button>
          </div>
        </>
      )}
      {selected && (
        <DateModal
          person={selected}
          close={() => setSelected(null)}
          onSuccess={() =>
            setMessage(
              'Invitation sent. Only mutual consent makes a plan — the recipient may freely decline.',
            )
          }
        />
      )}
    </div>
  );
}
function DateModal({ person, close, onSuccess }) {
  const [f, setF] = useState({
      date: localDate(),
      duration: 60,
      location: 'Cafe',
      activity: 'Coffee and conversation',
      availability: '',
    }),
    [err, setErr] = useState(''),
    [busy, setBusy] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  useEffect(() => {
    const old = document.body.style.overflow;
    const opener = document.activeElement;
    document.body.style.overflow = 'hidden';
    const first = document.getElementById('date-modal-close');
    first?.focus();
    function key(e) {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') {
        const elems = [
          ...document.querySelectorAll(
            '.modal button:not([disabled]),.modal input,.modal select',
          ),
        ];
        const a = elems[0],
          z = elems.at(-1);
        if (e.shiftKey && document.activeElement === a) {
          e.preventDefault();
          z.focus();
        } else if (!e.shiftKey && document.activeElement === z) {
          e.preventDefault();
          a.focus();
        }
      }
    }
    document.addEventListener('keydown', key);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener('keydown', key);
      opener?.focus();
    };
  }, []);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await rpc('send_date_request', {
        p_recipient: person.id,
        p_date: f.date,
        p_duration: Number(f.duration),
        p_location: f.location,
        p_activity: f.activity,
        p_availability: f.availability,
      });
      onSuccess();
      close();
    } catch (e) {
      setErr(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <section
        className="modal panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="date-title"
      >
        <button
          id="date-modal-close"
          className="icon-button modal-close"
          onClick={close}
          aria-label="Close invitation"
        >
          <X />
        </button>
        <span className="eyebrow">AN INVITATION, NOT AN EXPECTATION</span>
        <h2 id="date-title">Meet {person.display_name}?</h2>
        <p>Choose a public place. They can accept or decline freely.</p>
        <form onSubmit={submit}>
          <Field
            label="Today, tomorrow, or a future date"
            type="date"
            required
            min={localDate()}
            value={f.date}
            onChange={(e) => set('date', e.target.value)}
          />
          <div className="form-grid">
            <Field label="Duration">
              <select
                value={f.duration}
                onChange={(e) => set('duration', e.target.value)}
              >
                {durations.map((n) => (
                  <option key={n} value={n}>
                    {n} minutes
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Public meeting preference">
              <select
                value={f.location}
                onChange={(e) => set('location', e.target.value)}
              >
                {locations.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field
            label="Activity / shared interest"
            required
            minLength={2}
            maxLength={150}
            value={f.activity}
            onChange={(e) => set('activity', e.target.value)}
          />
          <Field
            label="Availability"
            required
            minLength={2}
            maxLength={150}
            placeholder="e.g. 4–6 PM Bangladesh time"
            value={f.availability}
            onChange={(e) => set('availability', e.target.value)}
          />
          {err && <Notice type="error">{err}</Notice>}
          <Notice>
            No fee guarantees acceptance, affection, or consent. Paid
            companionship is not enabled.
          </Notice>
          <button className="button primary full" disabled={busy}>
            {busy ? 'Sending…' : 'Send invitation'}
          </button>
        </form>
      </section>
    </div>
  );
}
function Admin() {
  const { settings, loadSettings } = useApp();
  const [tab, setTab] = useState('Overview'),
    [data, setData] = useState({
      profiles: [],
      payments: [],
      referrals: [],
      referral_rewards: [],
      reports: [],
      admin_activity: [],
      deletion_requests: [],
    }),
    [error, setError] = useState(''),
    [msg, setMsg] = useState(''),
    [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(false),
    [filter, setFilter] = useState({
      search: '',
      gender: '',
      status: '',
      area: '',
      date: '',
    });
  const tabs = [
    'Overview',
    'Users',
    'Payments',
    'Referrals',
    'Reports',
    'Deletion requests',
    'Settings',
  ];
  async function refresh() {
    setBusy(true);
    try {
      const tables = Object.keys(data);
      const all = await Promise.all(tables.map((t) => read(t)));
      setData(Object.fromEntries(tables.map((t, i) => [t, all[i]])));
      setLoaded(true);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    refresh();
  }, []);
  async function act(name, args) {
    setError('');
    setMsg('');
    setBusy(true);
    try {
      await rpc(name, args);
      setMsg('Action saved and recorded in the admin audit log.');
      await refresh();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  const ps = data.profiles,
    find = (id) => ps.find((x) => x.id === id),
    eligible = (id) => {
      const p = find(id);
      return (
        p &&
        p.status === 'approved' &&
        (p.required_fee === 0 ||
          data.payments.some(
            (x) => x.user_id === id && x.status === 'verified',
          ))
      );
    };
  const counts = {
    users: ps.length,
    male: ps.filter((p) => p.gender === 'male').length,
    female: ps.filter((p) => p.gender === 'female').length,
    pending: ps.filter((p) => p.status === 'pending').length,
    approved: ps.filter((p) => p.status === 'approved').length,
    rejected: ps.filter((p) => p.status === 'rejected').length,
  };
  function reviewProfile(p, status) {
    const note = window.prompt('Internal moderation note (optional):', '');
    if (note === null) return;
    act('admin_review_profile', { p_id: p.id, p_status: status, p_note: note });
  }
  function paymentAction(p, action) {
    const note = window.prompt(
      action === 'verified'
        ? 'Verify the transaction independently in your official merchant/payment account. Add a review note:'
        : 'Review / rejection / refund note:',
      '',
    );
    if (note === null) return;
    let amount = 0,
      ref = '';
    if (action === 'refunded') {
      amount = Number(
        window.prompt(`Refund amount (1–${p.amount} BDT):`, String(p.amount)),
      );
      ref = window.prompt('Recorded refund transaction reference:', '');
      if (!amount || !ref) return;
    }
    act('admin_review_payment', {
      p_id: p.id,
      p_action: action,
      p_note: note,
      p_refund_amount: amount,
      p_refund_reference: ref,
    });
  }
  function rewardAction(r, action) {
    let fraud = false,
      ref = '',
      note = '';
    if (action === 'approved') {
      fraud = window.confirm(
        'Have you checked unique identity/contact ownership, suspicious signup patterns, and referral abuse? Only approve after independent manual review.',
      );
      if (!fraud) return;
      note = window.prompt(
        'Document your fraud-check result (at least 5 characters):',
        '',
      );
      if (!note) return;
    }
    if (action === 'rejected') {
      note = window.prompt('Reason for rejection:', '');
      if (note === null) return;
    }
    if (action === 'paid') {
      ref = window.prompt(
        'Enter the real payout transaction reference (minimum 5 characters). Do not mark paid before sending money.',
        '',
      );
      if (!ref) return;
    }
    act('admin_review_reward', {
      p_id: r.id,
      p_action: action,
      p_fraud_checked: fraud,
      p_note: note,
      p_payout_reference: ref,
    });
  }
  return (
    <div className="container page admin-page">
      <div className="admin-heading">
        <PageHead eyebrow="DATEZY CONTROL ROOM" title="Admin dashboard.">
          Every sensitive action is authorized on the server and recorded.
        </PageHead>
        <button className="button ghost" onClick={refresh} disabled={busy}>
          <RefreshCw size={17} /> Refresh
        </button>
      </div>
      <div className="admin-tabs" role="navigation" aria-label="Admin modules">
        {tabs.map((t) => (
          <button
            key={t}
            className={tab === t ? 'active' : ''}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {error && <Notice type="error">{error}</Notice>}
      {msg && <Notice type="success">{msg}</Notice>}
      {!loaded && !error ? (
        <Loading />
      ) : tab === 'Overview' ? (
        <>
          <div className="stats-grid">
            <Stat label="Registered users" value={counts.users} />
            <Stat label="Male registrations" value={counts.male} />
            <Stat label="Female registrations" value={counts.female} />
            <Stat label="Pending profiles" value={counts.pending} />
            <Stat label="Approved profiles" value={counts.approved} />
            <Stat label="Rejected profiles" value={counts.rejected} />
            <Stat
              label="Pending payments"
              value={data.payments.filter((p) => p.status === 'pending').length}
            />
            <Stat
              label="Verified payments"
              value={
                data.payments.filter((p) => p.status === 'verified').length
              }
            />
            <Stat label="Total referrals" value={data.referrals.length} />
            {['pending', 'approved', 'paid'].map((s) => (
              <Stat
                key={s}
                label={`${s[0].toUpperCase() + s.slice(1)} rewards`}
                value={money(rewardTotals(data.referral_rewards)[s])}
              />
            ))}
          </div>
          <section className="panel">
            <h2>Recent admin activity</h2>
            {!data.admin_activity.length ? (
              <Empty text="Admin actions will appear here." />
            ) : (
              data.admin_activity.slice(0, 20).map((a) => (
                <div className="request-row" key={a.id}>
                  <div>
                    <strong>{a.action}</strong>
                    <p>
                      Target: {a.target_id || 'Site settings'} · Admin:{' '}
                      {a.admin_id?.slice(0, 8) || 'deleted'}
                    </p>
                    {a.details?.note && <p>{a.details.note}</p>}
                  </div>
                  <time>{new Date(a.created_at).toLocaleString()}</time>
                </div>
              ))
            )}
          </section>
        </>
      ) : tab === 'Users' ? (
        <>
          <div className="panel filter-grid">
            <Field
              label="Search name/email"
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            />
            <Field label="Gender">
              <select
                value={filter.gender}
                onChange={(e) =>
                  setFilter({ ...filter, gender: e.target.value })
                }
              >
                <option value="">All</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </Field>
            <Field label="Status">
              <select
                value={filter.status}
                onChange={(e) =>
                  setFilter({ ...filter, status: e.target.value })
                }
              >
                <option value="">All</option>
                {['pending', 'approved', 'rejected', 'suspended'].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field
              label="Area"
              value={filter.area}
              onChange={(e) => setFilter({ ...filter, area: e.target.value })}
            />
            <Field
              label="Registered on"
              type="date"
              value={filter.date}
              onChange={(e) => setFilter({ ...filter, date: e.target.value })}
            />
          </div>
          {ps
            .filter(
              (p) =>
                (!filter.gender || p.gender === filter.gender) &&
                (!filter.status || p.status === filter.status) &&
                `${p.full_name} ${p.display_name} ${p.email}`
                  .toLowerCase()
                  .includes(filter.search.toLowerCase()) &&
                `${p.district} ${p.area}`
                  .toLowerCase()
                  .includes(filter.area.toLowerCase()) &&
                (!filter.date || p.created_at.slice(0, 10) === filter.date),
            )
            .map((p) => (
              <details className="panel admin-record" key={p.id}>
                <summary>
                  <strong>{p.display_name}</strong>
                  <span>
                    {p.gender} · {p.district}
                  </span>
                  <Badge value={p.status} />
                  <ChevronDown size={18} />
                </summary>
                <div className="admin-detail">
                  <div className="small-avatar">
                    <Photo path={p.photo_path} name={p.display_name} />
                  </div>
                  <p>
                    <b>Full name:</b> {p.full_name}
                    <br />
                    <b>Email:</b> {p.email}
                    <br />
                    <b>Phone:</b> {p.phone}
                    <br />
                    <b>DOB:</b> {p.birth_date}
                    <br />
                    <b>Area:</b> {p.area}
                    <br />
                    <b>Bio:</b> {p.bio}
                    <br />
                    <b>Interests:</b> {p.interests.join(', ')}
                    <br />
                    <b>Preferences:</b> {p.preferred_gender} · {p.duration} min
                    · {p.location_type}
                    <br />
                    <b>Listing consent:</b> {p.listing_consent ? 'Yes' : 'No'}
                    <br />
                    <b>Required fee:</b> {money(p.required_fee)}
                    <br />
                    <b>Registered:</b> {new Date(p.created_at).toLocaleString()}
                    <br />
                    <b>Account ID:</b> {p.id}
                  </p>
                  <div className="action-row">
                    {['approved', 'rejected', 'suspended', 'pending'].map(
                      (s) => (
                        <button
                          className={`button small ${s === 'approved' ? 'primary' : 'ghost'}`}
                          key={s}
                          disabled={busy}
                          onClick={() => reviewProfile(p, s)}
                        >
                          {s === 'pending'
                            ? 'Return to review'
                            : s === 'approved'
                              ? 'Approve'
                              : s === 'rejected'
                                ? 'Reject'
                                : 'Suspend'}
                        </button>
                      ),
                    )}
                    <button
                      className="button small ghost"
                      disabled={busy}
                      onClick={() => {
                        const note = window.prompt('Internal moderation note:');
                        if (note)
                          act('admin_add_note', { p_id: p.id, p_note: note });
                      }}
                    >
                      Add note
                    </button>
                  </div>
                  {data.admin_activity
                    .filter(
                      (a) =>
                        a.target_id === p.id && a.action.startsWith('profile.'),
                    )
                    .slice(0, 3)
                    .map((a) => (
                      <p className="small-text" key={a.id}>
                        <b>Internal note:</b>{' '}
                        {a.details?.note || 'No note recorded'} ·{' '}
                        {new Date(a.created_at).toLocaleString()}
                      </p>
                    ))}
                  <p className="small-text muted">
                    Approve only after required payment verification, listing
                    consent, and profile safety review.
                  </p>
                </div>
              </details>
            ))}
        </>
      ) : tab === 'Payments' ? (
        <section className="panel">
          <h2>Payment review & refund history</h2>
          <Notice>
            Submitting a reference does not confirm payment. Independently
            verify merchant records, payer reference, amount, and method.
          </Notice>
          {!data.payments.length ? (
            <Empty text="No submitted payments." />
          ) : (
            data.payments.map((p) => (
              <div className="admin-item" key={p.id}>
                <div>
                  <h3>
                    {find(p.user_id)?.display_name || 'Deleted account'} ·{' '}
                    {money(p.amount)}
                  </h3>
                  <p>
                    {p.method} · {p.transaction_id}
                    <br />
                    {new Date(p.created_at).toLocaleString()}
                  </p>
                  <Badge value={p.status} />
                  {p.review_note && <p>{p.review_note}</p>}
                  {p.status === 'refunded' && (
                    <p>
                      Refunded {money(p.refund_amount)} · {p.refund_reference}
                    </p>
                  )}
                </div>
                <div className="action-row">
                  {p.status === 'pending' && (
                    <>
                      <button
                        className="button primary small"
                        disabled={busy}
                        onClick={() => paymentAction(p, 'verified')}
                      >
                        Verify payment
                      </button>
                      <button
                        className="button ghost small"
                        disabled={busy}
                        onClick={() => paymentAction(p, 'rejected')}
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {p.status === 'verified' && (
                    <button
                      className="button ghost small"
                      disabled={busy}
                      onClick={() => paymentAction(p, 'refunded')}
                    >
                      Record refund
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </section>
      ) : tab === 'Referrals' ? (
        <section className="panel">
          <h2>Referral eligibility & payouts</h2>
          <Notice>
            Unique email/mobile constraints are not identity verification. Check
            suspicious patterns manually before approving. Paid rewards cannot
            be paid twice.
          </Notice>
          {!data.referral_rewards.length ? (
            <Empty text="No referrals to review." />
          ) : (
            data.referral_rewards.map((r) => {
              const rel = data.referrals.find((x) => x.id === r.referral_id);
              return (
                <div className="admin-item" key={r.id}>
                  <div>
                    <h3>
                      {find(r.referrer_id)?.display_name || 'Deleted referrer'}{' '}
                      →{' '}
                      {find(rel?.referred_id)?.display_name ||
                        'Deleted account'}
                    </h3>
                    <p>
                      Reward {money(r.amount)} · Eligibility:{' '}
                      {eligible(rel?.referred_id)
                        ? 'Basic checks passed; fraud review still required'
                        : 'Not eligible yet'}
                    </p>
                    <Badge value={r.status} />
                    <p>
                      Fraud checked: {r.fraud_checked ? 'Yes' : 'No'}
                      <br />
                      {r.review_note}
                      {r.payout_reference && ` · Payout ${r.payout_reference}`}
                    </p>
                  </div>
                  <div className="action-row">
                    {['pending', 'rejected'].includes(r.status) && (
                      <button
                        className="button primary small"
                        disabled={busy}
                        onClick={() => rewardAction(r, 'approved')}
                      >
                        Review & approve
                      </button>
                    )}
                    {r.status === 'approved' && (
                      <button
                        className="button primary small"
                        disabled={busy}
                        onClick={() => rewardAction(r, 'paid')}
                      >
                        Record paid payout
                      </button>
                    )}
                    {['pending', 'approved'].includes(r.status) && (
                      <button
                        className="button ghost small"
                        disabled={busy}
                        onClick={() => rewardAction(r, 'rejected')}
                      >
                        Reject
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </section>
      ) : tab === 'Reports' ? (
        <section className="panel">
          <h2>Reported profiles</h2>
          {!data.reports.length ? (
            <Empty text="No reports received." />
          ) : (
            data.reports.map((r) => (
              <div className="admin-item" key={r.id}>
                <div>
                  <h3>
                    Reported:{' '}
                    {find(r.reported_id)?.display_name || 'Deleted account'}
                  </h3>
                  <p>
                    Reporter:{' '}
                    {find(r.reporter_id)?.display_name || 'Deleted account'}
                    <br />
                    {r.reason}
                  </p>
                  <Badge value={r.status} />
                  {r.admin_note && <p>{r.admin_note}</p>}
                </div>
                <div className="action-row">
                  {r.reported_id && (
                    <button
                      className="button ghost small"
                      disabled={busy}
                      onClick={() =>
                        reviewProfile({ id: r.reported_id }, 'suspended')
                      }
                    >
                      Suspend profile
                    </button>
                  )}
                  {r.status === 'open' && (
                    <button
                      className="button primary small"
                      disabled={busy}
                      onClick={() => {
                        const note = window.prompt('Resolution note:');
                        if (note !== null)
                          act('admin_resolve_report', {
                            p_id: r.id,
                            p_note: note,
                          });
                      }}
                    >
                      Resolve report
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </section>
      ) : tab === 'Deletion requests' ? (
        <section className="panel">
          <h2>Privacy & deletion requests</h2>
          <Notice>
            Listings are hidden immediately. To complete deletion: export only
            legally required records to restricted storage with a retention
            deadline, remove profile photos in Supabase Storage, then delete the
            Auth user in the Supabase dashboard. Cascading foreign keys remove
            their profile, payments, and private account data. Never expose a
            service-role key here.
          </Notice>
          {data.deletion_requests.length ? (
            data.deletion_requests.map((r) => (
              <div className="request-row" key={r.id}>
                <div>
                  <strong>
                    {find(r.user_id)?.display_name || 'Account removed'}
                  </strong>
                  <p>
                    User ID: {r.user_id || 'Deleted'}
                    <br />
                    Requested {new Date(r.created_at).toLocaleString()}
                  </p>
                </div>
                <Badge value={r.user_id ? r.status : 'completed'} />
              </div>
            ))
          ) : (
            <Empty text="No deletion requests." />
          )}
        </section>
      ) : (
        <AdminSettings settings={settings} afterSave={loadSettings} />
      )}
    </div>
  );
}
function AdminSettings({ settings, afterSave }) {
  const [f, setF] = useState({
      ...settings,
      payment_methods: JSON.stringify(settings.payment_methods, null, 2),
    }),
    [error, setError] = useState(''),
    [msg, setMsg] = useState(''),
    [busy, setBusy] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMsg('');
    try {
      await rpc('admin_update_settings', {
        p_settings: {
          ...f,
          male_fee: Number(f.male_fee),
          female_fee: Number(f.female_fee),
          referral_reward: Number(f.referral_reward),
          payment_methods: JSON.parse(f.payment_methods),
        },
      });
      await afterSave();
      setMsg(
        'Settings saved. New fees and rewards apply to new registrations; existing amounts are preserved.',
      );
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="panel" onSubmit={save}>
      <h2>Site settings</h2>
      <Notice>
        Configure official payment accounts and legally reviewed policies before
        enabling collection. Never enter a gateway secret or API key here.
      </Notice>
      <div className="form-grid">
        <Field
          label="Site name"
          required
          minLength={2}
          maxLength={50}
          value={f.site_name}
          onChange={(e) => set('site_name', e.target.value)}
        />
        <Field
          label="Logo URL (Supabase HTTPS image)"
          value={f.logo_url}
          onChange={(e) => set('logo_url', e.target.value)}
          hint="Use the default logo or a Supabase-hosted image. Custom hosts require a CSP change."
        />
        <Field
          label="Male registration fee (BDT)"
          type="number"
          min={0}
          max={100000}
          required
          value={f.male_fee}
          onChange={(e) => set('male_fee', e.target.value)}
        />
        <Field
          label="Female registration fee (BDT)"
          type="number"
          min={0}
          max={100000}
          required
          value={f.female_fee}
          onChange={(e) => set('female_fee', e.target.value)}
        />
        <Field
          label="Referral reward (BDT)"
          type="number"
          min={0}
          max={100000}
          required
          value={f.referral_reward}
          onChange={(e) => set('referral_reward', e.target.value)}
        />
        <Field
          label="Support email / contact"
          value={f.support_contact}
          onChange={(e) => set('support_contact', e.target.value)}
        />
      </div>
      <label className="checkbox">
        <input
          type="checkbox"
          checked={f.fees_enabled}
          onChange={(e) => set('fees_enabled', e.target.checked)}
        />
        Registration fees enabled for new accounts
      </label>
      <Field
        label="Payment methods JSON"
        hint={
          'Example structure: [{"name":"bKash","account":"OFFICIAL_ACCOUNT","enabled":false,"instructions":"Use the merchant account after provider approval."}]'
        }
      >
        <textarea
          className="code-input"
          rows={7}
          value={f.payment_methods}
          onChange={(e) => set('payment_methods', e.target.value)}
        />
      </Field>
      {[
        ['payment_instructions', 'Payment instructions'],
        ['refund_policy', 'Payment, cancellation & refund policy'],
        ['referral_terms', 'Referral terms & payout timing'],
        ['approval_requirements', 'Profile approval requirements'],
        ['terms', 'Terms & conditions'],
        ['privacy', 'Privacy policy'],
        ['community', 'Community guidelines'],
      ].map(([key, label]) => (
        <Field
          label={label}
          key={key}
          hint="Plain text only; displayed safely without HTML."
        >
          <textarea
            rows={key === 'terms' || key === 'privacy' ? 8 : 4}
            value={f[key]}
            onChange={(e) => set(key, e.target.value)}
          />
        </Field>
      ))}
      {error && <Notice type="error">{error}</Notice>}
      {msg && <Notice type="success">{msg}</Notice>}
      <button className="button primary" disabled={busy}>
        {busy ? 'Saving…' : 'Save settings'}
      </button>
    </form>
  );
}
function About() {
  return (
    <div className="container page narrow">
      <PageHead eyebrow="OUR STORY" title="Make time for people.">
        Meet Someone New. Make Time for Connection.
      </PageHead>
      <section className="panel">
        <h2>A thoughtful hello, close to home.</h2>
        <p>
          Datezy is a dating and social connection platform designed for adults
          in Bangladesh. It helps people discover shared interests and propose
          respectful, consensual meetups in public places.
        </p>
        <p>
          We believe connection should be a choice — never an obligation or a
          transaction. A registration payment supports the platform’s access and
          review process; it does not buy another person’s time, affection, or
          consent.
        </p>
        <p>
          We’re starting simply: manually reviewed profiles, transparent payment
          verification, privacy-first public listings, and practical safety
          tools. There is no paid companionship or host-booking feature.
        </p>
        <Notice>
          Launch information: the operator must publish its legal identity,
          support contact, reviewed policies, and any provider approvals before
          accepting registrations or payments at scale.
        </Notice>
      </section>
      <div className="feature-grid two">
        <Feature
          icon={<Heart />}
          title="Connection with care"
          text="Respectful social dates, mutual choice, and room to say no."
        />
        <Feature
          icon={<ShieldCheck />}
          title="Privacy by design"
          text="No NID collection. Private phone numbers, emails, and payment information stay off public profiles."
        />
      </div>
    </div>
  );
}
function Contact() {
  const { settings } = useApp();
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.support_contact)
    ? settings.support_contact
    : '';
  return (
    <div className="container page narrow">
      <PageHead eyebrow="WE’RE HERE TO HELP" title="Let’s talk.">
        Questions about accounts, payment review, moderation, or privacy?
      </PageHead>
      <section className="panel">
        <Mail size={32} />
        <h2>Contact Datezy support</h2>
        {settings.support_contact ? (
          <>
            <p>{settings.support_contact}</p>
            {email && (
              <a
                className="button primary"
                href={`mailto:${email}?subject=Datezy%20support`}
              >
                Email support <ArrowUpRight size={18} />
              </a>
            )}
          </>
        ) : (
          <Notice>
            Support contact is not configured yet. The operator must publish a
            monitored support channel before launch. This page does not pretend
            to submit messages to a nonexistent inbox.
          </Notice>
        )}
        <h3>To help us help you</h3>
        <p>
          Include your account email and a short description. For payment
          questions, include your reference and payment method. Do not send
          passwords, OTPs, NID numbers, or identity photos.
        </p>
        <h3>Safety concerns</h3>
        <p>
          Use Report Profile and Block User inside the app. Datezy is not an
          emergency service. If you are in immediate danger, contact local
          emergency services.
        </p>
        <h3>Privacy requests</h3>
        <p>
          Request account deletion from your dashboard or contact support for
          access/correction requests. Your public listing is hidden as soon as
          you request deletion.
        </p>
      </section>
    </div>
  );
}
const faqItems = [
  [
    'Who can join Datezy?',
    'Only adults aged 18 and above in Bangladesh. Both the registration form and the database enforce the age rule.',
  ],
  [
    'Does paying guarantee a date?',
    'No. Registration fees do not buy access to another person’s consent, affection, availability, or acceptance. Every invitation is freely accepted or declined.',
  ],
  [
    'Why is my profile still pending after payment?',
    'Payment verification and profile approval are separate. An administrator first checks your payment, then reviews the profile and listing consent.',
  ],
  [
    'Are phone numbers and emails public?',
    'No. Public profiles contain only permitted fields such as display name, age, district, interests, photo, and bio. Private contact, birth date, payment references, and identity details are not listed.',
  ],
  [
    'When does a referral qualify?',
    'A new unique adult must complete registration, have required payment verified, receive admin profile approval, and pass a documented duplicate-account/fraud review. Rewards remain subject to published terms.',
  ],
  [
    'Can I block or report someone?',
    'Yes. On Explore Profiles, select Report to contact moderators or Block to prevent reciprocal discovery and cancel active invitations.',
  ],
  [
    'Can I remove my account?',
    'Request deletion in account settings. Your listing is hidden immediately; the operator securely completes deletion and communicates any lawful retention requirements.',
  ],
  [
    'Can I use Google Forms instead?',
    'Yes, in starter mode with a configured published form link. Google Forms collects responses; it does not provide Datezy’s built-in login, profile discovery, or admin dashboard.',
  ],
  [
    'Do you offer paid companionship?',
    'No. Paid host booking and companionship are disabled. This release supports consensual social connection only.',
  ],
];
function FAQ() {
  const { settings } = useApp();
  return (
    <div className="container page narrow">
      <PageHead eyebrow="A LITTLE CLARITY" title="Questions? We’ve got you." />
      <div className="faq-list">
        <details>
          <summary>
            How much is registration?
            <ChevronDown size={18} />
          </summary>
          <p>
            {settings.fees_enabled
              ? `Current proposed fees are ${money(settings.male_fee)} for men and ${money(settings.female_fee)} for women. Your fee is fixed when your account is created. Payment methods and official policies must be configured before money is collected.`
              : 'Registration fees are currently disabled.'}
          </p>
        </details>
        {faqItems.map(([q, a]) => (
          <details key={q}>
            <summary>
              {q}
              <ChevronDown size={18} />
            </summary>
            <p>{a}</p>
          </details>
        ))}
      </div>
      <Link className="button ghost" to="/contact">
        Still need help? Contact us <ArrowRight size={18} />
      </Link>
    </div>
  );
}
const policyContent = {
  terms: {
    title: 'Terms & conditions.',
    sections: [
      [
        'Eligibility & account use',
        'Datezy is for adults aged 18 and above. Provide truthful information and use one account. Your account may remain pending, be rejected, or be suspended after review. Age is self-declared and validated by date of birth; approval is not identity verification or a safety guarantee.',
      ],
      [
        'Consent & lawful use',
        'A social date requires ongoing mutual consent. No fee guarantees availability, acceptance, affection, or a meeting. Coercion, exploitation, harassment, impersonation, fraud, and unlawful activity are prohibited. Paid companionship is not offered.',
      ],
      [
        'Payments & review',
        'A required registration fee is shown after signup and is fixed for that account. Only official configured methods may be used. A submitted reference means Pending Verification, not payment success. Payment verification and profile approval are separate. Do not pay before official refund and cancellation terms are published.',
      ],
      [
        'Referrals & rewards',
        'A unique code can be shared with consenting adults. Only new unique accounts with complete registration, verified required payment, approved profile, and documented fraud review qualify. Self-referrals, account farming, repeated claims, and duplicate rewards are prohibited. The reward amount is fixed when a referred account registers. Payout timing and any applicable conditions must be published by the operator.',
      ],
      [
        'Moderation & disputes',
        'Administrators may review reports and restrict accounts for safety or fraud. Contact support to request review of a moderation or payment decision. Legal operator identity, governing-law details, dispute procedure, and support response targets must be finalized before public launch.',
      ],
    ],
  },
  privacy: {
    title: 'Privacy policy.',
    sections: [
      [
        'What we collect',
        'Account email, name, Bangladesh mobile number, date of birth, gender and meeting preferences, district/area, bio, interests, optional photo, consent timestamps, registration status, referral relationships, date invitations, and submitted payment references. We do not collect NID numbers or photos in this release. Supabase Auth manages passwords; Datezy never stores plaintext passwords.',
      ],
      [
        'Public & private data',
        'Only approved, consented listings expose display name, age, gender, district, interests, photo, short bio, and meeting preferences. Private phone numbers, emails, birth dates, financial references, and moderation records are not published. Public listings and their approved photos may be accessible to visitors with links; discovery and invitations require an approved adult account.',
      ],
      [
        'Why & where data is used',
        'Data supports authentication, profile review, consensual invitations, manual payment checks, fraud prevention, referrals, safety moderation, and support. Supabase handles authentication/database/storage; Vercel hosts the website. Configure and disclose provider region, cross-border processing, legal operator identity, and the precise legal basis before launch. No advertising trackers are included in the starter code.',
      ],
      [
        'Your choices & deletion',
        'You can withdraw listing consent, edit permitted profile fields, block/report profiles, and request deletion. Listing removal is immediate; backend account and photo deletion is completed by the operator. Signed photo URLs can remain usable for up to 15 minutes after listing withdrawal. Backups and any legally required financial retention need a documented retention schedule before launch.',
      ],
      [
        'Storage & account security',
        'A browser session is stored locally to keep you signed in. Log out on shared devices. Profile photos use private storage and short-lived signed links. Access is controlled by row-level security and server-side role checks. No system can guarantee absolute security; do not share sensitive documents or private addresses in a bio.',
      ],
    ],
  },
  community: {
    title: 'Community guidelines.',
    sections: [
      [
        'Respect is the minimum',
        'Be truthful, kind, and age-appropriate. No harassment, hate, threats, stalking, unsolicited sexual content, impersonation, or sharing another person’s private information.',
      ],
      [
        'Consent is ongoing',
        'An invitation may be declined without explanation. An accepted invitation may be withdrawn. A person’s boundaries can change at any time. Payments never override consent.',
      ],
      [
        'Meet safely',
        'Choose a busy public place, tell a trusted person your plans, arrange your own transportation, keep valuables secure, and leave if uncomfortable. Do not transfer money to other members or disclose private home addresses.',
      ],
      [
        'No coercion or exploitation',
        'Minors, trafficking, coercive behavior, illegal solicitation, or exploitative transactions are prohibited. Paid companionship and host booking are not enabled.',
      ],
      [
        'Help keep the community safe',
        'Use Report Profile for concerns and Block User to stop discovery/invitations. Moderators can review, reject, or suspend profiles. Repeated false reports, referral farming, and payment fraud are also prohibited.',
      ],
    ],
  },
};
function Policy({ kind }) {
  const { settings } = useApp();
  const content = policyContent[kind];
  return (
    <div className="container page narrow">
      <PageHead eyebrow="TRUST, IN PLAIN LANGUAGE" title={content.title} />
      {!settings[kind] && (
        <Notice>
          Starter policy draft — not legal advice. The operator must review,
          complete, and publish its final policy and business details before
          launch.
        </Notice>
      )}
      <section className="panel policy-body">
        {settings[kind] ? (
          <p className="policy-copy">{settings[kind]}</p>
        ) : (
          content.sections.map(([t, d]) => (
            <section key={t}>
              <h2>{t}</h2>
              <p>{d}</p>
            </section>
          ))
        )}
        {kind === 'terms' && (
          <>
            <section>
              <h2>Current referral terms</h2>
              <p className="policy-copy">{settings.referral_terms}</p>
            </section>
            <section>
              <h2>Refunds & cancellation</h2>
              <p className="policy-copy">{settings.refund_policy}</p>
            </section>
          </>
        )}
        <p>
          For questions, <Link to="/contact">contact support</Link>.
        </p>
      </section>
    </div>
  );
}
