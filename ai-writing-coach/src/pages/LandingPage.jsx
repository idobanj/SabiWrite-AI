/** @format */

import {Helmet} from 'react-helmet-async';
import {Link} from 'react-router-dom';
import {useState, useEffect} from 'react';
import {
    FileCheck2,
    BarChart3,
    BookOpen,
    Pencil,
    Search,
    GraduationCap,
    Sparkles,
    ArrowRight,
    ChevronDown,
    Check,
} from 'lucide-react';
import {LandingDemo} from '../components/LandingDemo';
import {WhoIsItForCarousel} from '../components/WhoIsItForCarousel';
import {useLandingMotion} from '../hooks/useLandingMotion';

const faqs = [
    {question: 'What is SabiWrite AI, and how does it work?', answer: 'SabiWrite AI is an AI-powered English writing coach designed to help you write better and learn from your mistakes. It analyses your writing, provides corrections and explanations, identifies recurring weaknesses, and offers personalized lessons and practice exercises to help you improve over time.'},
    {question: 'How is SabiWrite AI different from a regular grammar checker?', answer: 'A regular grammar checker primarily focuses on correcting errors in your text. SabiWrite AI goes further by helping you understand why mistakes occur, recognize recurring weaknesses, and practise the skills you need to improve. The goal is not just to correct your writing but to help you become a better writer.'},
    {question: 'Can SabiWrite AI identify mistakes I repeatedly make?', answer: 'Yes. SabiWrite AI can identify and track recurring weaknesses in your writing, helping you recognize patterns you might otherwise overlook. This allows you to understand which areas need more attention and focus your learning on them.'},
    {question: 'How do the personalized lessons and practice exercises work?', answer: 'SabiWrite AI uses identified writing weaknesses to guide your learning. It provides relevant lessons to help you understand specific concepts and practice exercises that allow you to apply what you\'ve learned. This helps you focus on the areas where you need the most improvement.'},
    {question: 'Can beginners use SabiWrite AI?', answer: 'Yes. SabiWrite AI is designed for people who want to improve their English writing, regardless of their current confidence level. Whether you\'re learning the basics or refining your writing skills, it can help you understand mistakes and learn from them.'},
    {question: 'What types of writing can I improve with it?', answer: 'SabiWrite AI can help you improve everyday written English, including messages, essays, emails, reports, and other forms of writing. You can use it to review your text, understand corrections, and learn ways to communicate more clearly and naturally.'},
    {question: 'Is SabiWrite AI free?', answer: 'Yes! You can currently use SabiWrite AI for free. We\'re continually improving the platform to provide a better writing and learning experience.'},
    {question: 'Is my writing data safe?', answer: 'Your privacy matters to us. SabiWrite AI collects your name and email address for account-related purposes. When you submit text for analysis, it is processed by our AI-powered writing system to generate feedback and corrections.\n\nWe aim to handle your information responsibly. For more information about how your information is handled, please read our Privacy Policy.'},
];

/** Keep the typing loop synchronized with the hero's scroll entrances. */
function useTypewriter(text, {active = true, startDelay = 400, typeSpeed = 75, eraseSpeed = 45, pauseMs = 1800} = {}) {
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
            if (!active) return;
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
                    timer = setTimeout(tick, 450);
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
    }, [text, active, startDelay, typeSpeed, eraseSpeed, pauseMs]);

    return displayed;
}

/**
 * Landing page with prepared coaching examples and authenticated draft handoff.
 */
