import Background from "@/components/Background";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import MarketingHero from "@/components/marketing/MarketingHero";
import Benefits from "@/components/marketing/Benefits";
import PreviewShowcase from "@/components/marketing/PreviewShowcase";
import Testimonials from "@/components/marketing/Testimonials";
import FinalCta from "@/components/marketing/FinalCta";
import MarketingFooter from "@/components/marketing/MarketingFooter";

export default function LandingPage() {
  return (
    <div className="relative">
      <Background />
      <MarketingHeader />
      <main className="relative z-10">
        <MarketingHero />
        <Benefits />
        <PreviewShowcase />
        <Testimonials />
        <FinalCta />
      </main>
      <MarketingFooter />
    </div>
  );
}
