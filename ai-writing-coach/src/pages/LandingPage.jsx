import { Link } from "react-router-dom";
import { useState } from "react";
import {
  PenTool,
  BarChart2,
  GraduationCap,
  Award,
  Sparkles,
  ArrowRight,
  Info,
} from "lucide-react";
import { Button } from "../components/Button";
import { useToast } from "../components/Toast";

const templates = {
  pitch:
    "Dear hiring team, I am writing to propose my services. The team of developers does tried to fix the API modules, but they has failed continuously. We need to implement a clean architecture as soon as possible. I am looking forward to see you.",
  chat: "Hi sir! I am happy to tell you that the project details is ready. Everybody in our group are working to ensure we submit early. Let me know when you has time to check.",
  essay: "The economic situation in Nigeria are challenging. Many youth struggles to get remote jobs due to this gap. I strongly believes that digital education provide a viable escape route.",
};

/**
 * Landing page. The interactive demo is visual only — submitting it
 * routes the user through the auth flow.
 */
export function LandingPage() {
  const [draft, setDraft] = useState("");
  const { show } = useToast();

  const handleTemplateClick = (key) => {
    setDraft(templates[key]);
    show(`Loaded the ${key} draft.`);
  };

  const handleCheckClick = () => {
    if (!draft.trim()) {
      show("Type or paste something first.");
      return;
    }
    show("Sign in to run a real analysis on your draft.");
  };

  return (
    <section className="px-4  sm:px-12 max-w-7xl mx-auto my-auto pt-20 pb-10 space-y-24">
      {/* Hero */}
      <div className="grid lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7 space-y-7 pt-10 px-10 lg:px-0">
          <h1 className="text-6xl sm:text-5xl lg:text-6xl pt-6 font-bold text-slate-900 dark:text-white tracking-tight leading-[1.05] text-center lg:text-left">
            Your AI-Powered{" "}
            <span className="text-brand-500">English Writting Coach</span>
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed sm:px-12 lg:px-0 mt-0 text-center lg:text-left">
            Stop using software as a crutch. English Error Coach doesn't just fix your typos-it acts as an elite personal tutor, analyzing your weakness and generating dynamic lessons to elevate your communication
          </p>
          <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-3 pt-2 ">
            <Link to="/signup">
              <Button className="w-full" size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Start Improving Now
              </Button>
            </Link>
            <a href="#demo">
              <Button className
              ="border dark:border-gray-700 border-gray-200  text-gray-700 dark:text-gray-300 w-full" variant="ghost" size="lg">
                Try the Interactive Demo ↓
              </Button>
            </a>
          </div>
          {/* <p className="text-xs text-slate-400">
            Free while in beta. Sign in with email or Google.
          </p> */}
        </div>

        {/* Hero illustration card */}
        <div className="lg:col-span-5">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-1.5 py-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 "/>
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-600 "/>
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 "/>
              </div>
              <span className="text-[11px] font-medium text-slate-400">
                Writting Analysis Mock
              </span>
            </div>
            <div className="p-5 space-y-3 py-7">
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  You wrote
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  The company{" "}
                  <span className="line-through text-error decoration-wavy">
                    does tried
                  </span>{" "}
                  to reach new clients but{" "}
                  <span className="line-through text-error decoration-wavy">
                    they has
                  </span>{" "}
                  failed.
                </p>
              </div>
              <div className="p-3.5 rounded-xl border border-emerald-200/60 dark:border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-500/5">
                <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1.5">
                  Coach says
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                  The company{" "}
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold underline decoration-2">
                    has tried
                  </span>{" "}
                  to reach new clients but{" "}
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold underline decoration-2">
                    they have
                  </span>{" "}
                  failed.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 flex items-start gap-2.5">
                <div className="p-1 bg-brand-50 text-brand-500 rounded-md flex-shrink-0">
                  <Info className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">
                    Subject-verb agreement
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                    "They" is plural — it takes "have", not "has".
                  </p>
                 
                </div>
              </div>
            </div>
          </div>
          
        </div>
        <div className="w-full h-px bg-slate-200 dark:bg-slate-700 lg:bg-transparent " ></div>
      </div>

      {/* Interactive Demo */}
      <div id="demo" className="space-y-8">
        <div className="max-w-xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Try a draft.
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Pick one of these, edit it, or write your own. Sign in to get the
            real analysis.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <TemplateButton onClick={() => handleTemplateClick("pitch")}>
            A client proposal
          </TemplateButton>
          <TemplateButton onClick={() => handleTemplateClick("chat")}>
            A freelancer message
          </TemplateButton>
          <TemplateButton onClick={() => handleTemplateClick("essay")}>
            A scholarship essay
          </TemplateButton>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={5}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl p-4 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 resize-none"
            placeholder="Type or paste your text here…"
          />
          <div className="flex items-center justify-between pt-3">
            <span className="text-xs text-slate-400">
              {draft.trim() ? `${draft.trim().split(/\s+/).length} words` : "Empty"}
            </span>
            <Button
              onClick={handleCheckClick}
              leftIcon={<Sparkles className="w-3.5 h-3.5" />}
            >
              Check it
            </Button>
          </div>
        </div>
      </div>

      {/* Value props — written like a real product, not SaaS copy */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <ValueProp
          icon={<PenTool className="w-5 h-5" />}
          tone="brand"
          title="Teacher's Desk"
          body="Rather than silently correcting, the platform breaks down each correction in simple, understandable, localized mechanics.."
        />
        <ValueProp
          icon={<BarChart2 className="w-5 h-5" />}
          tone="indigo"
          title="Weakness Profiler"
          body="We record patterns in your typing errors to isolate exactly where your logical understanding is failing.."
        />
        <ValueProp
          icon={<GraduationCap className="w-5 h-5" />}
          tone="emerald"
          title="Interactive Micro-Lessons"
          body="Instantly convert detected weaknesses into specialized modules with quizzes to practice what you got wrong."
        />
        <ValueProp
          icon={<Award className="w-5 h-5" />}
          tone="amber"
          title="Competition Ready"
          body="Built using advanced Gemini API reasoning for robust processing and customized EdTech execution workflows."
        />
      </div>

      <footer className="pt-12 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p>© {new Date().getFullYear()} English Error Coach. Designed for the OPay Innovation Challenge.</p>
        
      </footer>
    </section>
  );
}

function TemplateButton({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-full transition-colors"
    >
      {children}
    </button>
  );
}

function ValueProp({ icon, tone, title, body }) {
  const toneClass = {
    brand: "bg-brand-50 text-brand-500 dark:bg-brand-500/10",
    indigo: "bg-indigo-50 text-indigo-500 dark:bg-indigo-500/10",
    emerald: "bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10",
    amber: "bg-amber-50 text-amber-500 dark:bg-amber-500/10",
  }[tone];

  return (
    <div className="p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
      <div className={`p-2.5 rounded-xl w-fit ${toneClass}`}>{icon}</div>
      <h3 className="font-semibold text-slate-900 dark:text-white text-[15px]">
        {title}
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
        {body}
      </p>
    </div>
  );
}