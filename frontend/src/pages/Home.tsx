
import Navbar from '../components/layout/Navbar';
import Hero from '../components/home/Hero';
import TrustMarquee from '../components/home/TrustMarquee';
import PlatformFeatures from '../components/home/PlatformFeatures';
import FeatureDeepDive from '../components/home/FeatureDeepDive';
import Testimonials from '../components/home/Testimonials';
import FinalCTA from '../components/home/FinalCTA';
import Footer from '../components/layout/Footer';

export default function Home() {
  return (
    <div className="min-h-screen bg-nyaya-dark flex flex-col">
      <Navbar />

      <main className="flex-1 flex flex-col">
        <Hero />
        <TrustMarquee />
        <PlatformFeatures />
        <FeatureDeepDive />
        <Testimonials />
        <FinalCTA />
      </main>

      <Footer />
    </div>
  );
}
