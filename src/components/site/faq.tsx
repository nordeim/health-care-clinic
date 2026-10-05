import { faqs } from "@/lib/content";

/* FAQ — native <details>/<summary> accordions (exactly like the reference:
 * `group` + `group-open:rotate-45` plus icon, border-t rows). */

export function Faq() {
  return (
    <section
      id="faq"
      className="bg-background px-5 py-24 sm:px-8 lg:px-[60px] lg:py-32"
    >
      <div className="grid w-full gap-12 lg:grid-cols-[.75fr_1.25fr]">
        <div>
          <p className="text-sm font-semibold">FAQ</p>
          <h2 className="mt-5 font-medium tracking-[-.04em]">
            Good questions deserve clear answers.
          </h2>
          <p className="section-subtitle mt-6 leading-relaxed text-muted-foreground">
            Need more help? Call{" "}
            <a href="tel:+11234567890" className="font-semibold text-foreground">
              123-456-7890
            </a>
            .
          </p>
        </div>

        <div className="border-b border-foreground/20 lg:mt-14">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="group border-t border-foreground/20 py-7"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-xl font-medium">
                <span>{faq.question}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-6 w-6 shrink-0 transition-transform duration-200 group-open:rotate-45"
                  aria-hidden="true"
                >
                  <path d="M5 12h14" />
                  <path d="M12 5v14" />
                </svg>
              </summary>
              <p className="max-w-2xl pt-5 leading-relaxed text-muted-foreground">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
