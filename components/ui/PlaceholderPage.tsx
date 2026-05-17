interface PlaceholderPageProps {
  title: string;
  description: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 p-4">
      <section className="glass-card p-5">
        <h1 className="font-heading text-2xl font-semibold text-white">{title}</h1>
        <p className="mt-2 text-sm text-white/75">{description}</p>
      </section>
    </main>
  );
}
