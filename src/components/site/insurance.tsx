import { insurancePartners } from "@/lib/content";

/* Insurance — accent band with the clinic photo card and partner marks. */

export function Insurance() {
  return (
    <section id="insurance" className="bg-accent px-5 py-24 sm:px-8 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="grid overflow-hidden rounded-[28px] lg:grid-cols-2">
          <div className="relative z-20 min-h-[420px]">
            <span className="inline-block relative h-full w-full">
              <img
                src="/media/insurance.webp"
                alt="A clinician warmly greeting a patient"
                className="inset-0 absolute h-full w-full object-cover"
              />
            </span>
          </div>

          <div className="relative z-10 rounded-b-[28px] bg-card p-8 sm:p-14 lg:rounded-b-none lg:rounded-r-[28px]">
            <p className="text-sm font-semibold">Insurance &amp; wellbeing</p>
            <h2 className="mt-6 text-5xl font-medium tracking-[-.04em] sm:text-6xl">
              Yes, we accept insurance.
            </h2>
            <p className="section-subtitle mt-6 max-w-lg leading-relaxed text-muted-foreground">
              Coverage should make thoughtful care feel simpler. We&rsquo;ll
              help confirm your benefits and explain your options clearly.
            </p>

            <div className="mt-10 grid grid-cols-2 gap-6">
              {insurancePartners.map((partner) => {
                const Icon = partner.icon;
                return (
                  <div
                    key={partner.name}
                    className="flex items-center gap-4 text-sm font-semibold"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[50%] bg-primary text-primary-foreground">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    {partner.name}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
