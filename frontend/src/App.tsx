import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  Crown,
  ChevronDown,
  ChevronRight,
  Database,
  Fingerprint,
  FolderTree,
  Loader2,
  Mail,
  Network,
  RotateCw,
  Send,
  ShieldAlert,
  TreePine,
  User as UserIcon,
  type LucideIcon
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Hierarchy = {
  root: string;
  tree: Record<string, unknown>;
  depth?: number;
  has_cycle?: true;
};

type ApiResponse = {
  user_id: string;
  email_id: string;
  college_roll_number: string;
  hierarchies: Hierarchy[];
  invalid_entries: string[];
  duplicate_edges: string[];
  summary: {
    total_trees: number;
    total_cycles: number;
    largest_tree_root: string;
  };
};

const DEFAULT_INPUT =
  "A->B\nA->C\nB->D\nC->E\nE->F\nX->Y\nY->Z\nZ->X\nP->Q\nQ->R\nG->H\nG->H\nG->I\nhello\n1->2\nA->";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || "";
const endpoint = apiBaseUrl ? `${apiBaseUrl}/bfhl` : "/bfhl";

const parseEntries = (source: string) => {
  return source
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

const IdentityBadge = ({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) => (
  <div className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 shadow-sm shadow-slate-950">
    <span className="flex items-center gap-1.5 text-slate-400">
      <Icon size={12} />
      {label}
    </span>
    <p className="mt-0.5 max-w-[220px] truncate text-sm font-semibold text-slate-100">{value}</p>
  </div>
);

const MetricCard = ({ icon: Icon, label, value, toneClass }: { icon: LucideIcon; label: string; value: string | number; toneClass: string }) => (
  <div className="glass-card glass-card-hover p-5">
    <div className="flex items-center justify-between">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <div className={cn("rounded-xl p-2.5 shadow-lg ring-1", toneClass)}>
        <Icon size={18} />
      </div>
    </div>
    <p className="mt-3 text-3xl font-bold text-white">{value}</p>
  </div>
);

const AlertBox = ({
  title,
  icon: Icon,
  tone,
  values,
  emptyLabel
}: {
  title: string;
  icon: LucideIcon;
  tone: "rose" | "amber";
  values: string[];
  emptyLabel: string;
}) => (
  <div
    className={cn(
      "rounded-2xl border p-5",
      tone === "rose" ? "border-rose-900/70 bg-rose-950/30" : "border-amber-900/70 bg-amber-950/20"
    )}
  >
    <h4
      className={cn(
        "mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em]",
        tone === "rose" ? "text-rose-300" : "text-amber-300"
      )}
    >
      <Icon size={14} />
      {title}
    </h4>
    {values.length > 0 ? (
      <div className="flex flex-wrap gap-2">
        {values.map((value, idx) => (
          <span
            key={`${value}-${idx}`}
            className={cn(
              "rounded-md border px-2 py-1 font-mono text-xs",
              tone === "rose" ? "border-rose-800/70 bg-rose-950/60 text-rose-200" : "border-amber-800/70 bg-amber-950/50 text-amber-200"
            )}
          >
            {value || "empty"}
          </span>
        ))}
      </div>
    ) : (
      <p className="text-sm italic text-slate-400">{emptyLabel}</p>
    )}
  </div>
);

const TreeNode = ({ node, subNodes }: { node: string; subNodes: unknown }) => {
  const [isOpen, setIsOpen] = useState(true);
  const children = (subNodes && typeof subNodes === "object" ? Object.entries(subNodes as Record<string, unknown>) : []) as [
    string,
    unknown
  ][];
  const hasChildren = children.length > 0;

  return (
    <div className="ml-3 border-l border-slate-700/60 pl-3">
      <button
        type="button"
        onClick={() => hasChildren && setIsOpen((prev) => !prev)}
        className={cn(
          "group flex w-full items-center gap-2 py-1 text-left",
          !hasChildren && "cursor-default"
        )}
      >
        {hasChildren ? (
          isOpen ? <ChevronDown size={14} className="text-slate-400 transition-colors group-hover:text-blue-300" /> : <ChevronRight size={14} className="text-slate-500 transition-colors group-hover:text-blue-300" />
        ) : (
          <span className="block h-2 w-2 rounded-full bg-slate-600" />
        )}
        <FolderTree size={14} className={cn("transition-colors", hasChildren ? "text-blue-400/80 group-hover:text-blue-300" : "text-slate-500")} />
        <span className={cn("text-sm font-medium", hasChildren ? "text-slate-200" : "text-slate-400")}>{node}</span>
      </button>

      {hasChildren && (
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="overflow-hidden"
            >
              {children.map(([child, grandChildren]) => (
                <TreeNode key={child} node={child} subNodes={grandChildren} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
};

export default function App() {
  const [rawInput, setRawInput] = useState(DEFAULT_INPUT);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "failed">("idle");
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const parsedEntries = useMemo(() => parseEntries(rawInput), [rawInput]);
  const hasEndpoint = apiBaseUrl.length > 0;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setResponse(null);
    setStatus("idle");

    if (!hasEndpoint) {
      setError("API Base URL is not configured. Please set VITE_API_BASE_URL.");
      setStatus("failed");
      return;
    }
    if (parsedEntries.length === 0) {
      setError("Please enter at least one node entry.");
      setStatus("failed");
      return;
    }

    setIsLoading(true);
    setStatus("submitting");
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: parsedEntries })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "API request failed.");
        setStatus("failed");
        return;
      }
      setResponse(data as ApiResponse);
      setStatus("success");
    } catch (_err) {
      setError("Could not reach API. Please check your connection and CORS settings.");
      setStatus("failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-[1240px] px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 rounded-2xl border border-slate-700/70 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/70">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
          <div className="inline-flex items-center gap-3 rounded-full border border-slate-800 bg-slate-900/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            <Network size={14} className="text-blue-400" />
            premium analysis workspace
          </div>
          <h1 className="mt-4 py-1 leading-[1.15] bg-gradient-to-r from-slate-100 via-blue-200 to-indigo-300 bg-clip-text text-4xl font-black tracking-tight text-transparent sm:text-5xl">
            Bajaj-srm-full-stack paper
          </h1>
          <p className="mt-3 max-w-2xl text-slate-300">
            Done by Akhandam Bhagavan Karthikeya (RA2311027010084)
          </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div
              className={cn(
                "status-pill flex items-center gap-2",
                status === "idle" && "border-slate-700 bg-slate-950 text-slate-300",
                status === "submitting" && "border-amber-500/50 bg-amber-500/10 text-amber-300",
                status === "success" && "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
                status === "failed" && "border-rose-500/40 bg-rose-500/10 text-rose-300"
              )}
            >
              {status === "submitting" && <Loader2 size={12} className="animate-spin" />}
              {status === "success" && <CheckCircle2 size={12} />}
              {status === "failed" && <AlertCircle size={12} />}
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </div>
            <p className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 font-mono text-[11px] text-slate-300">
              {endpoint}
            </p>
            <a
              href="https://drive.google.com/file/d/1utajOIWeEYfSYqvVruuMlg-2IUdK3eu3/view?usp=sharing"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-[11px] font-semibold text-slate-200 transition-colors hover:border-blue-500/70 hover:text-blue-200"
            >
              Resume
            </a>
            <a
              href="https://github.com/Karthikeya-Akhandam/Bajaj-Finserv-SRM-Fullstack-Paper.git"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-[11px] font-semibold text-slate-200 transition-colors hover:border-blue-500/70 hover:text-blue-200"
            >
              GitHub
            </a>
          </div>
        </div>
      </header>

      <main className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <section className="lg:col-span-5 lg:sticky lg:top-8 lg:self-start">
          <div className="glass-card overflow-hidden">
            <div className="border-b border-slate-700 bg-slate-900 px-6 py-5">
              <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                <Database size={18} className="text-blue-400" />
                Input Workspace
              </h2>
              <p className="mt-1 text-sm text-slate-300">Paste edges in A-to-B format, separated by commas or new lines.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              <div className="relative">
                <textarea
                  id="entries"
                  value={rawInput}
                  onChange={(event) => setRawInput(event.target.value)}
                  className="min-h-[350px] w-full resize-none rounded-2xl border border-slate-700 bg-slate-950 p-4 font-mono text-sm leading-6 text-slate-100 shadow-inner shadow-slate-950 focus:border-blue-500/70 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="A->B, A->C, B->D..."
                />
                <div className="absolute bottom-3 right-3 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-[11px] text-slate-300">
                  {parsedEntries.length} edges
                </div>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Examples</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {["A->B", "X->Y", "B->C"].map((sample) => (
                    <span key={sample} className="rounded-md border border-slate-600 bg-slate-800 px-2 py-1 font-mono text-xs text-blue-200">
                      {sample}
                    </span>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={cn(
                  "inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold text-white transition-all",
                  isLoading
                    ? "cursor-not-allowed bg-slate-800"
                    : "bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 shadow-lg shadow-blue-900/30 hover:translate-y-[-1px] hover:from-blue-500 hover:via-indigo-500 hover:to-violet-500"
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Processing
                  </>
                ) : (
                  <>
                    Submit For Analysis
                    <Send size={16} />
                  </>
                )}
              </button>
            </form>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mt-4 rounded-xl border border-rose-500/50 bg-rose-900/40 p-4"
              >
                <p className="flex items-start gap-2 text-sm text-rose-200">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  {error}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <section className="lg:col-span-7">
          <AnimatePresence mode="wait">
            {!response ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="glass-card flex min-h-[640px] flex-col items-center justify-center border-dashed border-slate-700 p-10 text-center"
              >
                <div className="mb-5 rounded-3xl border border-slate-700 bg-slate-900 p-5">
                  <TreePine size={42} className="text-slate-700" />
                </div>
                <h3 className="text-2xl font-bold text-slate-100">Results Dashboard Awaits</h3>
                <p className="mt-2 max-w-md text-slate-300">
                  Submit the input graph to see identity details, summary metrics, anomaly alerts, and nested hierarchy cards.
                </p>
              </motion.div>
            ) : (
              <motion.div key="result" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <div className="flex flex-wrap gap-2">
                  <IdentityBadge icon={UserIcon} label="User" value={response.user_id} />
                  <IdentityBadge icon={Mail} label="Email" value={response.email_id} />
                  <IdentityBadge icon={Fingerprint} label="Roll Number" value={response.college_roll_number} />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <MetricCard
                    icon={TreePine}
                    label="Total Trees"
                    value={response.summary.total_trees}
                    toneClass="bg-emerald-500/20 text-emerald-200 ring-emerald-400/40 shadow-emerald-900/30"
                  />
                  <MetricCard
                    icon={RotateCw}
                    label="Total Cycles"
                    value={response.summary.total_cycles}
                    toneClass="bg-amber-500/20 text-amber-200 ring-amber-400/40 shadow-amber-900/30"
                  />
                  <MetricCard
                    icon={Crown}
                    label="Largest Root"
                    value={response.summary.largest_tree_root || "N/A"}
                    toneClass="bg-blue-500/20 text-blue-100 ring-blue-400/40 shadow-blue-900/30"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <AlertBox
                    title="Invalid Entries"
                    icon={ShieldAlert}
                    tone="rose"
                    values={response.invalid_entries}
                    emptyLabel="No invalid entries detected."
                  />
                  <AlertBox
                    title="Duplicate Edges"
                    icon={RotateCw}
                    tone="amber"
                    values={response.duplicate_edges}
                    emptyLabel="No duplicate edges detected."
                  />
                </div>

                <div className="glass-card overflow-hidden">
                  <div className="border-b border-slate-700 bg-slate-900 px-6 py-4">
                    <h3 className="text-base font-bold text-white">Hierarchies</h3>
                  </div>
                  <div className="max-h-[520px] space-y-4 overflow-y-auto p-5">
                    {response.hierarchies.map((hierarchy, idx) => (
                      <div
                        key={`${hierarchy.root}-${idx}`}
                        className={cn(
                          "rounded-2xl border p-4",
                          hierarchy.has_cycle
                            ? "border-rose-800/70 bg-rose-950/20"
                            : "border-slate-700 bg-slate-950/70"
                        )}
                      >
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold",
                                hierarchy.has_cycle ? "bg-rose-500/20 text-rose-300" : "bg-blue-500/20 text-blue-300"
                              )}
                            >
                              {hierarchy.root}
                            </span>
                            <span className="text-sm font-semibold text-slate-200">Root Node</span>
                          </div>

                          <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-[0.13em]">
                            {hierarchy.has_cycle && (
                              <span className="rounded-full border border-rose-700/80 bg-rose-500/10 px-2 py-1 text-rose-300">
                                Cycle Detected
                              </span>
                            )}
                            {typeof hierarchy.depth === "number" && (
                              <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-1 text-slate-300">
                                Depth {hierarchy.depth}
                              </span>
                            )}
                          </div>
                        </div>

                        {hierarchy.has_cycle ? (
                          <div className="rounded-lg border border-rose-800/70 bg-rose-950/30 p-3 text-sm text-rose-200">
                            Tree rendering skipped because this hierarchy contains a cycle.
                          </div>
                        ) : (
                          <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
                            <TreeNode node={hierarchy.root} subNodes={hierarchy.tree[hierarchy.root]} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>
    </div>
  );
}
