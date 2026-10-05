import { doctors } from "@/lib/content";

/* Team — gradient band with the three physician cards (photo + quote panel). */

export function Team() {
  return (
    <section
      id="providers"
      className="bg-[linear-gradient(to_bottom,var(--service-gradient-top),var(--service-gradient-middle),var(--service-gradient-bottom))] px-5 py-24 sm:px-8 lg:py-32"
    >
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-semibold">Our team</p>

        <div className="mt-5 grid gap-5 md:grid-cols-2 md:items-end lg:grid-cols-3">
          <h2 className="max-w-3xl text-5xl font-medium tracking-[-.04em] sm:text-6xl lg:col-span-2">
            The people behind your care.
          </h2>
          <p className="section-subtitle leading-relaxed text-foreground">
            Experienced clinicians who lead with attention, clarity, and
            humanity.
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {doctors.map((doctor) => (
            <article
              key={doctor.name}
              className="grid aspect-[5/8] grid-rows-[2fr_1fr] overflow-hidden rounded-[24px] bg-accent"
            >
              <div className="h-full overflow-hidden">
                <span
                  className={`inline-block relative h-full w-full ${doctor.imageClassName}`}
                >
                  <img
                    src={doctor.image}
                    alt={`Portrait of ${doctor.name}, ${doctor.specialty}`}
                    className="inset-0 absolute h-full w-full object-cover"
                  />
                </span>
              </div>
              <div className="flex flex-col bg-provider-panel p-5 md:p-3 lg:p-5">
                <blockquote className="text-sm leading-relaxed md:text-xs lg:text-sm">
                  &ldquo;{doctor.quote}&rdquo;
                </blockquote>
                <h3 className="mt-auto pt-5 font-semibold md:pt-3 lg:pt-5">
                  {doctor.name}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground md:text-xs lg:text-sm">
                  {doctor.specialty}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
