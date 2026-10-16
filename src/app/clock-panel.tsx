"use client";

import { useEffect, useState, useTransition } from "react";
import { clockIn, clockOut } from "./actions";
import { formatHours } from "@/lib/hours";
import type { FormState } from "@/app/prijava/actions";

type Props = {
  /** Početak otvorenog dolaska (ISO) ili null. */
  openStart: string | null;
  openStartLabel: string | null;
  /** Zbroj sati već zatvorenih današnjih zapisa. */
  closedHours: number;
};

export function ClockPanel({ openStart, openStartLabel, closedHours }: Props) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<FormState>();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!openStart) return;
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, [openStart]);

  const running = openStart ? Math.max(0, now - new Date(openStart).getTime()) / 3_600_000 : 0;
  const total = closedHours + running;

  function run(action: () => Promise<FormState>) {
    startTransition(async () => setResult(await action()));
  }

  return (
    <section className="card flex flex-col items-center gap-4 py-8 text-center">
      <p className="text-sm text-neutral-500">
        {openStart ? `Na poslu si od ${openStartLabel}` : "Trenutno nisi prijavljen na posao"}
      </p>
      <p className="font-mono text-5xl font-semibold tabular-nums">{formatHours(total)}</p>
      <p className="-mt-3 text-xs text-neutral-500">odrađeno danas</p>

      {openStart ? (
        <button
          onClick={() => run(clockOut)}
          disabled={pending}
          className="w-full max-w-xs rounded-xl bg-neutral-900 px-6 py-5 text-lg font-semibold text-white transition hover:bg-neutral-700 disabled:opacity-60"
        >
          {pending ? "Spremam…" : "Odlazim"}
        </button>
      ) : (
        <button
          onClick={() => run(clockIn)}
          disabled={pending}
          className="w-full max-w-xs rounded-xl bg-accent px-6 py-5 text-lg font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
        >
          {pending ? "Spremam…" : "Došao sam"}
        </button>
      )}

      {result?.error && <p className="text-sm text-red-600">{result.error}</p>}
      {result?.success && <p className="text-sm text-green-700">{result.success}</p>}
    </section>
  );
}
