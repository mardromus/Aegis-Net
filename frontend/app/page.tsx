import { Hero } from "@/components/landing/Hero";
import { LiveStats } from "@/components/landing/LiveStats";
import { Architecture } from "@/components/landing/Architecture";
import { CapabilityShowcase } from "@/components/landing/CapabilityShowcase";
import { Footer } from "@/components/shell/Footer";

export default function HomePage() {
  return (
    <>
      <Hero />
      <LiveStats />
      <Architecture />
      <CapabilityShowcase />
      <Footer />
    </>
  );
}
