import React, { useState } from 'react';
import { 
  Building2, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  ShieldCheck, 
  Wrench, 
  ArrowRight, 
  ChevronDown, 
  MessageSquare, 
  BarChart3, 
  Zap, 
  Users, 
  FileCheck2,
  Lock,
  PlusCircle,
  HelpCircle,
  ArrowUpRight
} from 'lucide-react';

interface LandingPageProps {
  onOpenNewComplaint: () => void;
  onExploreDemo: (tab: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenNewComplaint, onExploreDemo }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: 'How does Campus Connect prioritize reported issues?',
      a: 'Campus Connect features an integrated Gemini AI classifier that analyzes your description and photo evidence to automatically assign urgency levels (Low, Medium, High, Critical) and route the report directly to the responsible department.'
    },
    {
      q: 'Can students track the exact status of their complaints?',
      a: 'Yes! Every ticket features an immutable Activity Timeline. You receive real-time notifications when a technician is assigned, when work starts on-site, and when proof-of-completion photos are uploaded.'
    },
    {
      q: 'How do staff members verify that an issue is resolved?',
      a: 'Maintenance technicians must upload a mandatory "Proof of Completion" photo along with work remarks before marking a ticket as Resolved. Students can inspect the proof photo and close or reopen the ticket.'
    },
    {
      q: 'What happens if a complaint breaches the SLA deadline?',
      a: 'If a ticket approaches or exceeds its target SLA window (e.g. 6 hours for critical leaks or power failures), the system automatically triggers an escalation alert to the Campus Infrastructure Director.'
    }
  ];

  return (
    <div className="space-y-20 pb-12">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 pb-12 rounded-3xl bg-gradient-to-b from-indigo-950/40 via-slate-900 to-slate-950 border border-slate-800/80 shadow-2xl">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-64 bg-indigo-500/10 blur-[120px] pointer-events-none" />
        
        <div className="relative max-w-5xl mx-auto px-6 text-center space-y-6">
          
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold shadow-inner">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            Next-Gen Campus Infrastructure Platform • AI Auto-Routing
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-100 tracking-tight leading-[1.15]">
            Smart Student Problem Reporting & <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">Instant Resolution</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Eliminate WhatsApp groups, paper registers, and lost emails. A centralized SaaS solution for students to report issues and staff to resolve complaints with complete SLA accountability.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              onClick={onOpenNewComplaint}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition-all active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              Report Issue Now
            </button>
            <button
              onClick={() => onExploreDemo('student')}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 font-semibold text-sm transition-all"
            >
              Explore Student Dashboard <ArrowRight className="w-4 h-4 text-indigo-400" />
            </button>
          </div>

          {/* Stat Counter Strip */}
          <div className="pt-10 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
              <div className="text-2xl font-black text-indigo-400">98.4%</div>
              <div className="text-xs text-slate-400 font-medium">On-Time SLA Resolution</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
              <div className="text-2xl font-black text-purple-400">&lt; 4.2 Hours</div>
              <div className="text-xs text-slate-400 font-medium">Avg Turnaround Time</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
              <div className="text-2xl font-black text-emerald-400">17 Categories</div>
              <div className="text-xs text-slate-400 font-medium">Wi-Fi, Water, Labs, Hostel</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
              <div className="text-2xl font-black text-pink-400">100% Audit</div>
              <div className="text-xs text-slate-400 font-medium">Photo Proof & Timelines</div>
            </div>
          </div>

        </div>
      </section>

      {/* How It Works Section */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-slate-100">How Campus Connect Operates</h2>
          <p className="text-xs text-slate-400">Streamlined 3-step workflow connecting students, maintenance leads, and campus directors.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 relative">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-base">
              1
            </div>
            <h3 className="font-bold text-slate-100 text-base">Student Logs Issue</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Submit a report with location, photo evidence, and title. Gemini AI auto-suggests category and urgency.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 relative">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-base">
              2
            </div>
            <h3 className="font-bold text-slate-100 text-base">Smart Dispatch & Staff Action</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Assigned technician arrives on-site, marks status "In Progress", and provides live updates.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 relative">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-base">
              3
            </div>
            <h3 className="font-bold text-slate-100 text-base">Proof Upload & Closure</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Technician uploads proof photo, student verifies satisfaction, and full audit logs are archived.
            </p>
          </div>

        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-slate-100">Enterprise SaaS Features</h2>
          <p className="text-xs text-slate-400">Engineered for university scale with role-based access control and analytics.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800/80 hover:border-slate-700 transition-all space-y-3">
            <div className="p-2.5 w-fit rounded-xl bg-indigo-500/10 text-indigo-400"><Sparkles className="w-5 h-5" /></div>
            <h3 className="font-bold text-slate-100 text-sm">Gemini AI Auto-Classification</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Natural language processing automatically matches problem descriptions to department categories and priority levels.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800/80 hover:border-slate-700 transition-all space-y-3">
            <div className="p-2.5 w-fit rounded-xl bg-purple-500/10 text-purple-400"><Clock className="w-5 h-5" /></div>
            <h3 className="font-bold text-slate-100 text-sm">Dynamic SLA Monitoring</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Custom target response windows per category (e.g. 6 hours for water/power hazards vs 48 hours for furniture).
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800/80 hover:border-slate-700 transition-all space-y-3">
            <div className="p-2.5 w-fit rounded-xl bg-amber-500/10 text-amber-400"><Wrench className="w-5 h-5" /></div>
            <h3 className="font-bold text-slate-100 text-sm">Proof of Completion Verification</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Staff must upload high-resolution repair photos before marking tickets resolved, ensuring physical accountability.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800/80 hover:border-slate-700 transition-all space-y-3">
            <div className="p-2.5 w-fit rounded-xl bg-emerald-500/10 text-emerald-400"><BarChart3 className="w-5 h-5" /></div>
            <h3 className="font-bold text-slate-100 text-sm">Recharts Executive Analytics</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Interactive bar charts, area trends, category percentage breakdowns, and technician speed scorecards.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800/80 hover:border-slate-700 transition-all space-y-3">
            <div className="p-2.5 w-fit rounded-xl bg-pink-500/10 text-pink-400"><FileCheck2 className="w-5 h-5" /></div>
            <h3 className="font-bold text-slate-100 text-sm">Instant CSV & PDF Export</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Download complete dataset CSV exports or generate formal printable executive audit reports for administrative board meetings.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800/80 hover:border-slate-700 transition-all space-y-3">
            <div className="p-2.5 w-fit rounded-xl bg-sky-500/10 text-sky-400"><Lock className="w-5 h-5" /></div>
            <h3 className="font-bold text-slate-100 text-sm">Clerk Role-Based Security</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Strict RBAC authorization separating Student views, Staff maintenance queues, and Admin command matrices.
            </p>
          </div>

        </div>
      </section>

      {/* Role Portals Preview CTAs */}
      <section className="p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-slate-100">Explore Demo Portals</h2>
          <p className="text-xs text-slate-400">Switch between active roles to test end-to-end workflows.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => onExploreDemo('student')}
            className="p-5 rounded-2xl bg-slate-950 border border-slate-800/80 hover:border-indigo-500 text-left transition-all space-y-2 group"
          >
            <div className="flex items-center justify-between text-indigo-400 font-bold text-sm">
              <span>Student Portal</span>
              <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <p className="text-xs text-slate-400">Log issues, upvote peer concerns, view resolution timeline & post comments.</p>
          </button>

          <button
            onClick={() => onExploreDemo('staff')}
            className="p-5 rounded-2xl bg-slate-950 border border-slate-800/80 hover:border-amber-500 text-left transition-all space-y-2 group"
          >
            <div className="flex items-center justify-between text-amber-400 font-bold text-sm">
              <span>Staff Workspace</span>
              <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <p className="text-xs text-slate-400">View assigned tasks, update repair progress, and upload completion proof photos.</p>
          </button>

          <button
            onClick={() => onExploreDemo('admin')}
            className="p-5 rounded-2xl bg-slate-950 border border-slate-800/80 hover:border-purple-500 text-left transition-all space-y-2 group"
          >
            <div className="flex items-center justify-between text-purple-400 font-bold text-sm">
              <span>Admin Command</span>
              <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <p className="text-xs text-slate-400">Assign staff, manage category SLA hours, view immutable audit logs & export reports.</p>
          </button>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="space-y-6 max-w-3xl mx-auto">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-slate-100">Frequently Asked Questions</h2>
          <p className="text-xs text-slate-400">Everything you need to know about Campus Connect.</p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div key={idx} className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full flex items-center justify-between p-4 text-left font-bold text-slate-200 text-xs hover:bg-slate-800/40 transition-colors"
              >
                <span>{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-indigo-400 transition-transform ${openFaq === idx ? 'rotate-180' : ''}`} />
              </button>
              {openFaq === idx && (
                <div className="p-4 pt-0 text-xs text-slate-400 leading-relaxed border-t border-slate-800/50">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

    </div>
  );
};
