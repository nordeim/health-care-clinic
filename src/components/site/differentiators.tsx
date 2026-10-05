import { differentiators } from "@/lib/content";

/* Differentiators — "What makes us different" band, four numbered pillars. */

export function Differentiators() {
  return (
    <section className="bg-background px-5 py-24 sm:px-8 lg:px-[60px] lg:py-32">
      <div className="mx-auto max-w-7xl lg:max-w-none">
        <p className="text-sm font-semibold">What makes us different</p>

        <div className="mt-5 grid items-end gap-8 lg:grid-cols-4 lg:gap-4">
          <h2 className="max-w-3xl text-5xl font-medium tracking-[-.04em] sm:text-6xl lg:col-span-2">
            <span className="block">
              Care that <span className="block sm:inline">sees the</span>
            </span>
            <span className="block">whole you.</span>
          </h2>
          <p className="section-subtitle leading-relaxed text-foreground lg:col-span-2 lg:col-start-3 lg:max-w-lg lg:self-center">
            Thoughtful, whole-person care designed around your unique needs,
            personal goals, daily routines, and every stage of life.
          </p>
        </div>

        <div className="mt-12 grid min-h-[220px] gap-x-4 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {differentiators.map((item, index) => (
            <article key={item.title}>
              <span className="mt-1 block text-4xl font-medium tracking-[-.04em]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-8 text-lg font-medium">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
