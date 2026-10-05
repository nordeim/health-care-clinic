import { clinicContact } from "@/lib/content";
import { AppointmentForm } from "./appointment-form";

/* Contact — "Get in touch" band: three info columns, the clinic photo and
 * the appointment request panel. */

export function Contact() {
  return (
    <section
      id="contact"
      className="scroll-mt-6 bg-background px-5 py-24 sm:px-8 lg:px-[60px] lg:py-32"
    >
      <div className="mx-auto max-w-7xl lg:max-w-none">
        <p className="text-sm font-semibold">Get in touch</p>

        <div className="mt-5 grid gap-6 md:grid-cols-3 md:items-start md:gap-4">
          <h2 className="max-w-4xl text-5xl font-medium tracking-[-.04em] sm:text-6xl md:col-span-2 lg:text-7xl">
            Contact us.
          </h2>
          <p className="section-subtitle leading-snug text-muted-foreground md:pt-1">
            No account needed. We&rsquo;ll confirm your visit by phone, quickly
            and with care.
          </p>
        </div>

        <div className="mt-16">
          <div className="grid gap-10 md:grid-cols-3 md:gap-4">
            <div className="pt-8">
              <h3 className="font-medium">Visit us</h3>
              <p className="mt-3 leading-relaxed text-muted-foreground">
                {clinicContact.addressLines[0]}
                <br />
                {clinicContact.addressLines[1]}
              </p>
            </div>
            <div className="pt-8">
              <h3 className="font-medium">Email us</h3>
              <a
                href={`mailto:${clinicContact.email}`}
                className="mt-3 block text-muted-foreground"
              >
                {clinicContact.email}
              </a>
            </div>
            <div className="pt-8">
              <h3 className="font-medium">Call us</h3>
              <a
                href={clinicContact.phoneHref}
                className="mt-3 block text-muted-foreground"
              >
                {clinicContact.phone}
              </a>
            </div>
          </div>

          <div className="mt-16 grid overflow-hidden rounded-[28px] lg:grid-cols-2">
            <div className="relative z-20 min-h-[420px] lg:min-h-[560px]">
              <span className="inline-block relative h-full w-full">
                <img
                  src="/media/contact.webp"
                  alt="The Green Grove Family Clinic care team at the front desk"
                  className="inset-0 absolute h-full w-full object-cover"
                />
              </span>
            </div>

            <div className="relative z-10 [--panel-x:0%] [--panel-y:-100%] [&>div]:h-full [&>div]:rounded-none lg:[--panel-x:-100%] lg:[--panel-y:0px]">
              <div className="rounded-[24px] bg-provider-panel p-7 sm:p-10">
                <p className="text-sm font-semibold">A calmer first step</p>
                <h3 className="mt-4 text-3xl font-medium tracking-[-.03em] sm:text-4xl">
                  Request an appointment
                </h3>
                <AppointmentForm />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
