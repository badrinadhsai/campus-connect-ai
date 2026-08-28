import React from 'react';
import { Building2, ShieldCheck, Heart, Github, ArrowUpRight, Cpu } from 'lucide-react';

interface FooterProps {
  onOpenDocs: () => void;
  onOpenNewComplaint: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenDocs, onOpenNewComplaint }) => {
  return (
    <footer className="mt-20 border-t border-slate-800/80 bg-slate-950/80 text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          <div className="md:col-span-1 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 text-white">
                <Building2 className="w-4 h-4" />
              </div>
              <span className="font-bold text-slate-100 text-base">CampusConnect</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Enterprise smart student problem reporting & resolution infrastructure for modern university campuses.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400 pt-2 font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              System Status: All Services Operational (99.98% SLA)
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3">Core Portals</h4>
            <ul className="space-y-2 text-xs">
              <li><button onClick={onOpenNewComplaint} className="hover:text-indigo-400 transition-colors">Submit Issue Report</button></li>
              <li><a href="#student" className="hover:text-indigo-400 transition-colors">Student Issue Tracker</a></li>
              <li><a href="#staff" className="hover:text-indigo-400 transition-colors">Staff Maintenance Queue</a></li>
              <li><a href="#admin" className="hover:text-indigo-400 transition-colors">Admin Command Desk</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3">Categories & SLAs</h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center justify-between"><span className="text-slate-300">Wi-Fi & Networks</span><span className="text-slate-500 font-mono text-[10px]">12h SLA</span></li>
              <li className="flex items-center justify-between"><span className="text-slate-300">Water & Plumbing</span><span className="text-slate-500 font-mono text-[10px]">6h SLA</span></li>
              <li className="flex items-center justify-between"><span className="text-slate-300">Electricity & Power</span><span className="text-slate-500 font-mono text-[10px]">6h SLA</span></li>
              <li className="flex items-center justify-between"><span className="text-slate-300">Classroom & AV</span><span className="text-slate-500 font-mono text-[10px]">24h SLA</span></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3">Developer & Stack</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={onOpenDocs} className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 font-medium">
                  <Cpu className="w-3.5 h-3.5" />
                  Prisma Schema & Architecture <ArrowUpRight className="w-3 h-3" />
                </button>
              </li>
              <li className="text-slate-400">Next.js 15 App Router + React 19</li>
              <li className="text-slate-400">Clerk Auth + Supabase Storage</li>
              <li className="text-slate-400">Tailwind CSS + Framer Motion</li>
            </ul>
          </div>

        </div>

        <div className="pt-8 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span>&copy; {new Date().getFullYear()} CampusConnect Inc. Enterprise Edition.</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={onOpenDocs} className="hover:text-slate-300">Architecture Specs</button>
            <span>•</span>
            <span className="flex items-center gap-1">Built with precision for higher ed</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
