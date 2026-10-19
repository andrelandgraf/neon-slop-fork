export function SettingsSection({
  id,
  title,
  description,
  scope,
  children,
}: {
  id?: string;
  title: string;
  description?: React.ReactNode;
  scope?: "Applies to all branches";
  children?: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6 space-y-3">
      <div>
        <h2 className="font-semibold text-lg">{title}</h2>
        {scope && <div className="text-muted-foreground text-xs">{scope}</div>}
        {description && <p className="mt-1 text-sm">{description}</p>}
      </div>
      {children}
    </section>
  );
}
