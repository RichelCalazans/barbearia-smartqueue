import React, { useEffect, useRef, useState } from 'react';

type LogEntry = {
  id: number;
  at: string;
  kind: 'error' | 'unhandled' | 'console.error' | 'info' | 'diag';
  message: string;
  stack?: string;
};

const STORAGE_KEY = 'sq_debug';
const MAX_ENTRIES = 50;

function isDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get('debug') === '1') {
      localStorage.setItem(STORAGE_KEY, '1');
      return true;
    }
    if (url.searchParams.get('debug') === '0') {
      localStorage.removeItem(STORAGE_KEY);
      return false;
    }
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function formatValue(v: unknown): string {
  if (v instanceof Error) return v.message;
  if (typeof v === 'string') return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export function DiagnosticOverlay() {
  const [enabled, setEnabled] = useState<boolean>(() => isDebugEnabled());
  const [open, setOpen] = useState<boolean>(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const idRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const push = (entry: Omit<LogEntry, 'id' | 'at'>) => {
      idRef.current += 1;
      const full: LogEntry = {
        id: idRef.current,
        at: new Date().toLocaleTimeString('pt-BR', { hour12: false }),
        ...entry,
      };
      setLogs((prev) => [full, ...prev].slice(0, MAX_ENTRIES));
    };

    const onError = (ev: ErrorEvent) => {
      push({
        kind: 'error',
        message: ev.message || 'window.onerror sem mensagem',
        stack: ev.error instanceof Error ? ev.error.stack : undefined,
      });
    };

    const onRejection = (ev: PromiseRejectionEvent) => {
      const reason = ev.reason;
      push({
        kind: 'unhandled',
        message: formatValue(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
      });
    };

    const originalConsoleError = console.error;
    console.error = (...args: unknown[]) => {
      try {
        push({
          kind: 'console.error',
          message: args.map(formatValue).join(' '),
          stack: args.find((a) => a instanceof Error) instanceof Error
            ? (args.find((a) => a instanceof Error) as Error).stack
            : undefined,
        });
      } catch {
        // ignore
      }
      originalConsoleError.apply(console, args as Parameters<typeof console.error>);
    };

    const onDiag = (ev: Event) => {
      const custom = ev as CustomEvent<{ tag: string; data?: unknown }>;
      const { tag, data } = custom.detail || { tag: 'diag' };
      push({
        kind: 'diag',
        message: data !== undefined ? `${tag} · ${formatValue(data)}` : tag,
      });
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    window.addEventListener('sqdiag', onDiag);

    push({
      kind: 'info',
      message: `Diagnóstico ativo · ${navigator.userAgent}`,
    });
    push({
      kind: 'info',
      message: `URL ${window.location.href} · online=${navigator.onLine}`,
    });

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
      window.removeEventListener('sqdiag', onDiag);
      console.error = originalConsoleError;
    };
  }, [enabled]);

  if (!enabled) {
    return (
      <button
        type="button"
        onClick={() => {
          localStorage.setItem(STORAGE_KEY, '1');
          setEnabled(true);
        }}
        style={{
          position: 'fixed',
          bottom: 8,
          right: 8,
          zIndex: 99999,
          padding: '4px 8px',
          fontSize: 10,
          background: 'rgba(0,0,0,0.6)',
          color: '#94a3b8',
          border: '1px solid #334155',
          borderRadius: 6,
          fontFamily: 'monospace',
        }}
      >
        debug
      </button>
    );
  }

  const kindColor: Record<LogEntry['kind'], string> = {
    error: '#f87171',
    unhandled: '#fb923c',
    'console.error': '#fbbf24',
    info: '#94a3b8',
    diag: '#38bdf8',
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        right: 0,
        left: 0,
        zIndex: 99999,
        maxHeight: open ? '60vh' : 36,
        overflow: 'hidden',
        background: 'rgba(5, 7, 12, 0.96)',
        color: '#e2e8f0',
        borderTop: '1px solid #1e293b',
        fontFamily: 'ui-monospace, monospace',
        fontSize: 11,
        transition: 'max-height 0.2s',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          borderBottom: open ? '1px solid #1e293b' : 'none',
          background: '#0f172a',
        }}
      >
        <strong style={{ color: '#38bdf8' }}>DIAG</strong>
        <span style={{ color: '#64748b' }}>{logs.length} entradas</span>
        <span style={{ color: '#64748b', marginLeft: 'auto' }}>
          {navigator.onLine ? 'online' : 'OFFLINE'}
        </span>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          style={{
            padding: '2px 8px',
            background: '#1e293b',
            color: '#e2e8f0',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          {open ? 'minimizar' : 'expandir'}
        </button>
        <button
          type="button"
          onClick={() => setLogs([])}
          style={{
            padding: '2px 8px',
            background: '#1e293b',
            color: '#e2e8f0',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          limpar
        </button>
        <button
          type="button"
          onClick={() => {
            const text = logs
              .map((l) => `[${l.at}] ${l.kind}: ${l.message}${l.stack ? '\n' + l.stack : ''}`)
              .join('\n\n');
            navigator.clipboard?.writeText(text).catch(() => {});
          }}
          style={{
            padding: '2px 8px',
            background: '#1e293b',
            color: '#e2e8f0',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          copiar
        </button>
        <button
          type="button"
          onClick={() => {
            localStorage.removeItem(STORAGE_KEY);
            setEnabled(false);
          }}
          style={{
            padding: '2px 8px',
            background: '#1e293b',
            color: '#e2e8f0',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          fechar
        </button>
      </div>

      {open && (
        <div style={{ overflow: 'auto', maxHeight: 'calc(60vh - 36px)', padding: '4px 12px' }}>
          {logs.length === 0 && (
            <div style={{ color: '#64748b', padding: 12 }}>
              Sem eventos. Aguardando erros...
            </div>
          )}
          {logs.map((l) => (
            <div
              key={l.id}
              style={{
                padding: '6px 0',
                borderBottom: '1px solid #1e293b',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              <div style={{ color: kindColor[l.kind] }}>
                <span style={{ color: '#64748b' }}>[{l.at}]</span> {l.kind}
              </div>
              <div>{l.message}</div>
              {l.stack && (
                <details style={{ marginTop: 4 }}>
                  <summary style={{ color: '#64748b', cursor: 'pointer' }}>stack</summary>
                  <pre style={{ margin: 0, color: '#94a3b8', fontSize: 10 }}>{l.stack}</pre>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
