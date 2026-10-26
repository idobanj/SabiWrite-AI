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
    ChevronDown,
} from 'lucide-react';
import {LandingDemo} from '../components/LandingDemo';
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

            <main ref={pageRef} className='landing-page bg-slate-50 text-slate-800'>

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

                        {/* The badge leads into the headline reveal. */}
                        <div className='hero-motion hero-badge mb-6 sm:mb-8 flex justify-center'>
                            <span className='inline-flex flex-nowrap items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 text-xs sm:text-sm font-semibold leading-none tracking-wide whitespace-nowrap shadow-sm'>
                                <span className='w-4 h-4 shrink-0 rounded-full bg-brand-500 text-white inline-flex items-center justify-center'>
                                    <Sparkles className='w-3 h-3' aria-hidden='true' />
                                </span>
                                <span>AI-POWERED WRITING COACH</span>
                            </span>
                        </div>

                        {/* Each complete line rises through its own stationary mask. */}
                        <h1
                            id='hero-heading'
                            className='text-4xl sm:text-6xl lg:text-[4.5rem] xl:text-[5.2rem] font-extrabold text-slate-900 tracking-tight leading-[1.08] max-w-5xl mx-auto'>
                            <span className='hero-line-mask'>
                                <span className='hero-motion hero-headline-line hero-headline-first'>
                                    Don't just correct your
                                </span>
                            </span>
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

                        {/* Dashboard Preview Image (responsive: phone mockup on mobile, window mockup on tablet/desktop) */}
                        <div className='hero-motion hero-dashboard w-full max-w-7xl mx-auto mt-10 sm:mt-16 px-2 sm:px-6 relative'>
                            {/* Mobile Phone Mockup (visible on mobile only) */}
                            <div className='block sm:hidden w-full max-w-[340px] mx-auto'>
                                <img
                                    src='/SabiWritePhone-1.png'
                                    alt='SabiWrite AI Mobile Progress Dashboard'
                                    className='w-full h-auto block drop-shadow-2xl select-none pointer-events-none'
                                    width='2852'
                                    height='1487'
                                    loading='eager'
                                />
                            </div>

                            {/* Desktop Dashboard Mockup (visible on tablet and desktop) */}
                            <div className='hero-preview-shadow hidden sm:block'>
                                <div className='hero-preview-fade rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white overflow-hidden'>
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

                            <HeroCorrectionExample />
                        </div>

                    </div>
                </section>

                <LandingDemo />

                {/* ═══════════════════════════════════════
                    SECTION 3 — FEATURES / VALUE PROPS
                ═══════════════════════════════════════ */}
                <section
                    id='features'
                    aria-labelledby='features-heading'
                    className='relative overflow-hidden bg-white px-4 py-20 sm:px-12 sm:py-24 lg:py-28'>

                    <div className='w-full max-w-7xl mx-auto space-y-10 sm:space-y-11'>

                        {/* Heading */}
                        <div className='reveal text-center space-y-3'>
                            <span className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 border border-brand-100 text-brand-600 text-xs font-semibold tracking-wide'>
                                Why SabiWrite AI
                            </span>
                            <h2
                                id='features-heading'
                                className='text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight'>
                                Built to Make You <span className='text-brand-500'>Actually Improve</span>
                            </h2>
                            <p className='text-[16px] text-slate-600 max-w-xl mx-auto'>
                                Four pillars that separate a real coach from a spell-checker.
                            </p>
                        </div>

                        {/* Cards grid */}
                        <article className='grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4'>
                            <ValueProp
                                icon={<PenTool aria-hidden='true' className='w-5 h-5' />}
                                title="Teacher's Desk"
                                body='Rather than silently correcting, the platform breaks down each correction in simple, understandable, localized mechanics.'
                                delay={1}
                            />
                            <ValueProp
                                icon={<BarChart2 aria-hidden='true' className='w-5 h-5' />}
                                title='Weakness Profiler'
                                body='We record patterns in your typing errors to isolate exactly where your logical understanding is failing.'
                                delay={2}
                            />
                            <ValueProp
                                icon={<GraduationCap aria-hidden='true' className='w-5 h-5' />}
                                title='Interactive Micro-Lessons'
                                body='Instantly convert detected weaknesses into specialized modules with quizzes to practice what you got wrong.'
                                delay={3}
                            />
                            <ValueProp
                                icon={<Award aria-hidden='true' className='w-5 h-5' />}
                                title='Competition Ready'
                                body='Built using advanced Gemini API reasoning for robust processing and customized EdTech execution workflows.'
                                delay={4}
                            />
                        </article>


                    </div>

                </section>

                <section
                    id='faq'
                    aria-labelledby='faq-heading'
                    className='bg-slate-50 px-4 py-20 sm:px-12 sm:py-24 lg:py-28'>
                    <div className='w-full max-w-3xl mx-auto space-y-12 sm:space-y-14'>
                        <div className='reveal text-center space-y-3'>
                            <span className='inline-flex items-center px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-500 text-xs font-semibold tracking-wide'>
                                FAQ
                            </span>
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

                <footer
                    role='contentinfo'
                    className='border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-400'>
                    © {new Date().getFullYear()} SabiWrite AI. All rights reserved.
                </footer>

            </main>
        </>
    );
}

