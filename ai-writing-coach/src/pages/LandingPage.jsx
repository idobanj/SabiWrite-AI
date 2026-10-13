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
    Info,
    ChevronDown,
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

/**
 * Typewriter hook — types `text` char-by-char, pauses, then erases,
 * then repeats. Returns the currently-visible slice of the string.
 */
function useTypewriter(text, {typeSpeed = 60, eraseSpeed = 35, pauseMs = 2200, startDelay = 700} = {}) {
    const [displayed, setDisplayed] = useState('');
    const [phase, setPhase] = useState('waiting'); // waiting | typing | pausing | erasing

    useEffect(() => {
        let timer;

        if (phase === 'waiting') {
            timer = setTimeout(() => setPhase('typing'), startDelay);

        } else if (phase === 'typing') {
            if (displayed.length < text.length) {
                timer = setTimeout(
                    () => setDisplayed(text.slice(0, displayed.length + 1)),
                    typeSpeed,
                );
            } else {
                setPhase('pausing');
            }

        } else if (phase === 'pausing') {
            timer = setTimeout(() => setPhase('erasing'), pauseMs);

        } else if (phase === 'erasing') {
            if (displayed.length > 0) {
                timer = setTimeout(
                    () => setDisplayed(text.slice(0, displayed.length - 1)),
                    eraseSpeed,
                );
            } else {
                setPhase('typing');
            }
        }

        return () => clearTimeout(timer);
    }, [phase, displayed, text, typeSpeed, eraseSpeed, pauseMs, startDelay]);

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
    const typedText = useTypewriter('Writing Coach', {typeSpeed: 120, eraseSpeed: 70, pauseMs: 3000});

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

            <main ref={pageRef}>

                {/* ═══════════════════════════════════════
                    SECTION 1 — HERO  (full-screen)
                ═══════════════════════════════════════ */}
                <section
                    id='hero'
                    aria-labelledby='hero-heading'
                    className='relative flex flex-col items-center justify-center min-h-screen overflow-hidden px-4 sm:px-12'>

                    {/* Animated background orbs */}
                    <div aria-hidden='true' className='pointer-events-none absolute inset-0 -z-10'>
                        <div className='animate-orb-1 absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full bg-brand-500/10 blur-3xl' />
                        <div className='animate-orb-2 absolute top-1/2 -right-48 w-[480px] h-[480px] rounded-full bg-indigo-400/10 blur-3xl' />
                        <div className='animate-orb-1 absolute bottom-0 left-1/3 w-[360px] h-[360px] rounded-full bg-emerald-400/8 blur-3xl' />
                    </div>

                    {/* Content grid */}
                    <div className='w-full max-w-7xl mx-auto grid lg:grid-cols-12 items-center gap-12 py-24 lg:py-0'>

                        {/* Left copy */}
                        <div className='lg:col-span-7 space-y-7'>

                            {/* Badge */}
                            <div className='animate-fade-up flex justify-center lg:justify-start'>
                                <span className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-500/20 text-brand-500 text-xs font-semibold tracking-wide'>
                                    <Sparkles className='w-3 h-3' aria-hidden='true' />
                                    AI-Powered Coaching
                                </span>
                            </div>

                            <h1
                                id='hero-heading'
                                className='animate-fade-up animate-fade-up-delay-1 text-4xl sm:text-5xl lg:text-[3.9rem] font-bold text-slate-900 dark:text-white tracking-tight leading-[1.05] text-center lg:text-left'>
                                Your AI-Powered{' '}
                                <span className='block sm:inline'>English</span>{' '}
                                <span className='block sm:inline-block min-h-[1.15em]'>
                                    <span className='animate-gradient-text bg-gradient-to-r from-brand-500 via-indigo-500 to-brand-500'>
                                        {typedText}
                                    </span>
                                    <span
                                        aria-hidden='true'
                                        className='inline-block w-[3px] h-[0.85em] ml-1 align-middle rounded-sm bg-brand-500 animate-[blink_1s_step-end_infinite]'
                                    />
                                </span>
                            </h1>

                            <p
                                id='hero-description'
                                className='animate-fade-up animate-fade-up-delay-2 text-xl text-slate-600 dark:text-slate-300 leading-relaxed text-center lg:text-left md:px-10 lg:px-0'>
                                Stop using software as a crutch. SabiWrite AI
                                doesn't just fix your typos—it acts as an elite
                                personal tutor, analyzing your weaknesses and
                                generating dynamic lessons to elevate your
                                communication.
                            </p>

                            <div className='animate-fade-up animate-fade-up-delay-3 flex flex-col sm:flex-row justify-center lg:justify-start gap-3'>
                                <Link to='/login' aria-label='Create a free Sabiwrite AI account'>
                                    <Button
                                        type='button'
                                        className='w-full text-[17px] transition-transform duration-200 hover:scale-[1.03] active:scale-95'
                                        size='lg'
                                        rightIcon={<ArrowRight aria-hidden='true' className='w-4 h-4' />}>
                                        Start Improving Now
                                    </Button>
                                </Link>
                                <a href='#demo' aria-label='Try the SabiWrite AI interactive demo'>
                                    <Button
                                        className='border dark:border-gray-700 border-gray-200 text-gray-700 dark:text-gray-300 w-full text-[17px] transition-transform duration-200 hover:scale-[1.03] active:scale-95'
                                        variant='ghost'
                                        size='lg'>
                                        Try the Demo ↓
                                    </Button>
                                </a>
                            </div>
                        </div>

                        {/* Right — floating mock card */}
                        <div className='animate-fade-up animate-fade-up-delay-4 lg:col-span-5'>
                            <div className='animate-float bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-brand-soft overflow-hidden'>
                                <div className='flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700'>
                                    <div className='flex items-center gap-1.5 py-2.5'>
                                        <span className='w-2.5 h-2.5 rounded-full bg-red-600' />
                                        <span className='w-2.5 h-2.5 rounded-full bg-yellow-600' />
                                        <span className='w-2.5 h-2.5 rounded-full bg-green-500' />
                                    </div>
                                    <span className='text-[13px] font-medium text-slate-400'>
                                        Writing Analysis Mock
                                    </span>
                                </div>
                                <div className='p-5 space-y-3 py-7 px-5'>
                                    <div className='p-4 rounded-xl border border-red-200/60 dark:border-red-500/20 bg-red-50/40 dark:bg-red-500/5'>
                                        <p className='text-[12px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1.5'>
                                            Your Draft
                                        </p>
                                        <p className='text-sm text-slate-600 dark:text-slate-300 leading-relaxed'>
                                            The company{' '}
                                            <span className='line-through text-error decoration-wavy'>does tried</span>{' '}
                                            to reach new clients but{' '}
                                            <span className='line-through text-error decoration-wavy'>they has</span>{' '}
                                            failed.
                                        </p>
                                    </div>
                                    <div className='p-4 rounded-xl border border-emerald-200/60 dark:border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-500/5'>
                                        <p className='text-[12px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1.5'>
                                            Coach Correction
                                        </p>
                                        <p className='text-sm text-slate-700 dark:text-slate-200 leading-relaxed'>
                                            The company{' '}
                                            <span className='text-emerald-600 dark:text-emerald-400 font-semibold underline decoration-2'>has tried</span>{' '}
                                            to reach new clients but{' '}
                                            <span className='text-emerald-600 dark:text-emerald-400 font-semibold underline decoration-2'>they have</span>{' '}
                                            failed.
                                        </p>
                                    </div>
                                    <div className='p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 flex items-start gap-2.5'>
                                        <div className='p-1 bg-brand-50 text-brand-500 rounded-md flex-shrink-0'>
                                            <Info className='w-3.5 h-3.5' />
                                        </div>
                                        <div>
                                            <p className='text-xs font-semibold text-slate-900 dark:text-white'>
                                                Subject-verb agreement
                                            </p>
                                            <p className='text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5'>
                                                "They" is plural — it takes "have", not "has".
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Scroll cue */}
                    <a
                        href='#demo'
                        aria-label='Scroll to demo'
                        className='animate-fade-up animate-fade-up-delay-5 absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-slate-400 hover:text-brand-500 transition-colors duration-200'>
                        <span className='text-[11px] font-medium tracking-widest uppercase'>Scroll</span>
                        <ChevronDown className='w-4 h-4 animate-bounce' />
                    </a>
                </section>

                {/* ═══════════════════════════════════════
                    SECTION 2 — INTERACTIVE DEMO  (full-screen)
                ═══════════════════════════════════════ */}
                <section
                    id='demo'
                    aria-labelledby='demo-heading'
                    className='relative flex flex-col justify-center min-h-screen px-4 sm:px-12 bg-slate-50/60 dark:bg-slate-900/40'>

                    {/* Subtle divider top */}
                    <div aria-hidden='true' className='absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent' />

                    <div className='w-full max-w-7xl mx-auto py-24 lg:py-0 space-y-10'>

                        {/* Heading */}
                        <div className='reveal text-center space-y-2'>
                            <span className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-500/20 text-brand-500 text-xs font-semibold tracking-wide mb-2'>
                                <Sparkles className='w-3 h-3' aria-hidden='true' />
                                Live Playground
                            </span>
                            <h2
                                id='demo-heading'
                                className='text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight'>
                                Try It Out Right Now
                            </h2>
                            <p className='text-[16px] text-slate-500 dark:text-slate-400 max-w-lg mx-auto'>
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
                        <div className='reveal reveal-delay-2 hover-lift bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5'>
                            <textarea
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                rows={6}
                                className='w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl p-4 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 resize-none'
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

                    {/* Scroll cue */}
                    <a
                        href='#features'
                        aria-label='Scroll to features'
                        className='absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-slate-400 hover:text-brand-500 transition-colors duration-200'>
                        <span className='text-[11px] font-medium tracking-widest uppercase'>Features</span>
                        <ChevronDown className='w-4 h-4 animate-bounce' />
                    </a>

                    <div aria-hidden='true' className='absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent' />
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
                            <span className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-500 text-xs font-semibold tracking-wide'>
                                Why SabiWrite AI
                            </span>
                            <h2
                                id='features-heading'
                                className='text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight'>
                                Built to Make You Actually Improve
                            </h2>
                            <p className='text-[16px] text-slate-500 dark:text-slate-400 max-w-xl mx-auto'>
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
                        className='absolute bottom-0 inset-x-0 py-6 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-400 text-center'>
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
            className='px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-brand-500/50 dark:hover:border-brand-500/40 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-full transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm'>
            {children}
        </button>
    );
}

function ValueProp({icon, tone, title, body, delay}) {
    const toneClass = {
        brand: 'bg-brand-50 text-brand-500 dark:bg-brand-500/10',
        indigo: 'bg-indigo-50 text-indigo-500 dark:bg-indigo-500/10',
        emerald: 'bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10',
        amber: 'bg-amber-50 text-amber-500 dark:bg-amber-500/10',
    }[tone];

    const delayClass = {
        1: 'reveal-delay-1',
        2: 'reveal-delay-2',
        3: 'reveal-delay-3',
        4: 'reveal-delay-4',
    }[delay] ?? '';

    return (
        <div className={`reveal ${delayClass} hover-lift p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-4`}>
            <div className={`p-2.5 rounded-xl w-fit ${toneClass}`}>{icon}</div>
            <h3 className='font-semibold text-slate-900 dark:text-white text-[15px]'>{title}</h3>
            <p className='text-sm text-slate-500 dark:text-slate-400 leading-relaxed'>{body}</p>
        </div>
    );
}
