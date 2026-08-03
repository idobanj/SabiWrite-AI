/** @format */

import {Helmet} from 'react-helmet-async';
import {Link} from 'react-router-dom';
import {useState} from 'react';
import {
    PenTool,
    BarChart2,
    GraduationCap,
    Award,
    Sparkles,
    ArrowRight,
    Info,
} from 'lucide-react';
import {Button} from '../components/Button';
import {useToast} from '../components/Toast';
import {useTheme} from '../hooks/useTheme';
import {Menu, Moon, Sun} from 'lucide-react';

const templates = {
    pitch: 'Dear hiring team, I am writing to propose my services. The team of developers does tried to fix the API modules, but they has failed continuously. We need to implement a clean architecture as soon as possible. I am looking forward to see you.',
    chat: 'Hi sir! I am happy to tell you that the project details is ready. Everybody in our group are working to ensure we submit early. Let me know when you has time to check.',
    essay: 'The economic situation in Nigeria are challenging. Many youth struggles to get remote jobs due to this gap. I strongly believes that digital education provide a viable escape route.',
};

/**
 * Landing page. The interactive demo is visual only — submitting it
 * routes the user through the auth flow.
 */
export function LandingPage() {
    const [draft, setDraft] = useState('');
    const {show} = useToast();
    const {theme, toggle} = useTheme();

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

                <link
                    rel='canonical'
                    href='https://ai-writing-coach-seven.vercel.app/'
                />

                {/* ======================OpenGraph=================== */}

                <meta property='og:type' content='website' />

                <meta
                    property='og:url'
                    content='https://ai-writing-coach-seven.vercel.app/'
                />

                <meta
                    property='og:title'
                    content='SabiWrite AI — Your AI English Writing Coach'
                />

                <meta
                    property='og:description'
                    content='Improve your English writing with personalized AI coaching that learns from your recurring mistakes.'
                />

                {/* TODO:
        Replace this image after creating one.

        Put the image inside:

        public/
            og-image.png
    */}

                <meta
                    property='og:image'
                    content='https://ai-writing-coach-seven.vercel.app/og-image.png'
                />

                <meta property='og:site_name' content='SabiWrite AI' />

                {/* ===========================================================
        Twitter
    ============================================================ */}

                <meta name='twitter:card' content='summary_large_image' />

                <meta name='twitter:title' content='SabiWrite AI' />

                <meta
                    name='twitter:description'
                    content='Your AI English Writing Coach.'
                />

                <meta
                    name='twitter:image'
                    content='https://ai-writing-coach-seven.vercel.app/og-image.png'
                />

                {/* ===========================================================
        JSON-LD
    ============================================================ */}

                <script type='application/ld+json'>
                    {JSON.stringify({
                        '@context': 'https://schema.org',
                        '@graph': [
                            {
                                '@type': 'SoftwareApplication',
                                name: 'SabiWrite AI',
                                applicationCategory: 'EducationalApplication',
                                operatingSystem: 'Web',
                                url: 'https://ai-writing-coach-seven.vercel.app/',
                                description:
                                    'An AI-powered English writing coach that helps users improve by identifying recurring mistakes and generating personalized lessons.',
                                offers: {
                                    '@type': 'Offer',
                                    price: '0',
                                    priceCurrency: 'USD',
                                },
                            },

                            {
                                '@type': 'WebSite',
                                name: 'SabiWrite AI',
                                url: 'https://ai-writing-coach-seven.vercel.app/',
                            },

                            {
                                '@type': 'Organization',
                                name: 'SabiWrite AI',
                                url: 'https://ai-writing-coach-seven.vercel.app/',
                                logo: 'https://ai-writing-coach-seven.vercel.app/logo.png',
                            },
                        ],
                    })}
                </script>
            </Helmet>

            <main>
                <section id="hero" aria-label="hero-heading" className='px-2 sm:px-12 max-w-7xl mx-auto my-auto pt-20 pb-10 space-y-5'>
                    {/* Hero */}

                    <div className='grid lg:grid-cols-12 items-center pb-16'>
                        <div className='lg:col-span-7 space-y-7 lg:px-0'>
                            <h1 id="hero-heading" className='text-4xl sm:text-5xl lg:text-[3.9rem] font-bold text-slate-900 dark:text-white tracking-tight leading-[1.05] text-center lg:text-left '>
                                <div className='flex items-center gap-2 pl-3'>
                                    {/* <Button type='button'
                                        variant='secondary'
                                        size='sm'
                                        onClick={toggle}
                                        aria-label='Toggle theme'
                                        className='px-2'>
                                        {theme === 'dark' ? (
                                            <Sun className='w-4 h-4' />
                                        ) : (
                                            <Moon className='w-4 h-4' />
                                        )}
                                    </Button> */}
                                </div>
                                Your AI-Powered{' '}
                                <span className='text-brand-500'>
                                    <div className='hidden xl:block'></div>{' '}
                                    English Writing Coach
                                </span>
                            </h1>
                            <p id="hero-description" className='text-xl text-slate-600 dark:text-slate-300 leading-relaxed lg:pr-2  mt-0 text-center lg:text-left md:px-10 lg:px-0'>
                                Stop using software as a crutch. English Error
                                Coach doesn't just fix your typos—it acts as an
                                elite personal tutor, analyzing your weakness
                                and generating dynamic lessons to elevate your
                                communication
                            </p>
                            <div className='flex flex-col sm:flex-row justify-center lg:justify-start gap-3 pt-2 pb-12'>
                                <Link to='/login'
                                aria-label="Create a free Sabiwrite AI account">
                                    <Button type='button'
                                        className='w-full text-[17px]'
                                        size='lg'
                                        rightIcon={
                                            <ArrowRight aria-hidden="true" className='w-4 h-4' />
                                        }>
                                        Start Improving Now
                                    </Button>
                                </Link>
                                <a href='#demo'
                                aria-label="Learn more about Sabiwrite AI's">
                                    <Button
                                        className='border dark:border-gray-700 border-gray-200  text-gray-700 dark:text-gray-300 w-full text-[17px]'
                                        variant='ghost'
                                        size='lg'>
                                        Try the Interactive Demo ↓
                                    </Button>
                                </a>
                            </div>
                            {/* <p className="text-xs text-slate-400">
            Free while in beta. Sign in with email or Google.
          </p> */}
                        </div>

                        {/* Hero illustration card */}
                        <div className='lg:col-span-5 self-center lg:ml-6'>
                            <div className='bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden '>
                                <div className='flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700'>
                                    <div className='flex items-center gap-1.5 py-2.5'>
                                        <span className='w-2.5 h-2.5 rounded-full bg-red-600 ' />
                                        <span className='w-2.5 h-2.5 rounded-full bg-yellow-600 ' />
                                        <span className='w-2.5 h-2.5 rounded-full bg-green-500 ' />
                                    </div>
                                    <span className='text-[13px] font-medium text-slate-400'>
                                        Writting Analysis Mock
                                    </span>
                                </div>
                                <div className='p-5 space-y-3 py-7 px-5'>
                                    <div className='p-4 rounded-xl border border-red-200/60 dark:border-red-500/20 bg-red-50/40 dark:bg-red-500/5'>
                                        <p className='text-[12px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1.5 text-xs'>
                                            Your Draft
                                        </p>
                                        <p className='text-[sm] text-slate-600 dark:text-slate-300 leading-relaxed'>
                                            The company{' '}
                                            <span className='line-through text-error decoration-wavy'>
                                                does tried
                                            </span>{' '}
                                            to reach new clients but{' '}
                                            <span className='line-through text-error decoration-wavy'>
                                                they has
                                            </span>{' '}
                                            failed.
                                        </p>
                                    </div>
                                    <div className='p-4 rounded-xl border border-emerald-200/60 dark:border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-500/5'>
                                        <p className='text-[12px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1.5 text-xs'>
                                            Coach correction
                                        </p>
                                        <p className='text-[sm] text-slate-700 dark:text-slate-200 leading-relaxed'>
                                            The company{' '}
                                            <span className='text-emerald-600 dark:text-emerald-400 font-semibold underline decoration-2'>
                                                has tried
                                            </span>{' '}
                                            to reach new clients but{' '}
                                            <span className='text-emerald-600 dark:text-emerald-400 font-semibold underline decoration-2'>
                                                they have
                                            </span>{' '}
                                            failed.
                                        </p>
                                    </div>
                                    <div className='p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 flex items-start gap-2.5'>
                                        <div className='p-1 bg-brand-50 text-brand-500 rounded-md flex-shrink-0'>
                                            <Info    className='w-3.5 h-3.5' />
                                        </div>
                                        <div>
                                            <p className='text-xs font-semibold text-slate-900 dark:text-white'>
                                                Subject-verb agreement
                                            </p>
                                            <p className='text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5'>
                                                "They" is plural — it takes
                                                "have", not "has".
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className='w-full h-[0.08px] bg-slate-200 dark:bg-slate-700 my-20'></div>
                    {/* Interactive Demo */}
                    <div id='demo' className='space-y-8 pt-10 pb-16'>
                        <div className='max-w-xl mx-auto text-center'>
                            <h2 id='demo-heading' className='text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight'>
                                Try It Out Right Now
                            </h2>
                            <p className='mt-2 text-[15px] text-slate-500 dark:text-slate-400'>
                                Pick a sample draft to analyze, or type
                                something to see the live parsing workspace
                                logic in action.
                            </p>
                        </div>

                        <div className='flex flex-wrap gap-2 justify-center'>
                            <TemplateButton
                                onClick={() => handleTemplateClick('pitch')}>
                                A client proposal
                            </TemplateButton>
                            <TemplateButton
                                onClick={() => handleTemplateClick('chat')}>
                                A freelancer message
                            </TemplateButton>
                            <TemplateButton
                                onClick={() => handleTemplateClick('essay')}>
                                A scholarship essay
                            </TemplateButton>
                        </div>

                        <div className='bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5'>
                            <textarea
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                rows={5}
                                className='w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl p-4 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 resize-none'
                                placeholder='Type or paste your text here…'
                            />
                            <div className='flex items-center justify-between pt-3'>
                                <span className='text-xs text-slate-400'>
                                    {draft.trim()
                                        ? `${draft.trim().split(/\s+/).length} words`
                                        : 'Empty'}
                                </span>
                                <Button type='button'
                                    className='text-[15px]'
                                    onClick={handleCheckClick}
                                    leftIcon={
                                        <Sparkles aria-label='true' className='w-3.5 h-3.5' />
                                    }>
                                    Check in Writing Desk
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className='w-full h-[0.08px] bg-slate-200 dark:bg-slate-700 my-20'></div>

                    {/* Value props — written like a real product, not SaaS copy */}
                    <article className='grid sm:grid-cols-2 lg:grid-cols-4 gap-5 py-16'>
                        <ValueProp
                            icon={<PenTool aria-label='true' className='w-5 h-5' />}
                            tone='brand'
                            title="Teacher's Desk"
                            body='Rather than silently correcting, the platform breaks down each correction in simple, understandable, localized mechanics..'
                        />
                        <ValueProp
                            icon={<BarChart2 className='w-5 h-5' />}
                            tone='indigo'
                            title='Weakness Profiler'
                            body='We record patterns in your typing errors to isolate exactly where your logical understanding is failing..'
                        />
                        <ValueProp
                            icon={<GraduationCap  aria-label='true' className='w-5 h-5' />}
                            tone='emerald'
                            title='Interactive Micro-Lessons'
                            body='Instantly convert detected weaknesses into specialized modules with quizzes to practice what you got wrong.'
                        />
                        <ValueProp
                            icon={<Award aria-label='true' className='w-5 h-5' />}
                            tone='amber'
                            title='Competition Ready'
                            body='Built using advanced Gemini API reasoning for robust processing and customized EdTech execution workflows.'
                        />
                    </article>

                    <footer role="contentinfo" className='pt-12 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-400 flex flex-col items-center justify-between gap-2'>
                        <p>© {new Date().getFullYear()} SabiWrite AI.</p>
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
            className='px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-full transition-colors'>
            {children}
        </button>
    );
}

function ValueProp({icon, tone, title, body}) {
    const toneClass = {
        brand: 'bg-brand-50 text-brand-500 dark:bg-brand-500/10',
        indigo: 'bg-indigo-50 text-indigo-500 dark:bg-indigo-500/10',
        emerald: 'bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10',
        amber: 'bg-amber-50 text-amber-500 dark:bg-amber-500/10',
    }[tone];

    return (
        <div className='p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3'>
            <div className={`p-2.5 rounded-xl w-fit ${toneClass}`}>{icon}</div>
            <h3 className='font-semibold text-slate-900 dark:text-white text-[15px]'>
                {title}
            </h3>
            <p className='text-sm text-slate-500 dark:text-slate-400 leading-relaxed'>
                {body}
            </p>
        </div>
    );
}
