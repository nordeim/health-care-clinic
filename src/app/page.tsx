import { Header } from "@/components/site/header";
import { Hero } from "@/components/site/hero";
import { About } from "@/components/site/about";
import { Services } from "@/components/site/services";
import { Differentiators } from "@/components/site/differentiators";
import { Insurance } from "@/components/site/insurance";
import { Team } from "@/components/site/team";
import { Contact } from "@/components/site/contact";
import { Faq } from "@/components/site/faq";
import { Footer } from "@/components/site/footer";

/* Landing page — a single scroll narrative, ported section-for-section from
 * the reference app. Section ids (#top/#about/#services/#insurance/
 * #providers/#contact/#faq) match the reference's anchor contract. */

export default function Home() {
  return (
    <>
      <Header />
      <main className="bg-background">
        <Hero />
        <About />
        <Services />
        <Differentiators />
        <Insurance />
        <Team />
        <Contact />
        <Faq />
      </main>
      <Footer />
    </>
  );
}
