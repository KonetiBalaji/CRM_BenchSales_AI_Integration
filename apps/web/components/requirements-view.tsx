"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { ErrorState } from "./error-state";
import { matchRequirement, submitMatchFeedback } from "../lib/api";
import { DEFAULT_TENANT_ID } from "../lib/config";
import type { MatchFeedbackOutcome, MatchResult, Requirement } from "../lib/types";

function formatPercentage(value: number | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "–";
  }
  const bounded = Math.max(0, Math.min(1, value));
  return `${Math.round(bounded * 100)}%`;
}

function describeLocationDelta(delta: MatchResult["explanation"]["deltas"]["location"]): string {
  const consultant = delta.consultant ?? "Unknown";
  const requirement = delta.requirement ?? "Unknown";
  switch (delta.status) {
    case "MATCH":
      return `Aligned (${consultant})`;
    case "REMOTE_OK":
      return `${consultant} available for remote-friendly role (${requirement})`;
    case "NEARBY":
      return `${consultant} is proximate to ${requirement}`;
    case "MISMATCH":
      return `${consultant} differs from ${requirement}`;
    default:
      return `${consultant} vs ${requirement}`;
  }
}

function describeRateDelta(delta: MatchResult["explanation"]["deltas"]["rate"]): string {
  if (delta.consultantRate == null) {
    return "Consultant rate missing";
  }
  if (delta.requirementMin == null && delta.requirementMax == null) {
    return `Rate $${delta.consultantRate.toFixed(0)} (no target)`;
  }
  const variance = typeof delta.delta === "number" ? `${Math.round(Math.abs(delta.delta) * 100)}%` : "–";
  if (delta.withinRange) {
    return `Within target band (±${variance})`;
  }
  const direction = delta.delta && delta.delta > 0 ? "above" : "below";
  return `${variance} ${direction} target`;
}

