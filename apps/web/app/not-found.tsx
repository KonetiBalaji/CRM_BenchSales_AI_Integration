export default function NotFound() {
  return (
    <main className="mx-auto flex h-[60vh] max-w-3xl flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-3xl font-semibold">Page Not Found</h1>
      <p className="text-sm text-slate-500">
        The requested view is unavailable. Return to the dashboard or choose a section from the navigation menu.
      </p>
    </main>
  );
}