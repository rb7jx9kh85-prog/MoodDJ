import Background from "@/components/Background";
import CursorGlow from "@/components/marketing/CursorGlow";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import MarketingHero from "@/components/marketing/MarketingHero";
import MoodMarquee from "@/components/marketing/MoodMarquee";
import Benefits from "@/components/marketing/Benefits";
import PreviewShowcase from "@/components/marketing/PreviewShowcase";
import Testimonials from "@/components/marketing/Testimonials";
import FinalCta from "@/components/marketing/FinalCta";
import MarketingFooter from "@/components/marketing/MarketingFooter";

export default function LandingPage() {
  return (
    <div className="relative">
      <Background />
      <CursorGlow />
      <MarketingHeader />
      <main className="relative z-10">
        <MarketingHero />
        <MoodMarquee />
        <Benefits />
        <PreviewShowcase />
        <Testimonials />
        <FinalCta />
      </main>
      <MarketingFooter />
    </div>
  );
}
