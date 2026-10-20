import {useEffect, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {ArrowRight, Check, ChevronDown, Lightbulb, PenLine, Sparkles} from 'lucide-react';
import {useAuth} from '../hooks/useAuth';
import {DEMO_SAMPLES} from '../lib/landingDemoSamples';
import {savePendingDraft} from '../lib/pendingDraft';
import './LandingDemo.css';

export function LandingDemo() {
    const [draft, setDraft] = useState(DEMO_SAMPLES[0].draft);
    const [result, setResult] = useState(null);
    const [practiceOpen, setPracticeOpen] = useState(false);
    const [answer, setAnswer] = useState(null);
    const [checked, setChecked] = useState(false);
    const [handoffError, setHandoffError] = useState('');
    const sectionRef = useRef(null);
    const editorRef = useRef(null);
    const feedbackRef = useRef(null);
    const {session} = useAuth();
    const navigate = useNavigate();
    const activeSample = DEMO_SAMPLES.find((sample) => sample.draft.trim() === draft.trim());
    const words = draft.trim() ? draft.trim().split(/\s+/).length : 0;

    useEffect(() => {
        const visitDemo = () => {
            if (window.location.hash === '#demo') {
                sectionRef.current?.scrollIntoView({
                    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
                    block: 'start',
                });
            }
        };
        const frame = requestAnimationFrame(visitDemo);
        window.addEventListener('hashchange', visitDemo);
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('hashchange', visitDemo);
        };
    }, []);

    const clearFeedback = () => {
        setResult(null);
        setPracticeOpen(false);
        setAnswer(null);
        setChecked(false);
        setHandoffError('');
    };

    const chooseSample = (sample) => {
        setDraft(sample.draft);
        clearFeedback();
    };

    const showFeedback = () => {
        if (!draft.trim()) return;
        if (!activeSample) {
            if (!savePendingDraft(draft)) {
                setHandoffError('Your browser could not keep this draft. Please copy it before opening your account.');
                return;
            }
            navigate(session ? '/app/workspace' : '/signup');
            return;
        }
        setResult(activeSample);
        setPracticeOpen(false);
        setAnswer(null);
        setChecked(false);
        if (window.matchMedia('(max-width: 899px)').matches) {
            requestAnimationFrame(() => feedbackRef.current?.scrollIntoView({
                behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
                block: 'start',
            }));
        }
    };

    const editDraft = () => {
        clearFeedback();
        requestAnimationFrame(() => editorRef.current?.focus({preventScroll: true}));
    };

    return (
        <section id='demo' ref={sectionRef} aria-labelledby='demo-heading' className='landing-demo'>
            <div className='demo-container'>
                <div className='demo-intro reveal'>
                    <span className='demo-eyebrow'><Sparkles size={14} aria-hidden='true' /> Live Playground</span>
                    <h2 id='demo-heading'>Try It Out Right Now</h2>
                    <p>Pick a sample draft or type your own. See how SabiWrite AI flags patterns and explains every correction.</p>
                </div>

                <div className='demo-workspace reveal'>
                    <div className='demo-toolbar'>
                        <span className='demo-toolbar-label'>Choose a sample</span>
                        <div className='demo-samples' role='group' aria-label='Choose a writing sample'>
                            {DEMO_SAMPLES.map((sample) => (
                                <button key={sample.id} type='button' aria-pressed={activeSample?.id === sample.id}
                                    className='demo-sample' onClick={() => chooseSample(sample)}>
                                    {activeSample?.id === sample.id && <Check size={14} aria-hidden='true' />}
                                    {sample.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className='demo-columns'>
                        <div className='demo-draft-pane'>
                            <div className='demo-pane-heading'>
                                <h3 id='demo-draft-label'><span className='demo-step' aria-hidden='true'>01</span> Your draft</h3>
                                {result ? (
                                    <button type='button' className='demo-edit' onClick={editDraft}><PenLine size={14} aria-hidden='true' /> Edit draft</button>
                                ) : <span className='demo-kind'>{activeSample ? 'Prepared example' : 'Your own writing'}</span>}
                            </div>
                            {result ? (
                                <div className='demo-annotated-draft reveal' role='region' aria-label='Your draft with highlighted mistakes'>
                                    <MarkedDraft text={result.draft} mistakes={result.mistakes} />
                                </div>
                            ) : (
                                <textarea ref={editorRef} id='demo-draft' aria-labelledby='demo-draft-label'
                                    aria-describedby='demo-draft-help' className='demo-editor' rows={7} maxLength={4000}
                                    spellCheck={false} value={draft} placeholder='Type or paste your writing here…'
                                    onChange={(event) => { setDraft(event.target.value); clearFeedback(); }} />
                            )}
                            <div className='demo-draft-actions'>
                                <span className='demo-word-count'>{words} {words === 1 ? 'word' : 'words'}</span>
                                <button type='button' className='demo-primary' onClick={showFeedback} disabled={!draft.trim() || !!result}>
                                    {result ? <><Check size={16} aria-hidden='true' /> Feedback shown</> :
                                        <>{activeSample ? 'Show sample feedback' : session ? 'Open in Writing Desk' : 'Continue with my draft'}<ArrowRight size={16} aria-hidden='true' /></>}
                                </button>
                            </div>
                            <p id='demo-draft-help' className='demo-help'>
                                {activeSample ? 'Explore these examples without an account, or edit the draft to try your own writing.' :
                                    session ? 'Continue in your Writing Desk to analyse this draft and save your progress.' :
                                        'Create an account to analyse your own writing. Your draft will stay in this browser tab while you sign in.'}
                            </p>
                            {handoffError && <p className='demo-handoff-error' role='alert'>{handoffError}</p>}
                        </div>

                        <div ref={feedbackRef} className='demo-feedback-pane' aria-labelledby='demo-feedback-heading'>
                            <div className='demo-pane-heading'>
                                <h3 id='demo-feedback-heading'><span className='demo-step' aria-hidden='true'>02</span> Your coach’s feedback</h3>
                            </div>
                            <p className='sr-only' role='status' aria-live='polite'>
                                {result ? `Sample feedback ready. ${result.mistakes.length} ${result.mistakes.length === 1 ? 'correction' : 'corrections'} explained below.` : ''}
                            </p>
                            {!result ? (
                                <div className='demo-feedback-placeholder'>
                                    <span className='demo-feedback-icon'><Lightbulb size={24} aria-hidden='true' /></span>
                                    <h4>A correction is just the beginning.</h4>
                                    <p>{activeSample ? 'Show the sample feedback to see what changed and learn why.' : 'Your Writing Desk explains your corrections and helps you spot recurring mistakes.'}</p>
                                    <div className='demo-learning-path' aria-label='Correct, understand, practise'>
                                        <span>Correct</span><ArrowRight size={13} aria-hidden='true' /><span>Understand</span><ArrowRight size={13} aria-hidden='true' /><span>Practise</span>
                                    </div>
                                </div>
                            ) : (
                                <div key={result.id} className='demo-feedback-content reveal'>
                                    <div className='demo-corrected-label'><Check size={14} aria-hidden='true' /> Corrected sample</div>
                                    <p className='demo-corrected-draft'><MarkedDraft text={result.corrected} mistakes={result.mistakes} corrected /></p>
                                    <div className='demo-explanations'>
                                        {result.mistakes.map((mistake) => (
                                            <div key={mistake.id} className='demo-explanation'>
                                                <h4><Lightbulb size={15} aria-hidden='true' /> {mistake.rule}</h4>
                                                <p>{mistake.explanation}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <button type='button' className='demo-practice-trigger' aria-expanded={practiceOpen}
                                        aria-controls='demo-practice' onClick={() => setPracticeOpen(!practiceOpen)}>
                                        Try a practice question <ChevronDown size={16} className={practiceOpen ? 'demo-chevron-open' : ''} aria-hidden='true' />
                                    </button>
                                    {practiceOpen && (
                                        <fieldset id='demo-practice' className='demo-practice reveal'>
                                            <legend>Put it into practice</legend>
                                            <p className='demo-question'>{result.quiz.prompt}</p>
                                            <div className='demo-options'>
                                                {result.quiz.options.map((option, index) => (
                                                    <label key={option} className={`demo-option ${checked && index === result.quiz.correctIndex ? 'demo-option-correct' : ''} ${checked && answer === index && index !== result.quiz.correctIndex ? 'demo-option-wrong' : ''}`}>
                                                        <input type='radio' name={`demo-answer-${result.id}`} value={index}
                                                            checked={answer === index} disabled={checked} onChange={() => setAnswer(index)} />
                                                        <span>{option}</span>
                                                    </label>
                                                ))}
                                            </div>
                                            {!checked ? (
                                                <button type='button' className='demo-check-answer' disabled={answer === null} onClick={() => setChecked(true)}>Check answer</button>
                                            ) : (
                                                <>
                                                    <p role='status' className={`demo-answer-feedback ${answer === result.quiz.correctIndex ? 'is-correct' : ''}`}>
                                                        <strong>{answer === result.quiz.correctIndex ? 'That’s right. ' : 'Not quite. '}</strong>{result.quiz.explanation}
                                                    </p>
                                                    <button type='button' className='demo-edit' onClick={() => { setAnswer(null); setChecked(false); }}>Try again</button>
                                                </>
                                            )}
                                        </fieldset>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className='demo-workspace-note'><Sparkles size={14} aria-hidden='true' /> Prepared examples. Personalised feedback starts in your Writing Desk.</div>
                </div>
            </div>
        </section>
    );
}

function MarkedDraft({text, mistakes, corrected = false}) {
    const matches = mistakes.map((mistake) => {
        const phrase = corrected ? mistake.correct : mistake.wrong;
        return {id: mistake.id, phrase, index: text.indexOf(phrase)};
    }).filter((match) => match.index >= 0).sort((first, second) => first.index - second.index);
    const parts = [];
    let cursor = 0;
    for (const match of matches) {
        parts.push(text.slice(cursor, match.index));
        parts.push(<mark key={match.id} className={corrected ? 'demo-corrected-word' : 'demo-error-word'}>{match.phrase}</mark>);
        cursor = match.index + match.phrase.length;
    }
    parts.push(text.slice(cursor));
    return parts;
}
