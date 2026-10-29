/** @format */

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, Quote } from 'lucide-react';

const PERSONAS = [
    {
        id: 'students-and-learners',
        category: 'Students and Learners',
        title: 'Students and Learners',
        quote: 'Write clearer assignments and essays while learning from your mistakes.',
        tag: 'Academic Writing',
        subTag: 'Assignments • Essays • Research',
        image: '/images/who-is-it-for/students-and-learners.webp',
        alt: 'Students collaborating on assignments and essays around a laptop',
    },
    {
        id: 'job-seekers',
        category: 'Job Seekers and Early-Career Professionals',
        title: 'Job Seekers and Early-Career Professionals',
        quote: 'Improve the clarity of CV content, cover letters, and professional emails.',
        tag: 'Career Growth',
        subTag: 'CVs • Cover Letters • Outreach',
        image: '/images/who-is-it-for/job-seekers-and-early-career-professionals.webp',
        alt: 'Job seeker reviewing CV and application materials',
    },
    {
        id: 'working-professionals',
        category: 'Working Professionals',
        title: 'Working Professionals',
        quote: 'Communicate more clearly in reports, emails, and business documents.',
        tag: 'Workplace Impact',
        subTag: 'Reports • Business Documents • Alignment',
        image: '/images/who-is-it-for/working-professionals.webp',
        alt: 'Working professional reviewing business documents at a laptop',
    },
    {
        id: 'writers-and-creators',
        category: 'Writers and Creators',
        title: 'Writers and Creators',
        quote: 'Refine articles and everyday written content before sharing them.',
        tag: 'Creative Flow',
        subTag: 'Articles • Newsletters • Social Copy',
        image: '/images/who-is-it-for/writers-and-creators.webp',
        alt: 'Creative writer working on articles with camera and microphone setup',
    },
    {
        id: 'everyday-communicators',
        category: 'Everyday Communicators',
        title: 'Everyday Communicators',
        quote: 'Write clearer messages and chat more confidently in English while learning from your mistakes.',
        tag: 'Everyday Confidence',
        subTag: 'Chats • Social Posts • Daily Messages',
        image: '/images/who-is-it-for/everyday-communicators.webp',
        alt: 'Person typing messages comfortably on a mobile phone',
    },
];