export function RequirementsView({ initialData }: { initialData: Requirement[] }) {
  const [matches, setMatches] = useState<MatchResult[] | null>(null);
  const [activeRequirement, setActiveRequirement] = useState<Requirement | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackState, setFeedbackState] = useState<Record<string, "submitted" | "submitting">>({});

  const matchMutation = useMutation({
    mutationFn: async (requirementId: string) => matchRequirement(DEFAULT_TENANT_ID, requirementId),
    onSuccess(data) {
      setErrorMessage(null);
      setMatches(data);
      setFeedbackState({});
      setFeedbackError(null);
    },
    onError(error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setMatches(null);
      setErrorMessage(`${message}. Make sure the API is running and try again.`);
    }
  });

  const feedbackMutation = useMutation({
    mutationFn: async ({ matchId, outcome }: { matchId: string; outcome: MatchFeedbackOutcome }) =>
      submitMatchFeedback(DEFAULT_TENANT_ID, matchId, { outcome }),
    onMutate(variables) {
      setFeedbackState((prev) => ({ ...prev, [variables.matchId]: "submitting" }));
    },
    onSuccess(_, variables) {
      setFeedbackState((prev) => ({ ...prev, [variables.matchId]: "submitted" }));
      setFeedbackError(null);
    },
    onError(error, variables) {
      const message = error instanceof Error ? error.message : "Unable to record feedback";
      setFeedbackError(message);
      setFeedbackState((prev) => {
        const next = { ...prev };
        delete next[variables.matchId];
        return next;
      });
    }
  });

  async function handleFeedback(matchId: string, outcome: MatchFeedbackOutcome) {
    if (feedbackState[matchId] === "submitted") {
      return;
    }
    await feedbackMutation.mutateAsync({ matchId, outcome });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Requirements Pipeline</h1>
        <p className="text-sm text-slate-500">
          Run explainable AI matching to identify the top consultants for each requirement.
        </p>
      </div>

      {initialData.length === 0 ? (
        <ErrorState
          title="No requirements available"
          description="Add requirements in the API or seed the database to start matching."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {initialData.map((requirement) => (
            <article
              key={requirement.id}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{requirement.title}</h2>
                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold uppercase text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
                    {requirement.status}
                  </span>
                </div>
                <p className="text-sm text-slate-500">
                  {requirement.clientName} - {requirement.location ?? "Remote"}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300">{requirement.description}</p>
                <div className="flex flex-wrap gap-2 pt-2">
                  {requirement.skills.map(({ skill }) => (
                    <span key={skill.id} className="rounded-full bg-brand/10 px-2 py-1 text-xs text-brand">
                      {skill.name}
                    </span>
                  ))}
                </div>
              </div>
              <button
                className="mt-4 inline-flex items-center justify-center rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={async () => {
                  setActiveRequirement(requirement);
                  setMatches(null);
                  setErrorMessage(null);
                  setFeedbackState({});
                  await matchMutation.mutateAsync(requirement.id);
                }}
                disabled={matchMutation.isPending && activeRequirement?.id === requirement.id}
              >
                {matchMutation.isPending && activeRequirement?.id === requirement.id ? "Generating matches..." : "Generate matches"}
              </button>
            </article>
          ))}
        </div>
      )}

      {errorMessage ? (
        <ErrorState title="Match generation failed" description={errorMessage} />
      ) : null}

      {feedbackError ? (
        <ErrorState title="Feedback failed" description={feedbackError} />
      ) : null}

      {matches && activeRequirement && !errorMessage ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <h3 className="text-lg font-semibold">Top matches for {activeRequirement.title}</h3>
          <p className="text-sm text-slate-500">
            Scores combine skill alignment, retrieval signals, learning-to-rank, and optional LLM reranking to create a transparent shortlist.
          </p>
          <div className="mt-4 space-y-3">
            {matches.map((match) => {
              const feedbackStatus = feedbackState[match.matchId];
              const highlights = match.explanation.highlights.slice(0, 3);
              const topFactors = match.explanation.topFactors.slice(0, 3);
              const locationInsight = describeLocationDelta(match.explanation.deltas.location);
              const rateInsight = describeRateDelta(match.explanation.deltas.rate);

              return (
                <div key={match.matchId} className="space-y-3 rounded-lg border border-slate-100 p-4 text-sm dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{match.consultantName}</div>
                      <div className="space-y-0.5 text-xs text-slate-500">
                        <div>
                          Final {formatPercentage(match.score)} • Skills {formatPercentage(match.skillScore)} • Availability {formatPercentage(match.availabilityScore)} • Retrieval {formatPercentage(match.signals.retrieval)}
                        </div>
                        <div>
                          LTR {formatPercentage(match.scores.ltr)} • Linear {formatPercentage(match.scores.linear)}
                          {typeof match.scores.llm === "number" ? ` • LLM ${formatPercentage(match.scores.llm)}` : ""}
                        </div>
                      </div>
                    </div>
                    <span className="rounded-full bg-brand/10 px-2 py-1 text-xs font-semibold text-brand">{formatPercentage(match.score)}</span>
                  </div>

                  <div className="text-xs text-slate-500">{match.explanation.summary}</div>

                  {topFactors.length > 0 ? (
                    <div className="flex flex-wrap gap-1 text-[11px] text-slate-500">
                      {topFactors.map((factor) => (
                        <span key={`${match.matchId}-${factor}`} className="rounded bg-slate-100 px-2 py-1 dark:bg-slate-800">
                          {factor}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {match.explanation.alignedSkills.length > 0 ? (
                    <div className="text-xs text-slate-500">Aligned skills: {match.explanation.alignedSkills.join(", ")}</div>
                  ) : null}

                  <div className="grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                    <div>Location: {locationInsight}</div>
                    <div>Rate: {rateInsight}</div>
                    <div>Availability: {match.explanation.deltas.availability.description}</div>
                    <div>Evidence: Semantic {formatPercentage(match.signals.vector)} • Lexical {formatPercentage(match.signals.lexical)}</div>
                  </div>

                  {highlights.length > 0 ? (
                    <ul className="space-y-1 text-xs text-slate-500">
                      {highlights.map((item, index) => (
                        <li key={`${match.matchId}-highlight-${index}`}>{item}</li>
                      ))}
                    </ul>
                  ) : null}

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void handleFeedback(match.matchId, "POSITIVE")}
                        disabled={feedbackStatus === "submitted" || feedbackStatus === "submitting"}
                        className="rounded-md border border-emerald-300 px-2 py-1 text-emerald-600 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Helpful
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleFeedback(match.matchId, "NEGATIVE")}
                        disabled={feedbackStatus === "submitted" || feedbackStatus === "submitting"}
                        className="rounded-md border border-rose-300 px-2 py-1 text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Not a fit
                      </button>
                    </div>
                    {feedbackStatus === "submitted" ? <span className="text-emerald-600">Thanks for the feedback!</span> : null}
                  </div>
                </div>
              );
            })}
            {matches.length === 0 && (
              <p className="text-sm text-slate-500">No strong matches yet. Try enriching consultant data.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
