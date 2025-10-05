import Link from "next/link";

import { ErrorState } from "../components/error-state";
import { getAnalyticsSummary } from "../lib/api";
import { DEFAULT_TENANT_ID } from "../lib/config";

export const dynamic = "force-dynamic";

async function SummaryCards() {
  try {
    const summary = await getAnalyticsSummary(DEFAULT_TENANT_ID);

    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-sm text-slate-500">Consultants</p>
          <p className="mt-2 text-3xl font-semibold">{summary.consultantCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-sm text-slate-500">Open Requirements</p>
          <p className="mt-2 text-3xl font-semibold">{summary.openRequirements}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-sm text-slate-500">Active Submissions</p>
          <p className="mt-2 text-3xl font-semibold">{summary.activeSubmissions}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-sm text-slate-500">Match Pipeline</p>
          <div className="mt-2 space-y-1 text-sm">
            {Object.entries(summary.matchCounts).map(([status, count]) => (
              <div key={status} className="flex justify-between">
                <span className="capitalize text-slate-500">{status.toLowerCase()}</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Failed to load analytics summary", error);
    return (
      <ErrorState
        title="Unable to load analytics summary"
        description="Start the API server (pnpm dev:api) and refresh the page to see live data."
      />
    );
  }
}

export default async function Page() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-semibold">BenchCRM Overview</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Manage consultants, align requirements, and let the AI matching engine accelerate your bench sales workflow.
        </p>
      </div>
      <SummaryCards />
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/consultants"
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-brand hover:shadow-lg dark:border-slate-800 dark:bg-slate-950"
        >
          <h2 className="text-xl font-semibold">Consultant Bench</h2>
          <p className="mt-2 text-sm text-slate-500">
            Review skills, availability, and readiness for client submissions.
          </p>
        </Link>
        <Link
          href="/requirements"
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-brand hover:shadow-lg dark:border-slate-800 dark:bg-slate-950"
        >
          <h2 className="text-xl font-semibold">Active Requirements</h2>
          <p className="mt-2 text-sm text-slate-500">
            Track client needs, ingestion history, and matching progress.
          </p>
        </Link>
      </div>
    </main>
  );
}
