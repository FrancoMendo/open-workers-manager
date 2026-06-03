import { useState } from 'react';
import { X, Rocket, CheckCircle2, XCircle, ChevronDown, Trash2, Clock } from 'lucide-react';

export interface DeployWorkerResult {
  name: string;
  success: boolean;
  command: string;
}

export interface DeployHistoryEntry {
  id: number;
  startedAt: Date;
  endedAt: Date;
  workers: DeployWorkerResult[];
}

interface Props {
  history: DeployHistoryEntry[];
  onDelete: (id: number) => void;
  onClear: () => void;
  onClose: () => void;
}

const fmtDate = (d: Date) =>
  d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
  d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

const fmtDuration = (start: Date, end: Date) => {
  const s = Math.round((end.getTime() - start.getTime()) / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
};

const overallStatus = (workers: DeployWorkerResult[]) => {
  const ok = workers.filter(w => w.success).length;
  if (ok === workers.length) return 'success';
  if (ok === 0) return 'failure';
  return 'partial';
};

function HistoryEntry({ entry, onDelete }: { entry: DeployHistoryEntry; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const status = overallStatus(entry.workers);
  const isMulti = entry.workers.length > 1;
  const ok = entry.workers.filter(w => w.success).length;

  const statusColor = status === 'success' ? 'border-green-500/20 bg-green-500/5'
    : status === 'failure' ? 'border-red-500/20 bg-red-500/5'
    : 'border-amber-500/20 bg-amber-500/5';

  const rocketColor = status === 'success' ? 'text-green-400'
    : status === 'failure' ? 'text-red-400'
    : 'text-amber-400';

  const badgeColor = status === 'success' ? 'bg-green-500/20 text-green-400'
    : status === 'failure' ? 'bg-red-500/20 text-red-400'
    : 'bg-amber-500/20 text-amber-400';

  const badgeLabel = status === 'success' ? '✓ OK'
    : status === 'failure' ? '✗ Failed'
    : `${ok}/${entry.workers.length} OK`;

  return (
    <div className={`rounded-lg border overflow-hidden ${statusColor}`}>
      <div className="flex items-center gap-2 px-3 py-2.5">
        <Rocket size={12} className={`${rocketColor} shrink-0`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-200 truncate">
              {isMulti ? `${entry.workers.length} workers` : entry.workers[0]?.name}
            </span>
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${badgeColor}`}>
              {badgeLabel}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[9px] text-slate-500 flex items-center gap-1">
              <Clock size={8} />
              {fmtDate(entry.startedAt)}
            </span>
            <span className="text-[9px] text-slate-600">→ {fmtDuration(entry.startedAt, entry.endedAt)}</span>
          </div>
          {!isMulti && entry.workers[0]?.command && (
            <p className="text-[9px] font-mono text-slate-600 mt-0.5 truncate" title={entry.workers[0].command}>
              $ {entry.workers[0].command}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isMulti && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="p-1 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <ChevronDown size={12} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
          )}
          <button
            onClick={onDelete}
            className="p-1 rounded text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      {isMulti && expanded && (
        <div className="border-t border-slate-800/60 px-3 pb-2 pt-1.5 flex flex-col gap-2">
          {entry.workers.map((w, i) => (
            <div key={i} className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                {w.success
                  ? <CheckCircle2 size={11} className="text-green-400 shrink-0" />
                  : <XCircle size={11} className="text-red-400 shrink-0" />
                }
                <span className="text-[11px] font-bold text-slate-300 truncate">{w.name}</span>
              </div>
              {w.command && (
                <p className="text-[9px] font-mono text-slate-600 pl-5 truncate" title={w.command}>
                  $ {w.command}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const DeployHistoryPanel = ({ history, onDelete, onClear, onClose }: Props) => (
  <div className="fixed inset-y-0 right-0 z-50 flex flex-col w-[380px] bg-slate-950 border-l border-slate-800 shadow-2xl">
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 shrink-0">
      <div className="flex items-center gap-2">
        <Rocket size={14} className="text-indigo-400" />
        <span className="text-sm font-bold text-slate-100">Deploy History</span>
        {history.length > 0 && (
          <span className="px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-[10px] font-bold text-indigo-400">
            {history.length}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onClear}
          disabled={history.length === 0}
          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold text-slate-500 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-30 transition-all"
        >
          <Trash2 size={11} />
          Clear
        </button>
        <button
          onClick={onClose}
          className="p-1.5 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        >
          <X size={15} />
        </button>
      </div>
    </div>

    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-slate-600">
          <Rocket size={32} className="mb-3 opacity-30" />
          <p className="text-sm font-medium">No deploys yet</p>
        </div>
      ) : (
        [...history].reverse().map(entry => (
          <HistoryEntry
            key={entry.id}
            entry={entry}
            onDelete={() => onDelete(entry.id)}
          />
        ))
      )}
    </div>
  </div>
);

export default DeployHistoryPanel;
