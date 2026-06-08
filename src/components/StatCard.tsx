export function StatCard({
  label,
  value,
  detail
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-white p-4 shadow-soft">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-normal text-ink">{value}</p>
      <p className="mt-1 text-sm text-muted">{detail}</p>
    </div>
  );
}
