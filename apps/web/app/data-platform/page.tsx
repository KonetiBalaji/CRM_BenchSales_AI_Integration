import { DEFAULT_TENANT_ID } from "../../lib/config";
export const dynamic = "force-dynamic";

import { getDataPlatformOverview } from "../../lib/api";
import { ErrorState } from "../../components/error-state";

function formatBytes(size: number) {
  if (size <= 0) {
    return "0 B";
  }
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  const value = size / Math.pow(1024, index);
  return `${value.toFixed(1)} ${units[index]}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

export default async function DataPlatformPage() {
  try {
    const overview = await getDataPlatformOverview(DEFAULT_TENANT_ID);
    const coveragePercent = Math.round(overview.ontology.coverageRatio * 100);

    return (
      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold">Data Platform & Ontology</h1>
          <p className="max-w-3xl text-sm text-slate-500">
            Monitor document ingestion health, normalized skill coverage, and deduplication signals that power matching
            accuracy.
          </p>
        </header>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Document Store</h2>
              <p className="text-sm text-slate-500">
                S3-backed resumes and requirement documents with automated PII review.
              </p>
            </div>
            <div className="flex gap-4 text-sm">
              <div className="rounded-lg border border-slate-200 px-3 py-2 text-right shadow-sm dark:border-slate-800">
                <div className="text-xs uppercase text-slate-500">Total Documents</div>
                <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">{overview.documents.total}</div>
              </div>
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-right text-rose-700 shadow-sm dark:border-rose-900/60 dark:bg-rose-900/20 dark:text-rose-200">
                <div className="text-xs uppercase">PII Flagged</div>
                <div className="text-lg font-semibold">{overview.documents.flagged}</div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
              <thead className="bg-slate-50 text-left uppercase tracking-wide text-slate-500 dark:bg-slate-900">
                <tr>
                  <th className="px-4 py-3">File</th>
                  <th className="px-4 py-3">Kind</th>
                  <th className="px-4 py-3">Linked To</th>
                  <th className="px-4 py-3">PII Status</th>
                  <th className="px-4 py-3">Uploaded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {overview.documents.recent.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 dark:text-slate-100">{doc.fileName}</div>
                      <div className="text-xs text-slate-500">{formatBytes(doc.sizeBytes)}</div>
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-600 dark:text-slate-300">{doc.kind.toLowerCase().replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {doc.consultant ? (
                        <span>
                          Consultant • {doc.consultant.firstName} {doc.consultant.lastName}
                        </span>
                      ) : doc.requirement ? (
                        <span>
                          Requirement • {doc.requirement.title}
                        </span>
                      ) : (
                        <span>Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          doc.metadata?.piiStatus === "FLAGGED"
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-200"
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200"
                        }`}
                      >
                        {doc.metadata?.piiStatus ?? "UNKNOWN"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(doc.createdAt)}</td>
                  </tr>
                ))}
                {overview.documents.recent.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-center text-sm text-slate-500" colSpan={5}>
                      No documents uploaded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <h2 className="text-xl font-semibold">Skill Ontology Coverage</h2>
            <p className="mt-1 text-sm text-slate-500">
              Active version: {overview.ontology.activeVersion?.version ?? "none"} · {overview.ontology.canonicalSkillCount} canonical
              skills, {overview.ontology.aliasCount} aliases.
            </p>
            <div className="mt-4 h-3 rounded-full bg-slate-100 dark:bg-slate-900">
              <div
                className="h-full rounded-full bg-brand"
                style={{ width: `${coveragePercent}%` }}
                aria-valuenow={coveragePercent}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Coverage vs. top 500 target: <span className="font-semibold">{coveragePercent}%</span>
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Deduplication Signals</h2>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                {overview.dedupe.pendingClusters} pending reviews
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Identity graph suggestions based on email, phone, and name hashes.
            </p>
            <div className="mt-4 space-y-3 text-sm">
              {overview.dedupe.duplicateCandidates.map((cluster) => (
                <div key={`${cluster.signature.type}-${cluster.signature.valueHash}`} className="rounded-lg border border-slate-200 px-3 py-3 dark:border-slate-800">
                  <div className="text-xs uppercase text-slate-500">
                    {cluster.signature.type.toLowerCase()} match • hash {cluster.signature.valueHash.slice(0, 8)}…
                  </div>
                  <ul className="mt-2 space-y-1">
                    {cluster.consultants.map((match) => (
                      <li key={match.consultantId} className="flex items-center justify-between">
                        <span className="text-slate-700 dark:text-slate-200">
                          {match.consultant.firstName} {match.consultant.lastName}
                        </span>
                        <span className="text-xs text-slate-400">{match.matchTypes.join(", ")}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {overview.dedupe.duplicateCandidates.length === 0 && (
                <p className="rounded-lg border border-slate-200 px-3 py-4 text-center text-slate-500 dark:border-slate-800">
                  No duplicate candidates detected.
                </p>
              )}
            </div>
          </div>
        </section>
      </main>
    );
  } catch (error) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12">
        <ErrorState
          title="Unable to load data platform overview"
          description="Confirm the API is running and that the data platform endpoints are reachable, then refresh the page."
        />
      </main>
    );
  }
}
