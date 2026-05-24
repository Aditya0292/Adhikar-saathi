import { Scale } from 'lucide-react';

export default function TrustMarquee() {
  const partners = [
    "NALSA", "iJustice", "Nyaaya.org", "Indian Kanoon", "DLSA", "CHRI", "PUCL", "HAQ Centre"
  ];
  
  // Duplicate for seamless loop
  const marqueeItems = [...partners, ...partners, ...partners];

  return (
    <section className="bg-nyaya-dark border-t border-white/10 py-12 relative overflow-hidden">
      
      {/* Label */}
      <div className="text-center mb-8 relative z-10">
        <span className="text-xs text-nyaya-muted tracking-widest uppercase font-sans font-medium">
          Trusted by lawyers, NGOs & legal aid organizations across India
        </span>
      </div>

      {/* Marquee Container */}
      <div className="relative w-full overflow-hidden flex flex-col gap-6">
        
        {/* Gradient Edges */}
        <div className="absolute inset-y-0 left-0 w-[120px] bg-gradient-to-r from-nyaya-dark to-transparent z-10 pointer-events-none"></div>
        <div className="absolute inset-y-0 right-0 w-[120px] bg-gradient-to-l from-nyaya-dark to-transparent z-10 pointer-events-none"></div>

        {/* Row 1 (Scrolling Left) */}
        <div className="flex w-max animate-marquee hover:animate-marquee-pause">
          <div className="flex gap-12 items-center px-6">
            {marqueeItems.map((partner, idx) => (
              <div key={`row1-${idx}`} className="flex items-center gap-12 group cursor-pointer">
                <span className="font-mono text-xl uppercase tracking-wider text-nyaya-text/40 group-hover:text-nyaya-text transition-colors duration-500">
                  {partner}
                </span>
                <Scale size={20} className="text-nyaya-green-bright/40 group-hover:text-nyaya-green-bright transition-colors duration-500" />
              </div>
            ))}
          </div>
        </div>

        {/* Row 2 (Scrolling Right - using animation-direction: reverse) */}
        <div className="flex w-max animate-marquee hover:animate-marquee-pause" style={{ animationDirection: 'reverse' }}>
          <div className="flex gap-12 items-center px-6">
            {marqueeItems.map((partner, idx) => (
              <div key={`row2-${idx}`} className="flex items-center gap-12 group cursor-pointer">
                <span className="font-mono text-xl uppercase tracking-wider text-nyaya-text/40 group-hover:text-nyaya-text transition-colors duration-500">
                  {partner}
                </span>
                <Scale size={20} className="text-nyaya-green-bright/40 group-hover:text-nyaya-green-bright transition-colors duration-500" />
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
