/** @format */

import {Helmet} from 'react-helmet-async';
import {Link} from 'react-router-dom';
import {useState, useEffect, useRef} from 'react';
import {
    PenTool,
    BarChart2,
    GraduationCap,
    Award,
    Sparkles,
    ArrowRight,
} from 'lucide-react';
import {Button} from '../components/Button';
import {useToast} from '../components/Toast';

const templates = {
    pitch: 'Dear hiring team, I am writing to propose my services. The team of developers does tried to fix the API modules, but they has failed continuously. We need to implement a clean architecture as soon as possible. I am looking forward to see you.',
    chat: 'Hi sir! I am happy to tell you that the project details is ready. Everybody in our group are working to ensure we submit early. Let me know when you has time to check.',
    essay: 'The economic situation in Nigeria are challenging. Many youth struggles to get remote jobs due to this gap. I strongly believes that digital education provide a viable escape route.',
};

/** Triggers .is-visible on elements that enter the viewport */
function useReveal() {
    const ref = useRef(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const targets = el.querySelectorAll('.reveal');
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((e) => {
                    if (e.isIntersecting) {
                        e.target.classList.add('is-visible');
                    }
                });
            },
            {threshold: 0.1},
        );
        targets.forEach((t) => observer.observe(t));
        return () => observer.disconnect();
    }, []);
    return ref;
}

/** Keep the typing loop separate from the hero's one-time entrance. */
function useTypewriter(text, {startDelay = 1100, typeSpeed = 110, eraseSpeed = 65, pauseMs = 2800} = {}) {
    const [displayed, setDisplayed] = useState('');

    useEffect(() => {
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        let timer;

        const start = () => {
            clearTimeout(timer);
            if (reducedMotion.matches) {
                setDisplayed(text);
                return;
            }

            setDisplayed('');
            let length = 0;
            let erasing = false;

            const tick = () => {
                length += erasing ? -1 : 1;
                setDisplayed(text.slice(0, length));

                if (length === text.length) {
                    erasing = true;
                    timer = setTimeout(tick, pauseMs);
                } else if (length === 0) {
                    erasing = false;
                    timer = setTimeout(tick, 900);
                } else {
                    timer = setTimeout(tick, erasing ? eraseSpeed : typeSpeed);
                }
            };

            timer = setTimeout(tick, startDelay);
        };

        start();
        reducedMotion.addEventListener('change', start);
        return () => {
            clearTimeout(timer);
            reducedMotion.removeEventListener('change', start);
        };
    }, [text, startDelay, typeSpeed, eraseSpeed, pauseMs]);

    return displayed;
}

/**
 * Landing page. The interactive demo is visual only — submitting it
 * routes the user through the auth flow.
 */
