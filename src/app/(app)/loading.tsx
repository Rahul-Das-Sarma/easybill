export default function AppLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-40 rounded-md bg-muted" />
        <div className="h-4 w-64 rounded-md bg-muted" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-xl border border-border bg-muted/50"
          />
        ))}
      </div>
      <div className="h-72 rounded-xl border border-border bg-muted/40" />
    </div>
  );
}
