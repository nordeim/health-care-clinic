import { aboutListItems } from "@/lib/content";

/* About — "Comprehensive coverage options" band with the listening card. */

export function About() {
  return (
    <section
      id="about"
      className="bg-background px-5 py-24 sm:px-8 lg:py-32"
    >
      <div className="mx-auto max-w-6xl text-center">
        <h2 className="text-4xl font-medium tracking-[-.04em] sm:text-6xl">
          Comprehensive coverage options
        </h2>
        <p className="about-subtitle mx-auto mt-5 max-w-2xl leading-relaxed text-muted-foreground">
          More energy. More clarity. More confidence in your care. We help you
          build a healthier life around what matters to you.
        </p>

        <div className="mt-14 overflow-hidden rounded-[24px] text-left lg:grid lg:min-h-[328px] lg:grid-cols-2">
          <div className="relative z-10 bg-card p-8 sm:p-12">
            <p className="text-xl">Care that starts by listening.</p>
            <p className="mt-8 leading-relaxed text-muted-foreground">
              Green Grove Family Clinic provides thoughtful, relationship-based
              care for every generation. We take time to understand your
              concerns, explain your options clearly, and create practical care
              plans that support your health through every stage of life.
            </p>
          </div>
          <div className="rounded-b-[24px] bg-accent p-8 sm:p-12 lg:rounded-b-none lg:rounded-r-[24px]">
            <ul className="grid h-full grid-cols-2 content-center gap-x-4 gap-y-6 lg:gap-x-8 lg:gap-y-8">
              {aboutListItems.map((item, index) => (
                <li key={item} className="flex items-center gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[50%] bg-primary text-xs font-semibold text-primary-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="text-sm font-medium leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
