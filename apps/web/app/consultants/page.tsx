import { ConsultantsView } from "../../components/consultants-view";
import { ErrorState } from "../../components/error-state";
import { getConsultants } from "../../lib/api";
import { DEFAULT_TENANT_ID } from "../../lib/config";
export const dynamic = "force-dynamic";


export default async function ConsultantsPage() {
  try {
    const consultants = await getConsultants(DEFAULT_TENANT_ID);
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <ConsultantsView initialData={consultants} />
      </main>
    );
  } catch (error) {
    console.error("Failed to load consultants", error);
    return (
      <main className="mx-auto max-w-4xl px-4 py-12">
        <ErrorState
          title="Unable to load consultants"
          description="Start the API server (pnpm dev:api) and refresh the page to retrieve consultant data."
        />
      </main>
    );
  }
}
