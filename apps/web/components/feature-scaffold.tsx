type FeatureScaffoldProps = {
  title: string; // Balaji Koneti: feature title to show in header
  description?: string; // Balaji Koneti: optional short description
};

// Balaji Koneti: Reusable scaffold to quickly create placeholder feature pages
export function FeatureScaffold({ title, description }: FeatureScaffoldProps) {
  return (
    <div className="space-y-4">{/* Balaji Koneti: page wrapper */}
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>{/* Balaji Koneti: heading */}
        {description ? (
          <p className="mt-2 max-w-2xl text-sm text-slate-500">{description}</p>
        ) : null}
      </div>

      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-slate-500 dark:border-slate-800 dark:bg-slate-950">{/* Balaji Koneti: placeholder panel */}
        <p className="text-sm">Design coming soon. Connect this screen to API endpoints as needed.</p>
      </div>
    </div>
  );
}



