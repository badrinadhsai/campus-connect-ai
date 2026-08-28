import React, { useState } from 'react';
import { X, Copy, Check, FileCode2, Database, Server, Cpu, ShieldCheck } from 'lucide-react';

interface DocsAndSchemaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRISMA_SCHEMA_CODE = `// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  STUDENT
  STAFF
  ADMIN
}

enum Status {
  Submitted
  Under_Review
  Assigned
  In_Progress
  Resolved
  Rejected
  Closed
}

enum Priority {
  Low
  Medium
  High
  Critical
}

model User {
  id           String      @id @default(cuid())
  email        String      @unique
  name         String
  role         Role        @default(STUDENT)
  department   String?
  rollNo       String?
  phone        String?
  avatar       String?
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  complaints   Complaint[] @relation("StudentComplaints")
  assignments  Complaint[] @relation("StaffAssignments")
  comments     Comment[]
  auditLogs    AuditLog[]

  @@index([role])
  @@index([email])
}

model Category {
  id              String      @id @default(cuid())
  name            String      @unique
  description     String
  defaultSlaHours Int         @default(24)
  active          Boolean     @default(true)
  createdAt       DateTime    @default(now())

  complaints      Complaint[]
}

model Complaint {
  id                 String       @id
  title              String
  description        String       @db.Text
  categoryName       String
  priority           Priority     @default(Medium)
  status             Status       @default(Submitted)
  location           String
  studentId          String
  studentName        String
  assignedStaffId    String?
  assignedDepartment String?
  slaTargetHours     Int          @default(24)
  resolutionRemarks  String?      @db.Text
  rejectionReason    String?      @db.Text
  upvotes            Int          @default(0)
  createdAt          DateTime     @default(now())
  updatedAt          DateTime     @updatedAt
  resolvedAt         DateTime?

  category           Category     @relation(fields: [categoryName], references: [name])
  student            User         @relation("StudentComplaints", fields: [studentId], references: [id])
  assignedStaff      User?        @relation("StaffAssignments", fields: [assignedStaffId], references: [id])
  
  attachments        Attachment[]
  comments           Comment[]
  timeline           Timeline[]

  @@index([status])
  @@index([categoryName])
  @@index([studentId])
  @@index([assignedStaffId])
}

model Attachment {
  id                String    @id @default(cuid())
  complaintId       String
  url               String
  fileName          String
  fileType          String
  isResolutionProof Boolean   @default(false)
  uploadedAt        DateTime  @default(now())

  complaint         Complaint @relation(fields: [complaintId], references: [id], onDelete: Cascade)
}

model Comment {
  id           String    @id @default(cuid())
  complaintId  String
  userId       String
  userName     String
  userRole     Role
  content      String    @db.Text
  isInternal   Boolean   @default(false)
  createdAt    DateTime  @default(now())

  complaint    Complaint @relation(fields: [complaintId], references: [id], onDelete: Cascade)
  user         User      @relation(fields: [userId], references: [id])
}

model Timeline {
  id           String    @id @default(cuid())
  complaintId  String
  title        String
  description  String
  actorName    String
  actorRole    Role
  statusChange Status?
  timestamp    DateTime  @default(now())

  complaint    Complaint @relation(fields: [complaintId], references: [id], onDelete: Cascade)
}

model AuditLog {
  id         String   @id @default(cuid())
  timestamp  DateTime @default(now())
  actorName  String
  actorEmail String
  actorRole  Role
  action     String
  target     String
  details    String
  ipAddress  String?

  user       User?    @relation(fields: [actorEmail], references: [email])
}`;

export const DocsAndSchemaModal: React.FC<DocsAndSchemaModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'schema' | 'architecture' | 'setup'>('schema');

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(PRISMA_SCHEMA_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <FileCode2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">Enterprise System Architecture & Schema</h3>
              <p className="text-xs text-slate-400">Production-ready database models, RBAC rules, and API endpoints</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-800/80 bg-slate-950/20">
          <button
            onClick={() => setActiveTab('schema')}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-xl text-xs font-bold transition-all border-t border-x ${
              activeTab === 'schema'
                ? 'bg-slate-900 border-slate-700 text-purple-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" /> Prisma Schema
          </button>
          <button
            onClick={() => setActiveTab('architecture')}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-xl text-xs font-bold transition-all border-t border-x ${
              activeTab === 'architecture'
                ? 'bg-slate-900 border-slate-700 text-purple-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-4 h-4" /> Architecture Blueprint
          </button>
          <button
            onClick={() => setActiveTab('setup')}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-xl text-xs font-bold transition-all border-t border-x ${
              activeTab === 'setup'
                ? 'bg-slate-900 border-slate-700 text-purple-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-4 h-4" /> Deployment Guide
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[65vh] overflow-y-auto">
          {activeTab === 'schema' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Normalized PostgreSQL Prisma Schema with Indexes & Foreign Key Constraints:</span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/20 text-purple-300 border border-purple-500/30 font-semibold hover:bg-purple-600/30 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied to Clipboard' : 'Copy Schema'}
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-purple-300 overflow-x-auto leading-relaxed">
                {PRISMA_SCHEMA_CODE}
              </pre>
            </div>
          )}

          {activeTab === 'architecture' && (
            <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <h4 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Full Stack Technology Stack
                </h4>
                <ul className="list-disc pl-5 space-y-1 text-slate-400">
                  <li><strong>Frontend:</strong> React 19, Vite, Tailwind CSS v4, Framer Motion, Lucide Icons, Recharts</li>
                  <li><strong>Backend & API:</strong> Express.js server on Node.js container with REST endpoints (`/api/complaints`, `/api/analytics`, `/api/ai/suggest`)</li>
                  <li><strong>AI Engine:</strong> Google `@google/genai` TypeScript SDK for Gemini 2.5 Flash intelligent category and urgency classification</li>
                  <li><strong>Database & Storage:</strong> PostgreSQL schema with Prisma ORM models and attachment uploads</li>
                  <li><strong>Authentication:</strong> Clerk Auth simulation with role-based access control (Student, Staff, Admin)</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'setup' && (
            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <h4 className="font-bold text-slate-100">Production Build & Deployment</h4>
                <p className="text-slate-400">Run the single command build and start script:</p>
                <code className="block p-2 rounded bg-slate-900 font-mono text-indigo-300 text-[11px]">
                  npm run build && npm start
                </code>
                <p className="text-slate-400">The build compiles client Vite assets into `dist/` and esbuild bundles `server.ts` into `dist/server.cjs` for standalone Cloud Run or Docker execution.</p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