export function LandingPage() {
    const [draft, setDraft] = useState('');
    const {show} = useToast();
    const pageRef = useReveal();
    const typedText = useTypewriter('Writing Coach');

    // Landing page is strictly light mode alone
    useEffect(() => {
        const root = document.documentElement;
        const wasDark = root.classList.contains('dark');
        if (wasDark) {
            root.classList.remove('dark');
        }
        return () => {
            if (wasDark) {
                root.classList.add('dark');
            }
        };
    }, []);

    const handleTemplateClick = (key) => {
        setDraft(templates[key]);
        show(`Loaded the ${key} draft.`);
    };

    const handleCheckClick = () => {
        if (!draft.trim()) {
            show('Type or paste something first.');
            return;
        }
        show('Sign in to run a real analysis on your draft.');
    };

    return (
        <>
            <Helmet>
                {/* Primary SEO*/}
                <title>SabiWrite AI — Your AI English Writing Coach</title>

                <meta
                    name='description'
                    content='SabiWrite AI is an AI-powered English writing coach that helps you improve your English by detecting recurring grammar mistakes, explaining them, and creating personalized lessons based on your writing.'
                />
                <meta
                    name='keywords'
                    content='AI writing coach, English writing coach, grammar checker, AI grammar tutor, writing improvement, essay writing, email writing, English learning, SabiWrite AI'
                />
                <meta name='author' content='SabiWrite AI' />
                <meta name='robots' content='index, follow' />
                <meta name='theme-color' content='#2563EB' />

                {/*==========Canonical============================================================ */}
                <link rel='canonical' href='https://sabiwrite-ai.vercel.app/' />

                {/* ======================OpenGraph=================== */}
                <meta property='og:type' content='website' />
                <meta property='og:url' content='https://sabiwrite-ai.vercel.app/' />
                <meta property='og:title' content='SabiWrite AI — Your AI English Writing Coach' />
                <meta property='og:description' content='Improve your English writing with personalized AI coaching that learns from your recurring mistakes.' />
                <meta property='og:image' content='https://sabiwrite-ai.vercel.app/og-image.png' />
                <meta property='og:site_name' content='SabiWrite AI' />

                {/* Twitter */}
                <meta name='twitter:card' content='summary_large_image' />
                <meta name='twitter:title' content='SabiWrite AI' />
                <meta name='twitter:description' content='Your AI English Writing Coach.' />
                <meta name='twitter:image' content='https://sabiwrite-ai.vercel.app/og-image.png' />

                {/* JSON-LD */}
                <script type='application/ld+json'>
                    {JSON.stringify({
                        '@context': 'https://schema.org',
                        '@graph': [
                            {
                                '@type': 'SoftwareApplication',
                                name: 'SabiWrite AI',
                                applicationCategory: 'EducationalApplication',
                                operatingSystem: 'Web',
                                url: 'https://sabiwrite-ai.vercel.app/',
                                description: 'An AI-powered English writing coach that helps users improve by identifying recurring mistakes and generating personalized lessons.',
                                offers: {'@type': 'Offer', price: '0', priceCurrency: 'USD'},
                            },
                            {'@type': 'WebSite', name: 'SabiWrite AI', url: 'https://sabiwrite-ai.vercel.app/'},
                            {'@type': 'Organization', name: 'SabiWrite AI', url: 'https://sabiwrite-ai.vercel.app/', logo: 'https://sabiwrite-ai.vercel.app/logo.png'},
                        ],
                    })}
                </script>
            </Helmet>

            <main ref={pageRef} className='bg-slate-50 text-slate-800'>

                {/* ═══════════════════════════════════════
                    SECTION 1 — HERO
                ═══════════════════════════════════════ */}
                <section
                    id='hero'
                    aria-labelledby='hero-heading'
                    className='landing-hero relative isolate overflow-hidden flex flex-col min-h-screen px-4 sm:px-8 bg-slate-50'>

                    {/* Top Bar: Logo on left, Login button on top right */}
                    <div className='hero-motion hero-nav w-full max-w-7xl mx-auto flex items-center justify-between pt-8 sm:pt-12 pb-4 relative z-20'>
                        <div className='flex items-center gap-2.5 sm:gap-3 text-slate-800 font-extrabold text-lg sm:text-xl tracking-tight'>
                            <div className='w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-brand-500 text-white flex items-center justify-center font-black text-base sm:text-lg shadow-sm'>
                                S
                            </div>
                            <span>
                                SabiWrite<span className='text-brand-500'>.ai</span>
                            </span>
                        </div>

                        <Link
                            to='/login'
                            className='px-6 py-2 sm:px-7 sm:py-2.5 rounded-full text-sm sm:text-base font-semibold text-slate-800 hover:text-slate-950 border border-slate-200 bg-white hover:bg-slate-100 shadow-sm transition-all duration-200 hover:scale-105 active:scale-95'>
                            Log in
                        </Link>
                    </div>

                    {/* Centered Hero Content */}
                    <div className='w-full max-w-7xl mx-auto pt-8 sm:pt-14 pb-12 text-center relative z-10 flex flex-col items-center'>

                        {/* The badge settles in after the headline and actions. */}
                        <div className='hero-motion hero-badge mb-6 sm:mb-8 flex justify-center'>
                            <span className='inline-flex flex-nowrap items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 text-xs sm:text-sm font-semibold leading-none tracking-wide whitespace-nowrap shadow-sm'>
                                <span className='w-4 h-4 shrink-0 rounded-full bg-brand-500 text-white inline-flex items-center justify-center'>
                                    <Sparkles className='w-3 h-3' aria-hidden='true' />
                                </span>
                                <span>AI-Powered Coaching</span>
                            </span>
                        </div>

                        {/* Each complete line rises through its own stationary mask. */}
                        <h1
                            id='hero-heading'
                            className='text-4xl sm:text-6xl lg:text-[4.5rem] xl:text-[5.2rem] font-extrabold text-slate-900 tracking-tight leading-[1.08] max-w-5xl mx-auto'>
                            <span className='hero-line-mask'>
                                <span className='hero-motion hero-headline-line hero-headline-first'>
                                    Your AI-Powered{' '}
                                    <span className='inline'>English</span>
                                </span>
                            </span>
                            <span className='hero-line-mask'>
                                <span className='hero-motion hero-headline-line hero-headline-second'>
                                    <span className='sr-only'>Writing Coach</span>
                                    <span className='hero-typewriter' aria-hidden='true'>
                                        <span className='hero-typewriter-measure'>Writing Coach</span>
                                        <span className='hero-typewriter-text'>
                                            <span className='bg-gradient-to-r from-brand-500 via-indigo-500 to-brand-500 bg-clip-text text-transparent'>{typedText}</span>
                                            <span className='hero-typewriter-cursor' />
                                        </span>
                                    </span>
                                </span>
                            </span>
                        </h1>

                        {/* Subtitle with masked slide-up */}
                        <div className='overflow-hidden mt-5 max-w-xl mx-auto'>
                            <p
                                id='hero-description'
                                className='hero-motion hero-description text-base sm:text-lg text-slate-600 leading-relaxed'>
                                Stop using software as a crutch. SabiWrite AI
                                doesn't just fix your typos—it acts as an elite
                                personal tutor, analyzing your weaknesses and
                                generating dynamic lessons to elevate your
                                communication.
                            </p>
                        </div>

                        {/* Keep the buttons and their shadows clear of the text masks. */}
                        <div className='hero-motion hero-actions mt-8 flex flex-nowrap items-center justify-center gap-2 sm:gap-4'>
                            <Link
                                to='/login'
                                aria-label='Create a free SabiWrite AI account'
                                className='inline-flex shrink-0 items-center justify-center gap-1.5 sm:gap-2 min-h-11 rounded-full px-3 py-2.5 sm:px-7 sm:py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs min-[375px]:text-sm sm:text-[15px] font-medium shadow-md shadow-slate-900/10 hover:shadow-lg transition duration-200 hover:scale-[1.03] active:scale-95 whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-500'>
                                Start Improving Now
                                <ArrowRight aria-hidden='true' className='w-3.5 h-3.5 shrink-0 sm:w-4 sm:h-4' />
                            </Link>
                            <a
                                href='#demo'
                                aria-label='Try the SabiWrite AI interactive demo'
                                className='inline-flex shrink-0 items-center justify-center min-h-11 rounded-full px-3 py-2.5 sm:px-6 sm:py-3 border border-slate-200 text-slate-700 bg-white hover:bg-slate-100 text-xs min-[375px]:text-sm sm:text-[15px] font-medium shadow-sm transition duration-200 hover:scale-[1.03] active:scale-95 whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-500'>
                                Try the Demo ↓
                            </a>
                        </div>

                        {/* Dashboard Preview Image (responsive: phone mockup on mobile, window mockup on tablet/desktop) */}
                        <div className='hero-motion hero-dashboard w-full max-w-7xl mx-auto mt-10 sm:mt-16 px-2 sm:px-6 relative'>
                            {/* Mobile Phone Mockup (visible on mobile only) */}
                            <div className='hero-preview-fade hero-preview-fade-mobile block sm:hidden w-full max-w-[280px] mx-auto'>
                                <img
                                    src='/hero-dashboard-mobile-cutout.png'
                                    alt='SabiWrite AI Mobile Progress Dashboard'
                                    className='w-full h-auto block drop-shadow-2xl select-none pointer-events-none'
                                    width='887'
                                    height='1774'
                                    loading='eager'
                                />
                            </div>

                            {/* Desktop Dashboard Mockup (visible on tablet and desktop) */}
                            <div className='hero-preview-fade hidden sm:block rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08),0_0_1px_1px_rgba(0,0,0,0.02)] overflow-hidden'>
                                {/* Window Chrome Header */}
                                <div className='flex items-center gap-1.5 px-4 py-2.5 bg-slate-100/90 border-b border-slate-200/80'>
                                    <span className='w-2.5 h-2.5 rounded-full bg-red-400' />
                                    <span className='w-2.5 h-2.5 rounded-full bg-amber-400' />
                                    <span className='w-2.5 h-2.5 rounded-full bg-emerald-400' />
                                </div>

                                {/* Dashboard Image */}
                                <img
                                    src='/hero-dashboard.png'
                                    alt='SabiWrite AI Progress Dashboard'
                                    className='w-full h-auto block select-none pointer-events-none'
                                    width='1024'
                                    height='516'
                                    loading='eager'
                                />
                            </div>
                        </div>

                    </div>
                </section>

                {/* ═══════════════════════════════════════
                    SECTION 2 — INTERACTIVE DEMO  (full-screen)
                ═══════════════════════════════════════ */}
                <section
                    id='demo'
                    aria-labelledby='demo-heading'
                    className='relative flex flex-col justify-center min-h-screen px-4 sm:px-12 bg-slate-100/60'>

                    {/* Subtle divider top */}
                    <div aria-hidden='true' className='absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent' />

                    <div className='w-full max-w-7xl mx-auto py-24 lg:py-0 space-y-10'>

                        {/* Heading */}
                        <div className='reveal text-center space-y-2'>
                            <span className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 border border-brand-100 text-brand-500 text-xs font-semibold tracking-wide mb-2'>
                                <Sparkles className='w-3 h-3' aria-hidden='true' />
                                Live Playground
                            </span>
                            <h2
                                id='demo-heading'
                                className='text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight'>
                                Try It Out Right Now
                            </h2>
                            <p className='text-[16px] text-slate-500 max-w-lg mx-auto'>
                                Pick a sample draft or type your own. See how SabiWrite AI
                                flags patterns and explains every correction.
                            </p>
                        </div>

                        {/* Template pills */}
                        <div className='reveal reveal-delay-1 flex flex-wrap gap-2 justify-center'>
                            <TemplateButton onClick={() => handleTemplateClick('pitch')}>
                                A client proposal
                            </TemplateButton>
                            <TemplateButton onClick={() => handleTemplateClick('chat')}>
                                A freelancer message
                            </TemplateButton>
                            <TemplateButton onClick={() => handleTemplateClick('essay')}>
                                A scholarship essay
                            </TemplateButton>
                        </div>

                        {/* Textarea card */}
                        <div className='reveal reveal-delay-2 hover-lift bg-white border border-slate-200 rounded-2xl p-5'>
                            <textarea
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                rows={6}
                                className='w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 resize-none'
                                placeholder='Type or paste your text here…'
                            />
                            <div className='flex items-center justify-between pt-3'>
                                <span className='text-xs text-slate-400'>
                                    {draft.trim() ? `${draft.trim().split(/\s+/).length} words` : 'Empty'}
                                </span>
                                <Button
                                    type='button'
                                    className='text-[15px] transition-transform duration-200 hover:scale-[1.04] active:scale-95'
                                    onClick={handleCheckClick}
                                    leftIcon={<Sparkles aria-hidden='true' className='w-3.5 h-3.5' />}>
                                    Check in Writing Desk
                                </Button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ═══════════════════════════════════════
                    SECTION 3 — FEATURES / VALUE PROPS  (full-screen)
                ═══════════════════════════════════════ */}
                <section
                    id='features'
                    aria-labelledby='features-heading'
                    className='relative flex flex-col justify-center min-h-screen px-4 sm:px-12'>

                    <div aria-hidden='true' className='pointer-events-none absolute inset-0 -z-10'>
                        <div className='animate-orb-2 absolute bottom-0 right-0 w-[420px] h-[420px] rounded-full bg-brand-500/8 blur-3xl' />
                    </div>

                    <div className='w-full max-w-7xl mx-auto py-24 lg:py-0 space-y-14'>

                        {/* Heading */}
                        <div className='reveal text-center space-y-3'>
                            <span className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-500 text-xs font-semibold tracking-wide'>
                                Why SabiWrite AI
                            </span>
                            <h2
                                id='features-heading'
                                className='text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight'>
                                Built to Make You Actually Improve
                            </h2>
                            <p className='text-[16px] text-slate-500 max-w-xl mx-auto'>
                                Four pillars that separate a real coach from a spell-checker.
                            </p>
                        </div>

                        {/* Cards grid */}
                        <article className='grid sm:grid-cols-2 lg:grid-cols-4 gap-5'>
                            <ValueProp
                                icon={<PenTool aria-hidden='true' className='w-5 h-5' />}
                                tone='brand'
                                title="Teacher's Desk"
                                body='Rather than silently correcting, the platform breaks down each correction in simple, understandable, localized mechanics.'
                                delay={1}
                            />
                            <ValueProp
                                icon={<BarChart2 aria-hidden='true' className='w-5 h-5' />}
                                tone='indigo'
                                title='Weakness Profiler'
                                body='We record patterns in your typing errors to isolate exactly where your logical understanding is failing.'
                                delay={2}
                            />
                            <ValueProp
                                icon={<GraduationCap aria-hidden='true' className='w-5 h-5' />}
                                tone='emerald'
                                title='Interactive Micro-Lessons'
                                body='Instantly convert detected weaknesses into specialized modules with quizzes to practice what you got wrong.'
                                delay={3}
                            />
                            <ValueProp
                                icon={<Award aria-hidden='true' className='w-5 h-5' />}
                                tone='amber'
                                title='Competition Ready'
                                body='Built using advanced Gemini API reasoning for robust processing and customized EdTech execution workflows.'
                                delay={4}
                            />
                        </article>


                    </div>

                    {/* Footer */}
                    <footer
                        role='contentinfo'
                        className='absolute bottom-0 inset-x-0 py-6 border-t border-slate-200 text-xs text-slate-400 text-center'>
                        © {new Date().getFullYear()} SabiWrite AI. All rights reserved.
                    </footer>
                </section>

            </main>
        </>
    );
}

function TemplateButton({onClick, children}) {
    return (
        <button
            onClick={onClick}
            className='px-4 py-2 bg-white border border-slate-200 hover:border-brand-500/50 text-slate-700 text-xs font-medium rounded-full transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm'>
            {children}
        </button>
    );
}

function ValueProp({icon, tone, title, body, delay}) {
    const toneClass = {
        brand: 'bg-brand-50 text-brand-500',
        indigo: 'bg-indigo-50 text-indigo-500',
        emerald: 'bg-emerald-50 text-emerald-500',
        amber: 'bg-amber-50 text-amber-500',
    }[tone];

    const delayClass = {
        1: 'reveal-delay-1',
        2: 'reveal-delay-2',
        3: 'reveal-delay-3',
        4: 'reveal-delay-4',
    }[delay] ?? '';

    return (
        <div className={`reveal ${delayClass} hover-lift p-6 bg-white border border-slate-200 rounded-2xl space-y-4`}>
            <div className={`p-2.5 rounded-xl w-fit ${toneClass}`}>{icon}</div>
            <h3 className='font-semibold text-slate-900 text-[15px]'>{title}</h3>
            <p className='text-sm text-slate-500 leading-relaxed'>{body}</p>
        </div>
    );
}
