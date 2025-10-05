import { RequirementsView } from "../../components/requirements-view";
import { ErrorState } from "../../components/error-state";
import { getRequirements } from "../../lib/api";
import { DEFAULT_TENANT_ID } from "../../lib/config";
export const dynamic = "force-dynamic";


export default async function RequirementsPage() {
  try {
    const requirements = await getRequirements(DEFAULT_TENANT_ID);
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <RequirementsView initialData={requirements} />
      </main>
    );
  } catch (error) {
    console.error("Failed to load requirements", error);
    return (
      <main className="mx-auto max-w-4xl px-4 py-12">
        <ErrorState
          title="Unable to load requirements"
          description="Start the API server (pnpm dev:api) and refresh to view the requirements pipeline."
        />
      </main>
    );
  }
}