export function WhoIsItForCarousel() {
    const [activeIndex, setActiveIndex] = useState(0);
    const [prevIndex, setPrevIndex] = useState(null);
    const [direction, setDirection] = useState('next'); // 'next' (right-to-left) or 'prev' (left-to-right)
    const [isTransitioning, setIsTransitioning] = useState(false);
    const transitionTimer = useRef(null);
    const touchStartX = useRef(null);
    const touchEndX = useRef(null);
    const total = PERSONAS.length;

    const goTo = useCallback(
        (targetIndex, forcedDirection = null) => {
            const next = (targetIndex + total) % total;
            if (next === activeIndex) return;

            // Determine shortest transition direction if not explicitly given
            let dir = forcedDirection;
            if (!dir) {
                const diff = (next - activeIndex + total) % total;
                dir = diff <= total / 2 ? 'next' : 'prev';
            }

            setPrevIndex(activeIndex);
            setDirection(dir);
            setIsTransitioning(true);
            setActiveIndex(next);

            if (transitionTimer.current) clearTimeout(transitionTimer.current);
            transitionTimer.current = setTimeout(() => {
                setIsTransitioning(false);
            }, 640);
        },
        [activeIndex, total]
    );

    const prevSlide = useCallback(() => goTo(activeIndex - 1, 'prev'), [goTo, activeIndex]);
    const nextSlide = useCallback(() => goTo(activeIndex + 1, 'next'), [goTo, activeIndex]);

    // Autoplay timer — runs every 4 seconds consistently on all devices
    useEffect(() => {
        const timer = setInterval(() => {
            goTo(activeIndex + 1, 'next');
        }, 4000);
        return () => clearInterval(timer);
    }, [activeIndex, goTo]);

    // Clean up timer on unmount
    useEffect(() => {
        return () => {
            if (transitionTimer.current) clearTimeout(transitionTimer.current);
        };
    }, []);

    // Touch swipe handling
    const handleTouchStart = (e) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchMove = (e) => {
        touchEndX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = () => {
        if (touchStartX.current === null || touchEndX.current === null) return;
        const diff = touchStartX.current - touchEndX.current;
        if (Math.abs(diff) > 40) {
            if (diff > 0) {
                nextSlide();
            } else {
                prevSlide();
            }
        }
        touchStartX.current = null;
        touchEndX.current = null;
    };

    // Keyboard controls
    const handleKeyDown = (e) => {
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            prevSlide();
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            nextSlide();
        }
    };

    // Personas for flanking capsule pills
    const outerLeftIndex = (activeIndex - 2 + total) % total;
    const innerLeftIndex = (activeIndex - 1 + total) % total;
    const innerRightIndex = (activeIndex + 1) % total;
    const outerRightIndex = (activeIndex + 2 + total) % total;

    const activeItem = PERSONAS[activeIndex];
    const prevItem = prevIndex !== null ? PERSONAS[prevIndex] : null;
    const innerLeftItem = PERSONAS[innerLeftIndex];
    const outerLeftItem = PERSONAS[outerLeftIndex];
    const innerRightItem = PERSONAS[innerRightIndex];
    const outerRightItem = PERSONAS[outerRightIndex];

    return (
        <div
            className='relative w-full'
            tabIndex={0}
            onKeyDown={handleKeyDown}
            aria-roledescription='carousel'
            aria-label='Who SabiWrite is for'>
            {/* Carousel Stage: completely frames center card + flanking thumbnails with no cutoff */}
            <div
                className='relative w-full max-w-[1400px] mx-auto px-1 sm:px-2 lg:px-4 py-4 sm:py-8 flex items-center justify-center min-h-[460px] sm:min-h-[500px] lg:min-h-[520px] select-none'
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}>
                {/* Midline Horizontal Connector Wire */}
                <div
                    aria-hidden='true'
                    className='hidden md:block absolute top-1/2 left-4 right-4 h-[1.5px] bg-slate-200/80 -translate-y-1/2 z-0 pointer-events-none'
                />

                <div className='relative z-10 w-full flex items-center justify-center gap-2 sm:gap-2.5 lg:gap-3.5 xl:gap-4'>
                    {/* ──────────────── Left Pill 2 (Outer Left) ──────────────── */}
                    {/* Visible on landscape tablet and desktop (lg+) so 2 thumbnails show per side */}
                    <button
                        type='button'
                        onClick={() => goTo(outerLeftIndex, 'prev')}
                        aria-label={`Go to ${outerLeftItem.title}`}
                        className='hidden lg:flex flex-col items-center justify-center flex-shrink-0 w-[40px] lg:w-[44px] xl:w-[48px] 2xl:w-[52px] h-[250px] lg:h-[275px] xl:h-[305px] rounded-full overflow-hidden border-2 border-white shadow-md ring-1 ring-slate-200/60 opacity-60 hover:opacity-100 hover:scale-105 hover:shadow-xl transition-all duration-300 ease-out cursor-pointer group bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500'>
                        <img
                            src={outerLeftItem.image}
                            alt={outerLeftItem.title}
                            className='w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-500'
                            loading='lazy'
                            decoding='async'
                        />
                    </button>

                    {/* ──────────────── Left Pill 1 (Inner Left) ──────────────── */}
                    {/* 1 thumbnail per side on portrait tablet (md), 2 on landscape tablet & desktop (lg+) */}
                    <button
                        type='button'
                        onClick={() => goTo(innerLeftIndex, 'prev')}
                        aria-label={`Go to ${innerLeftItem.title}`}
                        className='hidden md:flex flex-col items-center justify-center flex-shrink-0 w-[48px] md:w-[52px] lg:w-[58px] xl:w-[68px] h-[310px] md:h-[340px] lg:h-[385px] xl:h-[425px] rounded-full overflow-hidden border-2 border-white shadow-xl ring-1 ring-slate-200/80 opacity-90 hover:opacity-100 hover:scale-105 hover:shadow-2xl hover:ring-brand-500/50 transition-all duration-300 ease-out cursor-pointer group bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500'>
                        <img
                            src={innerLeftItem.image}
                            alt={innerLeftItem.title}
                            className='w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-500'
                            loading='lazy'
                            decoding='async'
                        />
                    </button>

                    {/* ──────────────── Active Center Card ──────────────── */}
                    {/* Balanced width: perfectly framed with 1 thumbnail on portrait tablet, and 2 thumbnails on landscape tablet */}
                    <div className='w-full max-w-sm sm:max-w-md md:max-w-xl lg:max-w-[690px] xl:max-w-[840px] 2xl:max-w-[920px] bg-white rounded-3xl sm:rounded-[32px] shadow-2xl shadow-slate-200/80 border border-slate-100/90 overflow-hidden z-20 flex-shrink-0 transition-shadow duration-300'>
                        {/* 2-column layout: text on left, wide landscape image on right */}
                        <div className='flex flex-col md:flex-row items-stretch min-h-[420px] md:min-h-[440px] lg:min-h-[460px]'>
                            {/* Left Text Column (~38% - 40% width) */}
                            <div className='w-full md:w-[40%] lg:w-[38%] p-5 sm:p-7 lg:p-9 flex flex-col justify-between space-y-5 sm:space-y-6 flex-shrink-0'>
                                <div
                                    key={`text-${activeItem.id}`}
                                    className={`space-y-3.5 ${
                                        isTransitioning
                                            ? direction === 'next'
                                                ? 'carousel-text-next'
                                                : 'carousel-text-prev'
                                            : ''
                                    }`}>
                                    {/* Persona category badge */}
                                    <div className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100/80 text-brand-500 text-xs font-semibold'>
                                        <Sparkles className='w-3.5 h-3.5 text-brand-500' />
                                        <span>{activeItem.tag}</span>
                                    </div>

                                    {/* Persona Headline */}
                                    <h3 className='text-xl sm:text-2xl lg:text-[1.95rem] font-extrabold text-slate-900 tracking-tight leading-[1.2]'>
                                        {activeItem.title}
                                    </h3>

                                    {/* Persona Quote */}
                                    <div className='relative pt-1'>
                                        <Quote
                                            aria-hidden='true'
                                            className='w-5 h-5 text-slate-300 mb-1 opacity-60'
                                        />
                                        <p className='text-slate-600 text-sm sm:text-base lg:text-[1.05rem] leading-relaxed font-normal'>
                                            {activeItem.quote}
                                        </p>
                                    </div>
                                </div>

                                {/* Bottom tags / persona details */}
                                <div className='pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2'>
                                    <span className='inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium'>
                                        {activeItem.category}
                                    </span>
                                    <span className='text-xs text-slate-600 font-medium'>
                                        {activeItem.subTag}
                                    </span>
                                </div>
                            </div>

                            {/* Right Image Column (~60% - 62% width for expansive landscape photo) */}
                            <div className='w-full md:w-[60%] lg:w-[62%] p-2.5 sm:p-3.5 lg:p-4 flex items-center justify-center bg-slate-50/40 md:bg-transparent'>
                                <div className='w-full h-52 sm:h-64 md:h-full min-h-[220px] sm:min-h-[280px] md:min-h-[360px] lg:min-h-[400px] rounded-2xl lg:rounded-[24px] overflow-hidden relative shadow-inner bg-slate-900/5'>
                                    {/* Outgoing Image: visibly slides out in direction of movement */}
                                    {isTransitioning && prevItem && (
                                        <img
                                            src={prevItem.image}
                                            alt={prevItem.alt}
                                            className={`absolute inset-0 w-full h-full object-cover object-center pointer-events-none z-0 ${
                                                direction === 'next'
                                                    ? 'carousel-slide-out-left'
                                                    : 'carousel-slide-out-right'
                                            }`}
                                            decoding='async'
                                        />
                                    )}

                                    {/* Incoming / Active Image: visibly slides in from opposite side */}
                                    <img
                                        key={`${activeItem.id}-${direction}`}
                                        src={activeItem.image}
                                        alt={activeItem.alt}
                                        className={`w-full h-full object-cover object-center relative z-10 transition-transform duration-700 ease-out hover:scale-105 ${
                                            isTransitioning
                                                ? direction === 'next'
                                                    ? 'carousel-slide-in-right'
                                                    : 'carousel-slide-in-left'
                                                : ''
                                        }`}
                                        loading='eager'
                                        decoding='async'
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ──────────────── Right Pill 1 (Inner Right) ──────────────── */}
                    {/* 1 thumbnail per side on portrait tablet (md), 2 on landscape tablet & desktop (lg+) */}
                    <button
                        type='button'
                        onClick={() => goTo(innerRightIndex, 'next')}
                        aria-label={`Go to ${innerRightItem.title}`}
                        className='hidden md:flex flex-col items-center justify-center flex-shrink-0 w-[48px] md:w-[52px] lg:w-[58px] xl:w-[68px] h-[310px] md:h-[340px] lg:h-[385px] xl:h-[425px] rounded-full overflow-hidden border-2 border-white shadow-xl ring-1 ring-slate-200/80 opacity-90 hover:opacity-100 hover:scale-105 hover:shadow-2xl hover:ring-brand-500/50 transition-all duration-300 ease-out cursor-pointer group bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500'>
                        <img
                            src={innerRightItem.image}
                            alt={innerRightItem.title}
                            className='w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-500'
                            loading='lazy'
                            decoding='async'
                        />
                    </button>

                    {/* ──────────────── Right Pill 2 (Outer Right) ──────────────── */}
                    {/* Visible on landscape tablet and desktop (lg+) so 2 thumbnails show per side */}
                    <button
                        type='button'
                        onClick={() => goTo(outerRightIndex, 'next')}
                        aria-label={`Go to ${outerRightItem.title}`}
                        className='hidden lg:flex flex-col items-center justify-center flex-shrink-0 w-[40px] lg:w-[44px] xl:w-[48px] 2xl:w-[52px] h-[250px] lg:h-[275px] xl:h-[305px] rounded-full overflow-hidden border-2 border-white shadow-md ring-1 ring-slate-200/60 opacity-60 hover:opacity-100 hover:scale-105 hover:shadow-xl transition-all duration-300 ease-out cursor-pointer group bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500'>
                        <img
                            src={outerRightItem.image}
                            alt={outerRightItem.title}
                            className='w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-500'
                            loading='lazy'
                            decoding='async'
                        />
                    </button>
                </div>
            </div>

            {/* Bottom Controls & Sliding Indicator */}
            <div className='flex items-center justify-center gap-4 sm:gap-6 mt-4 sm:mt-6 pb-2'>
                {/* Previous Button */}
                <button
                    type='button'
                    onClick={prevSlide}
                    aria-label='Previous slide'
                    className='w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white border border-slate-200 shadow-sm hover:bg-slate-50 hover:border-slate-300 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 active:scale-95'>
                    <ChevronLeft className='w-5 h-5' />
                </button>

                {/* Sliding Pill Pagination Track */}
                <div
                    role='tablist'
                    aria-label='Carousel slides'
                    className='flex items-center gap-2 p-1.5 bg-slate-100/90 rounded-full border border-slate-200/60 shadow-inner'>
                    {PERSONAS.map((item, idx) => {
                        const isActive = idx === activeIndex;
                        return (
                            <button
                                key={item.id}
                                role='tab'
                                aria-selected={isActive}
                                aria-label={`Slide ${idx + 1}: ${item.title}`}
                                onClick={() => goTo(idx)}
                                className={`h-2 rounded-full transition-all duration-400 ease-out focus:outline-none ${
                                    isActive
                                        ? 'w-8 sm:w-10 bg-brand-500 shadow-sm shadow-brand-500/40'
                                        : 'w-2 bg-slate-300 hover:bg-slate-400'
                                }`}
                            />
                        );
                    })}
                </div>

                {/* Next Button */}
                <button
                    type='button'
                    onClick={nextSlide}
                    aria-label='Next slide'
                    className='w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white border border-slate-200 shadow-sm hover:bg-slate-50 hover:border-slate-300 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 active:scale-95'>
                    <ChevronRight className='w-5 h-5' />
                </button>
            </div>
        </div>
    );
}
