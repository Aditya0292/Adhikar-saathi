import { AppShell } from '../components/layout/AppShell';
import LawyerSearch from '../components/lawyer/LawyerSearch';

export default function LawyerFinder() {
  // Mock data for UI testing
  const mockLawyers = [
    { id: '1', full_name: 'Anjali Sharma', specialisations: ['criminal', 'family'], city: 'Mumbai', state: 'MH', experience_years: 12, fee_per_hour_inr: 1500, offers_free_consultation: true, rating: 4.8, languages: ['English', 'Hindi', 'Marathi'] },
    { id: '2', full_name: 'Rajesh Kumar', specialisations: ['property', 'civil'], city: 'Delhi', state: 'DL', experience_years: 8, fee_per_hour_inr: 1000, offers_free_consultation: false, rating: 4.5, languages: ['English', 'Hindi'] },
    { id: '3', full_name: 'Priya Patel', specialisations: ['corporate', 'taxation'], city: 'Ahmedabad', state: 'GJ', experience_years: 15, fee_per_hour_inr: 2500, offers_free_consultation: true, rating: 4.9, languages: ['English', 'Gujarati', 'Hindi'] },
    { id: '4', full_name: 'Vikram Singh', specialisations: ['constitutional', 'criminal'], city: 'Lucknow', state: 'UP', experience_years: 20, fee_per_hour_inr: 3000, offers_free_consultation: false, rating: 4.7, languages: ['English', 'Hindi'] }
  ];

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-nyaya-text-dark">Find a Verified Advocate</h1>
          <p className="text-nyaya-muted mt-2 font-sans text-sm md:text-base">Connect with experienced legal professionals registered with the Bar Council of India.</p>
        </div>

        <LawyerSearch lawyers={mockLawyers} />
      </div>
    </AppShell>
  );
}