export function LandingPage() {
    const {pageRef, heroActive} = useLandingMotion();
    const typedText = useTypewriter('Improve it.', {active: heroActive, pauseMs: 1800});
    const [openFaq, setOpenFaq] = useState(null);

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
                <meta property='og:image' content='https://sabiwrite-ai.vercel.app/og-image.webp' />
                <meta property='og:site_name' content='SabiWrite AI' />

                {/* Twitter */}
                <meta name='twitter:card' content='summary_large_image' />
                <meta name='twitter:title' content='SabiWrite AI' />
                <meta name='twitter:description' content='Your AI English Writing Coach.' />
                <meta name='twitter:image' content='https://sabiwrite-ai.vercel.app/og-image.webp' />

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
                            {'@type': 'Organization', name: 'SabiWrite AI', url: 'https://sabiwrite-ai.vercel.app/', logo: 'https://sabiwrite-ai.vercel.app/logo.webp'},
                        ],
                    })}
                </script>
            </Helmet>

            <main ref={pageRef} className='landing-page bg-slate-50 text-slate-800'>

                {/* ═══════════════════════════════════════
                    SECTION 1 — HERO
                ═══════════════════════════════════════ */}
                <section
                    id='hero'
                    aria-labelledby='hero-heading'
                    className='landing-hero relative isolate overflow-hidden flex flex-col min-h-0 sm:min-h-screen px-4 sm:px-8 bg-slate-50'>

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
                    <div className='w-full max-w-7xl mx-auto pt-6 sm:pt-14 pb-2 sm:pb-12 text-center relative z-10 flex flex-col items-center'>

                        {/* The badge leads into the headline reveal. */}
                        <div className='hero-motion hero-badge mb-6 sm:mb-8 flex justify-center'>
                            <span className='inline-flex flex-nowrap items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 text-xs sm:text-sm font-semibold leading-none tracking-wide whitespace-nowrap shadow-sm'>
                                <span className='w-4 h-4 shrink-0 rounded-full bg-brand-500 text-white inline-flex items-center justify-center'>
                                    <Sparkles className='w-3 h-3' aria-hidden='true' />
                                </span>
                                <span>AI-POWERED WRITING COACH</span>
                            </span>
                        </div>

                        {/* Each complete line rises through its own stationary mask.
                            Mobile (< sm): 3 lines — "Don't just correct your" | "English." | "Improve it."
                            Desktop (sm+): 2 lines — "Don't just correct your" | "English. Improve it." */}
                        <h1
                            id='hero-heading'
                            className='text-[1.85rem] sm:text-6xl lg:text-[4.5rem] xl:text-[5.2rem] font-extrabold text-slate-900 tracking-tight leading-[1.08] max-w-5xl mx-auto'>

                            {/* Line 1 — same on all breakpoints */}
                            <span className='hero-line-mask'>
                                <span className='hero-motion hero-headline-line hero-headline-first'>
                                    Don't just correct your
                                </span>
                            </span>

                            {/* ── Desktop (sm+): "English. Improve it." on one line ── */}
                            <div className='hidden sm:block'>
                                <span className='hero-line-mask'>
                                    <span className='hero-motion hero-headline-line hero-headline-second'>
                                        English.{' '}
                                        <span className='sr-only'>Improve it.</span>
                                        <span className='hero-typewriter' aria-hidden='true'>
                                            <span className='hero-typewriter-measure'>Improve it.</span>
                                            <span className='hero-typewriter-text'>
                                                <span className='bg-gradient-to-r from-brand-500 via-indigo-500 to-brand-500 bg-clip-text text-transparent'>{typedText}</span>
                                                <span className='hero-typewriter-cursor' />
                                            </span>
                                        </span>
                                    </span>
                                </span>
                            </div>

                            {/* ── Mobile (< sm): "English." and "Improve it." on separate lines ── */}
                            <div className='block sm:hidden'>
                                <span className='hero-line-mask'>
                                    <span className='hero-motion hero-headline-line hero-headline-second'>
                                        English.
                                    </span>
                                </span>
                                <span className='hero-line-mask'>
                                    <span className='hero-motion hero-headline-line hero-headline-third'>
                                        <span className='sr-only'>Improve it.</span>
                                        <span className='hero-typewriter' aria-hidden='true'>
                                            <span className='hero-typewriter-measure'>Improve it.</span>
                                            <span className='hero-typewriter-text'>
                                                <span className='bg-gradient-to-r from-brand-500 via-indigo-500 to-brand-500 bg-clip-text text-transparent'>{typedText}</span>
                                                <span className='hero-typewriter-cursor' />
                                            </span>
                                        </span>
                                    </span>
                                </span>
                            </div>

                        </h1>

                        {/* Subtitle with masked slide-up */}
                        <div className='overflow-hidden mt-5 max-w-xl mx-auto'>
                            <p
                                id='hero-description'
                                className='hero-motion hero-description text-base sm:text-lg text-slate-600 leading-relaxed'>
                                SabiWrite AI helps you understand your writing mistakes, discover recurring weaknesses, and improve through personalized lessons and practice.
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
                                aria-label='Explore a sample of SabiWrite AI'
                                className='inline-flex shrink-0 items-center justify-center min-h-11 rounded-full px-3 py-2.5 sm:px-6 sm:py-3 border border-slate-200 text-slate-700 bg-white hover:bg-slate-100 text-xs min-[375px]:text-sm sm:text-[15px] font-medium shadow-sm transition duration-200 hover:scale-[1.03] active:scale-95 whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-500'>
                                Explore a Sample
                            </a>
                        </div>

                        {/* Dashboard Preview Section (responsive: phone mockup on mobile, 3-piece showcase on tablet/desktop) */}
                        <div className='w-full max-w-7xl mx-auto mt-6 sm:mt-14 px-2 sm:px-6 relative'>
                            {/* Mobile Phone Mockup (visible on mobile only) */}
                            <div className='block sm:hidden w-full max-w-[340px] mx-auto'>
                                <div className='hero-motion hero-showcase-mobile'>
                                    <img
                                        src='/SabiWritePhone-1.webp'
                                        alt='SabiWrite AI Mobile Progress Dashboard'
                                        className='w-full h-auto block select-none pointer-events-none'
                                        width='2852'
                                        height='1487'
                                        loading='eager'
                                    />
                                </div>
                            </div>

                            {/* Desktop 3-Piece Showcase (visible on tablet and desktop: sm+) */}
                            <div className='hidden sm:block relative w-full max-w-6xl mx-auto pt-2 pb-12 sm:pb-16 lg:pb-24'>
                                {/* Middle / Main Dashboard (slides in from down to up) */}
                                <div className='hero-motion hero-showcase-center relative z-10 w-[84%] max-w-[960px] mx-auto rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xl bg-white overflow-hidden'>
                                    <img
                                        src='/hero-progress-dashboard.webp'
                                        alt='SabiWrite AI Progress Dashboard'
                                        className='w-full h-auto block select-none pointer-events-none'
                                        width='4032'
                                        height='2372'
                                        loading='eager'
                                    />
                                </div>

                                {/* Left Card: Coach Feedback Dashboard (slides in from the left) */}
                                <div className='hero-motion hero-showcase-left absolute z-20 left-[-4%] lg:left-[-2%] bottom-[0%] lg:bottom-[2%] w-[42%] max-w-[460px] pointer-events-none select-none'>
                                    <img
                                        src='/hero-coach-feedback.webp'
                                        alt='SabiWrite AI Coach Feedback'
                                        className='w-full h-auto block drop-shadow-2xl'
                                        width='2400'
                                        height='2400'
                                        loading='eager'
                                    />
                                </div>

                                {/* Right Card: Practice Quiz Interface (slides in from the right) */}
                                <div className='hero-motion hero-showcase-right absolute z-20 right-[-4%] lg:right-[-2%] bottom-[0%] lg:bottom-[2%] w-[42%] max-w-[460px] pointer-events-none select-none'>
                                    <img
                                        src='/hero-practice-quiz.webp'
                                        alt='SabiWrite AI Practice Quiz Interface'
                                        className='w-full h-auto block drop-shadow-2xl'
                                        width='2400'
                                        height='2300'
                                        loading='eager'
                                    />
                                </div>
                            </div>
                        </div>

                    </div>
                </section>

                {/* ═══════════════════════════════════════
                    SECTION 2 — WHY SABIWRITE / VALUE PROPS
                ═══════════════════════════════════════ */}
                <section
                    id='why-sabiwrite'
                    aria-labelledby='why-sabiwrite-heading'
                    className='relative overflow-hidden bg-white px-4 py-20 sm:px-8 sm:py-24 lg:py-28'>

                    <div className='w-full max-w-7xl mx-auto space-y-10 sm:space-y-12'>

                        {/* Heading */}
                        <div className='reveal text-center space-y-3.5 max-w-3xl mx-auto'>
                            <span className='inline-flex items-center px-3.5 py-1 rounded-full bg-brand-50 border border-brand-100 text-brand-600 text-xs font-bold tracking-wider uppercase'>
                                WHY SABIWRITE
                            </span>
                            <h2
                                id='why-sabiwrite-heading'
                                className='text-3xl sm:text-4xl lg:text-[2.65rem] font-extrabold text-slate-900 tracking-tight leading-[1.15]'>
                                Built to Help You Become a <span className='text-brand-500'>Better Writer</span>
                            </h2>
                            <p className='text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed'>
                                More than corrections: a practical way to understand your writing, learn from your mistakes, and improve over time.
                            </p>
                        </div>

                        {/* Cards grid: 2x2 layout on wide screens with staggered 2-by-2 reveal */}
                        <div className='space-y-6 sm:space-y-8 max-w-6xl mx-auto'>
                            {/* First pair: animate in first */}
                            <div className='grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8'>
                                <ValueProp
                                    icon={<FileCheck2 aria-hidden='true' className='w-6 h-6 stroke-[2.2]' />}
                                    iconBoxClass='bg-blue-50 border border-blue-100/90 text-blue-600'
                                    badge='Analysis & Feedback'
                                    badgeClass='bg-blue-50 text-blue-700 border border-blue-100'
                                    title='Understand Every Correction'
                                    body='Get clear explanations of writing mistakes so you can understand what needs to change and why.'
                                    delay={1}
                                    preview={
                                        <div className='rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 sm:p-5 text-left'>
                                            <div className='flex items-center justify-between gap-2 text-xs font-semibold text-slate-500 mb-2.5'>
                                                <span>Feedback Preview</span>
                                                <span className='inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full text-[11px] font-bold'>
                                                    <Check className='w-3 h-3 stroke-[2.5]' /> Explained
                                                </span>
                                            </div>
                                            <div className='text-xs sm:text-sm text-slate-700 bg-white rounded-xl p-3 border border-slate-200/70 shadow-sm leading-relaxed'>
                                                The team finished{' '}
                                                <span className='bg-red-50 text-red-600 line-through decoration-red-400 px-1 py-0.5 rounded font-medium'>
                                                    they&apos;re
                                                </span>{' '}
                                                <span className='bg-emerald-50 text-emerald-700 font-semibold px-1 py-0.5 rounded border border-emerald-200'>
                                                    their
                                                </span>{' '}
                                                quarterly review on time.
                                            </div>
                                            <p className='mt-2.5 text-xs text-slate-600 leading-relaxed bg-blue-50/70 border border-blue-100 rounded-lg p-2.5'>
                                                <strong className='text-blue-900'>Rule explanation:</strong> Use <em>&ldquo;their&rdquo;</em> for possession. <em>&ldquo;They&apos;re&rdquo;</em> is a contraction of <em>&ldquo;they are&rdquo;</em>.
                                            </p>
                                        </div>
                                    }
                                />
                                <ValueProp
                                    icon={<BarChart3 aria-hidden='true' className='w-6 h-6 stroke-[2.2]' />}
                                    iconBoxClass='bg-emerald-50 border border-emerald-100/90 text-emerald-600'
                                    badge='Smart Diagnostics'
                                    badgeClass='bg-emerald-50 text-emerald-700 border border-emerald-100'
                                    title='Discover Your Weaknesses'
                                    body='Identify recurring patterns in your writing and understand which areas need more attention.'
                                    delay={2}
                                    preview={
                                        <div className='rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 sm:p-5 text-left'>
                                            <div className='flex items-center justify-between gap-2 text-xs font-semibold text-slate-500 mb-3'>
                                                <span>Recurring Patterns Tracked</span>
                                                <span className='text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full text-[11px] font-bold'>
                                                    Active
                                                </span>
                                            </div>
                                            <div className='space-y-2.5'>
                                                <div className='bg-white rounded-xl p-3 border border-slate-200/70 shadow-sm'>
                                                    <div className='flex items-center justify-between text-xs mb-1.5'>
                                                        <span className='font-semibold text-slate-800'>Subject-Verb Agreement</span>
                                                        <span className='text-amber-600 font-bold'>45 errors logged</span>
                                                    </div>
                                                    <div className='w-full h-2 bg-slate-100 rounded-full overflow-hidden'>
                                                        <div className='h-full bg-amber-500 rounded-full w-[45%]' />
                                                    </div>
                                                </div>
                                                <div className='bg-white rounded-xl p-3 border border-slate-200/70 shadow-sm'>
                                                    <div className='flex items-center justify-between text-xs mb-1.5'>
                                                        <span className='font-semibold text-slate-800'>Homophones & Confused Words</span>
                                                        <span className='text-rose-600 font-bold'>118 errors logged</span>
                                                    </div>
                                                    <div className='w-full h-2 bg-slate-100 rounded-full overflow-hidden'>
                                                        <div className='h-full bg-rose-500 rounded-full w-[82%]' />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    }
                                />
                            </div>

                            {/* Second pair: animate in second */}
                            <div className='grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8'>
                                <ValueProp
                                    icon={<BookOpen aria-hidden='true' className='w-6 h-6 stroke-[2.2]' />}
                                    iconBoxClass='bg-purple-50 border border-purple-100/90 text-purple-600'
                                    badge='Adaptive Lessons'
                                    badgeClass='bg-purple-50 text-purple-700 border border-purple-100'
                                    title='Learn Through Personalized Lessons'
                                    body='Explore lessons tailored to the writing weaknesses identified by SabiWrite AI.'
                                    delay={1}
                                    preview={
                                        <div className='rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 sm:p-5 text-left'>
                                            <div className='flex items-center justify-between gap-2 text-xs font-semibold text-slate-500 mb-2.5'>
                                                <span>Personalized Lesson</span>
                                                <span className='text-purple-700 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-full text-[11px] font-bold'>
                                                    4 min read
                                                </span>
                                            </div>
                                            <div className='bg-white rounded-xl p-3.5 border border-slate-200/70 shadow-sm'>
                                                <div className='flex items-center gap-2 mb-1.5'>
                                                    <span className='w-5 h-5 rounded-full bg-purple-100 text-purple-700 font-bold text-[11px] flex items-center justify-center shrink-0'>
                                                        03
                                                    </span>
                                                    <h4 className='text-xs sm:text-sm font-bold text-slate-900'>
                                                        Conquering Comma Splices & Clauses
                                                    </h4>
                                                </div>
                                                <p className='text-xs text-slate-600 leading-relaxed pl-7'>
                                                    Learn when to use semicolons versus coordinating conjunctions to connect complete thoughts.
                                                </p>
                                            </div>
                                            <div className='mt-2.5 flex items-center gap-1.5 text-xs text-purple-700 px-1 font-medium'>
                                                <Sparkles className='w-3.5 h-3.5' /> Generated from your frequent patterns
                                            </div>
                                        </div>
                                    }
                                />
                                <ValueProp
                                    icon={<Pencil aria-hidden='true' className='w-6 h-6 stroke-[2.2]' />}
                                    iconBoxClass='bg-amber-50 border border-amber-100/90 text-amber-600'
                                    badge='Practice Drills'
                                    badgeClass='bg-amber-50 text-amber-700 border border-amber-100'
                                    title='Practise and Reinforce'
                                    body='Use targeted practice exercises to apply what you have learned and strengthen your writing skills.'
                                    delay={2}
                                    preview={
                                        <div className='rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 sm:p-5 text-left'>
                                            <div className='text-xs font-semibold text-slate-500 mb-2.5'>
                                                <span>Interactive Quiz</span>
                                            </div>
                                            <p className='text-xs sm:text-sm font-semibold text-slate-800 mb-2.5'>
                                                Neither of the candidates <span className='underline decoration-brand-400 underline-offset-2'>_____</span> available for interview.
                                            </p>
                                            <div className='space-y-1.5'>
                                                <div className='flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium bg-emerald-50 border border-emerald-300 text-emerald-900 shadow-sm'>
                                                    <span className='flex items-center gap-2'>
                                                        <span className='w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold'>
                                                            ✓
                                                        </span>
                                                        <span>is</span>
                                                    </span>
                                                    <span className='text-[11px] font-semibold text-emerald-700'>Correct answer</span>
                                                </div>
                                                <div className='flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium bg-white border border-slate-200/80 text-slate-400'>
                                                    <span>are</span>
                                                </div>
                                            </div>
                                        </div>
                                    }
                                />
                            </div>
                        </div>

                    </div>

                </section>

                <LandingDemo />

                {/* ═══════════════════════════════════════
                    SECTION 3 — HOW IT WORKS
                ═══════════════════════════════════════ */}
                <section
                    id='how-it-works'
                    aria-labelledby='how-it-works-heading'
                    className='relative overflow-hidden bg-white px-4 py-20 sm:px-8 sm:py-24 lg:py-28'>

                    <div className='w-full max-w-7xl mx-auto space-y-12 sm:space-y-14'>

                        {/* Heading */}
                        <div className='reveal text-center space-y-3.5 max-w-3xl mx-auto'>
                            <span className='inline-flex items-center px-3.5 py-1 rounded-full bg-indigo-50 border border-indigo-100/80 text-indigo-600 text-xs font-bold tracking-wider'>
                                How It Works
                            </span>
                            <h2
                                id='how-it-works-heading'
                                className='text-3xl sm:text-4xl lg:text-[2.65rem] font-extrabold text-slate-900 tracking-tight leading-[1.15]'>
                                From Corrections to <span className='text-brand-500'>Real Improvement</span>
                            </h2>
                            <p className='text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed'>
                                A simple process that helps you understand your mistakes, strengthen your writing skills, and keep learning.
                            </p>
                        </div>

                        {/* 3 Step Cards */}
                        <div className='grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6'>
                            <StepCard
                                icon={<FileCheck2 aria-hidden='true' className='w-5 h-5' />}
                                iconBoxClass='bg-blue-50 border border-blue-100/80 text-blue-600'
                                stepTag='STEP 1'
                                stepTagClass='bg-blue-50 text-blue-600 border border-blue-100/80'
                                title='Analyse Your Writing'
                                body='Submit your text and review the corrections and feedback generated by SabiWrite AI.'
                                delay={1}
                            />

                            <StepCard
                                icon={<Search aria-hidden='true' className='w-5 h-5' />}
                                iconBoxClass='bg-emerald-50 border border-emerald-100/80 text-emerald-600'
                                stepTag='STEP 2'
                                stepTagClass='bg-emerald-50 text-emerald-600 border border-emerald-100/80'
                                title='Understand Your Weaknesses'
                                body='Explore the writing patterns and weaknesses identified by the platform.'
                                delay={2}
                            />

                            <StepCard
                                icon={<GraduationCap aria-hidden='true' className='w-5 h-5' />}
                                iconBoxClass='bg-amber-50 border border-amber-100/80 text-amber-600'
                                stepTag='STEP 3'
                                stepTagClass='bg-amber-50 text-amber-600 border border-amber-100/80'
                                title='Learn and Practise'
                                body='Use personalized lessons and practice exercises to work on the areas that need improvement.'
                                delay={3}
                            />
                        </div>

                    </div>

                </section>

                {/* ═══════════════════════════════════════
                    SECTION 4 — WHO IS IT FOR
                ═══════════════════════════════════════ */}
                <section
                    id='who-is-it-for'
                    aria-labelledby='who-is-it-for-heading'
                    className='relative overflow-hidden bg-gradient-to-b from-white via-slate-50/70 to-slate-50 px-2 sm:px-4 lg:px-6 py-20 sm:py-24 lg:py-28'>

                    <div className='w-full max-w-[1440px] mx-auto space-y-10 sm:space-y-12'>

                        {/* Heading */}
                        <div className='reveal text-center space-y-3.5 max-w-3xl mx-auto'>
                            <span className='inline-flex items-center px-3.5 py-1 rounded-full bg-indigo-50 border border-indigo-100/80 text-brand-500 text-xs font-bold tracking-wider uppercase'>
                                Who Is SabiWrite AI For?
                            </span>
                            <h2
                                id='who-is-it-for-heading'
                                className='text-3xl sm:text-4xl lg:text-[2.65rem] font-extrabold text-slate-900 tracking-tight leading-[1.15]'>
                                Better Writing for <span className='text-brand-500'>Everyday Life</span>
                            </h2>
                            <p className='text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed'>
                                Whether you're studying, building your career, or communicating at work, clearer writing can help you express your ideas with confidence.
                            </p>
                        </div>

                        {/* Carousel Component */}
                        <div className='reveal'>
                            <WhoIsItForCarousel />
                        </div>

                    </div>

                </section>

                <section
                    id='faq'
                    aria-labelledby='faq-heading'
                    className='bg-slate-50 px-4 py-20 sm:px-12 sm:py-24 lg:py-28'>
                    <div className='w-full max-w-3xl mx-auto space-y-12 sm:space-y-14'>
                        <div className='reveal text-center space-y-3'>
                            <h2
                                id='faq-heading'
                                className='text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight'>
                                <span className='text-brand-500'>Frequently</span> Asked Questions
                            </h2>
                            <p className='mx-auto max-w-xl text-base leading-relaxed text-slate-600'>
                                Everything you need to know about feedback, practice, and improving your writing with SabiWrite AI.
                            </p>
                        </div>

                        <div className='reveal faq-list overflow-hidden divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white shadow-[0_18px_50px_-38px_rgba(15,23,42,0.35)]'>
                            {faqs.map(({question, answer}, index) => {
                                const isOpen = openFaq === index;

                                return (
                                    <div
                                        key={question}
                                        style={{'--faq-item-delay': `${Math.min(index, 5) * 0.08}s`}}
                                        className={`faq-item transition-colors duration-300 ${isOpen ? 'bg-brand-50/70' : 'hover:bg-brand-50/40'}`}>
                                        <h3>
                                            <button
                                                type='button'
                                                id={`faq-question-${index}`}
                                                aria-expanded={isOpen}
                                                aria-controls={`faq-answer-${index}`}
                                                onClick={() => setOpenFaq((current) => current === index ? null : index)}
                                                className={`group flex w-full min-h-16 cursor-pointer items-center justify-between gap-4 px-5 py-5 text-left text-sm sm:px-6 sm:text-base font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-500 ${isOpen ? 'text-brand-700' : 'text-slate-800 hover:text-brand-600'}`}>
                                                <span>{question}</span>
                                                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors duration-300 ${isOpen ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-brand-100 group-hover:text-brand-600'}`}>
                                                    <ChevronDown aria-hidden='true' className={`h-4 w-4 transition-transform duration-300 motion-reduce:transition-none ${isOpen ? 'rotate-180' : ''}`} />
                                                </span>
                                            </button>
                                        </h3>
                                        <div
                                            id={`faq-answer-${index}`}
                                            role='region'
                                            aria-labelledby={`faq-question-${index}`}
                                            aria-hidden={!isOpen}
                                            inert={!isOpen}
                                            data-open={isOpen}
                                            className='faq-answer'>
                                            <div className='min-h-0 overflow-hidden'>
                                                <div className='whitespace-pre-line px-5 pb-6 pr-14 text-sm leading-relaxed text-slate-600 sm:px-6 sm:pr-16 sm:text-base'>
                                                    {answer}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                    </div>
                </section>

                {/* ═══════════════════════════════════════
                    SECTION 5 — CALL TO ACTION / READY TO IMPROVE
                ═══════════════════════════════════════ */}
                <section
                    id='cta'
                    aria-labelledby='cta-heading'
                    className='relative w-full overflow-hidden bg-gradient-to-b from-[#f8faff] via-[#f3f5ff] to-[#edf1fe] border-t border-slate-200/80 py-20 sm:py-28 lg:py-32 px-4 sm:px-6 lg:px-8'>

                    {/* Decorative concentric background arcs spanning the full section width */}
                    <div
                        aria-hidden='true'
                        className='absolute -bottom-28 -left-20 sm:-bottom-32 sm:-left-16 w-80 h-80 sm:w-[420px] sm:h-[420px] lg:w-[520px] lg:h-[520px] rounded-full border-[36px] sm:border-[48px] lg:border-[58px] border-brand-500/[0.08] pointer-events-none'
                    />
                    <div
                        aria-hidden='true'
                        className='absolute -bottom-28 -right-20 sm:-bottom-32 sm:-right-16 w-80 h-80 sm:w-[420px] sm:h-[420px] lg:w-[520px] lg:h-[520px] rounded-full border-[36px] sm:border-[48px] lg:border-[58px] border-brand-500/[0.08] pointer-events-none'
                    />

                    <div className='reveal relative z-10 max-w-3xl mx-auto text-center flex flex-col items-center'>
                        <span className='inline-flex items-center px-4 py-1.5 rounded-full bg-brand-50/90 border border-brand-100 text-brand-600 text-xs sm:text-[13px] font-bold tracking-wider uppercase mb-5 sm:mb-6 shadow-sm'>
                            READY TO IMPROVE?
                        </span>

                        <h2
                            id='cta-heading'
                            className='text-3xl sm:text-4xl lg:text-[2.75rem] font-black sm:font-extrabold text-slate-900 tracking-tight leading-[1.15] mb-4 sm:mb-5'>
                            Your Next Sentence Can Be Better.
                        </h2>

                        <p className='text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed mb-8 sm:mb-9'>
                            Understand your mistakes, practise what you learn, and take the next step towards stronger English writing with SabiWrite AI.
                        </p>

                        <Link
                            to='/login'
                            aria-label='Start improving with SabiWrite AI'
                            className='inline-flex items-center justify-center gap-2 px-7 py-3.5 sm:px-8 sm:py-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm sm:text-base shadow-lg shadow-brand-500/25 hover:shadow-xl hover:shadow-brand-500/35 transition-all duration-200 hover:scale-[1.03] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-500'>
                            Start Improving
                            <ArrowRight aria-hidden='true' className='w-4 h-4' />
                        </Link>
                    </div>
                </section>

                <footer
                    role='contentinfo'
                    className='border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-400'>
                    © {new Date().getFullYear()} SabiWrite AI. All rights reserved.
                </footer>

            </main>
        </>
    );
}

function ValueProp({icon, iconBoxClass, badge, badgeClass, title, body, preview, delay}) {
    const delayClass = {
        1: 'reveal-delay-1',
        2: 'reveal-delay-2',
        3: 'reveal-delay-3',
        4: 'reveal-delay-4',
    }[delay] ?? '';

    return (
        <div className={`reveal ${delayClass} hover-lift flex flex-col justify-between h-full rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 lg:p-9 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.06)] hover:shadow-[0_20px_40px_-15px_rgba(91,91,247,0.14)] transition-all duration-300`}>
            <div>
                <div className='flex items-center justify-between gap-3'>
                    <div className={`w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-2xl flex items-center justify-center ${iconBoxClass}`}>
                        {icon}
                    </div>
                    {badge && (
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase ${badgeClass}`}>
                            {badge}
                        </span>
                    )}
                </div>
                <h3 className='font-bold text-slate-900 text-xl sm:text-2xl leading-snug tracking-tight mt-5'>
                    {title}
                </h3>
                <p className='mt-2.5 text-sm sm:text-base text-slate-600 leading-relaxed'>
                    {body}
                </p>
            </div>
            {preview && (
                <div className='mt-6 pt-1'>
                    {preview}
                </div>
            )}
        </div>
    );
}

function StepCard({icon, iconBoxClass, stepTag, stepTagClass, title, body, delay}) {
    const delayClass = {
        1: 'reveal-delay-1',
        2: 'reveal-delay-2',
        3: 'reveal-delay-3',
    }[delay] ?? '';

    return (
        <div className={`reveal ${delayClass} hover-lift flex-1 flex flex-col h-full rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.06)]`}>
            <div className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center ${iconBoxClass}`}>
                {icon}
            </div>
            <div className='mt-5'>
                <span className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold tracking-wider uppercase ${stepTagClass}`}>
                    {stepTag}
                </span>
            </div>
            <h3 className='font-bold text-slate-900 text-lg sm:text-[1.125rem] leading-snug tracking-tight mt-3'>
                {title}
            </h3>
            <p className='mt-2 text-sm sm:text-[14.5px] text-slate-500 leading-relaxed'>
                {body}
            </p>
        </div>
    );
}