/** Play the illustrative correction after each scroll entrance. */
function HeroCorrectionExample() {
    const exampleRef = useRef(null);

    useEffect(() => {
        const example = exampleRef.current;
        if (!example) return;
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

        const dashboard = example.closest('.hero-dashboard');
        if (!dashboard) return;
        const entrance = dashboard.getAnimations().find((animation) => animation.animationName === 'heroDashboardEnter');
        let dashboardReady = entrance ? entrance.playState === 'finished' : dashboard.classList.contains('is-visible');
        let inView = false;
        let played = false;

        const play = () => {
            if (reducedMotion.matches || !dashboardReady || !inView || played) return;
            played = true;
            example.classList.add('is-active');
        };

        const reset = () => {
            played = false;
            dashboardReady = false;
            example.classList.remove('is-active');
        };

        const onEntranceEnd = (event) => {
            if (event.target === dashboard && event.animationName === 'heroDashboardEnter') {
                dashboardReady = true;
                play();
            }
        };

        const observer = new IntersectionObserver((entries) => {
            inView = entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.65);
            play();
        }, {threshold: 0.65});

        dashboard.addEventListener('animationend', onEntranceEnd);
        dashboard.addEventListener('landing:motion-reset', reset);
        reducedMotion.addEventListener('change', reset);
        observer.observe(example);
        return () => {
            observer.disconnect();
            dashboard.removeEventListener('animationend', onEntranceEnd);
            dashboard.removeEventListener('landing:motion-reset', reset);
            reducedMotion.removeEventListener('change', reset);
        };
    }, []);

    return (
        <div ref={exampleRef} className='hero-correction-example' aria-hidden='true'>
            <div className='hero-example-label'>
                <Sparkles className='w-3.5 h-3.5' />
                <span>Coaching example</span>
            </div>
            <p className='hero-example-sentence'>
                They{' '}
                <span className='hero-example-word'>
                    <span className='hero-example-wrong'>has</span>
                    <span className='hero-example-correct'>have</span>
                </span>{' '}
                finished the report.
            </p>
            <p className='hero-example-explanation'>
                Use “have” with “they”.
            </p>
        </div>
    );
}

function ValueProp({icon, title, body, delay}) {
    const delayClass = {
        1: 'reveal-delay-1',
        2: 'reveal-delay-2',
        3: 'reveal-delay-3',
        4: 'reveal-delay-4',
    }[delay] ?? '';

    return (
        <div className={`reveal ${delayClass} hover-lift h-full rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_12px_35px_-28px_rgba(15,23,42,0.32)] sm:p-6`}>
            <div className='flex items-center gap-3'>
                <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-100 bg-brand-50 text-brand-600'>
                    {icon}
                </div>
                <h3 className='font-semibold text-slate-900 text-[15px] leading-snug'>{title}</h3>
            </div>
            <p className='mt-4 text-sm text-slate-600 leading-relaxed'>{body}</p>
        </div>
    );
}
