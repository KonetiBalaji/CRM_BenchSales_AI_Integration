"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { ErrorState } from "./error-state";
import { getConsultants } from "../lib/api";
import { DEFAULT_TENANT_ID } from "../lib/config";
import type { Consultant } from "../lib/types";

function useConsultantQuery(search: string, initialData: Consultant[]) {
  return useQuery({
    queryKey: ["consultants", search],
    queryFn: () => getConsultants(DEFAULT_TENANT_ID, search),
    initialData,
    staleTime: 30_000
  });
}

export function ConsultantsView({ initialData }: { initialData: Consultant[] }) {
  const [search, setSearch] = useState("");
  const { data, isLoading, isError, error, refetch, isFetching } = useConsultantQuery(search, initialData);

  const consultants = data ?? [];
  const showLoading = (isLoading || isFetching) && consultants.length === 0;

  if (isError) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return (
      <ErrorState
        title="We could not fetch consultants"
        description={`${message}. Make sure the API is running and try again.`}
        action={
          <button
            className="rounded-lg border border-brand px-3 py-2 text-sm font-medium text-brand transition hover:bg-brand hover:text-white"
            type="button"
            onClick={() => void refetch()}
          >
            Retry
          </button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Consultant Bench</h1>
          <p className="text-sm text-slate-500">
            Filter by skill, availability, or name to find the best fit for open requirements.
          </p>
        </div>
        <input
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-slate-900"
          placeholder="Search consultants"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {showLoading ? (
        <div className="flex h-32 items-center justify-center text-slate-500">Loading consultants...</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 text-left font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-900">
              <tr>
                <th className="px-4 py-3">Consultant</th>
                <th className="px-4 py-3">Availability</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Skills</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {consultants.map((consultant) => (
                <tr key={consultant.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      {consultant.firstName} {consultant.lastName}
                    </div>
                    <div className="text-xs text-slate-500">{consultant.email ?? "-"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {consultant.availability.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{consultant.location ?? "Remote"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {consultant.skills.map(({ skill }) => (
                        <span key={skill.id} className="rounded-full bg-brand/10 px-2 py-1 text-xs text-brand">
                          {skill.name}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {consultants.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-sm text-slate-500" colSpan={4}>
                    No consultants found for the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
