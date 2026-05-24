import { AppShell } from '../components/layout/AppShell';
import { Clock } from 'lucide-react';

export default function QueryHistory() {
  return (
    <AppShell>
      <div className="max-w-3xl">
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-nyaya-text-dark mb-2">Query History</h1>
        <p className="text-nyaya-muted font-sans text-sm md:text-base mb-8">
          Review your past consultations and legal queries.
        </p>
        <div className="bg-white rounded-2xl border border-black/8 p-8 shadow-sm text-center">
          <div className="w-16 h-16 bg-nyaya-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock size={24} className="text-nyaya-green" />
          </div>
          <h3 className="font-serif font-semibold text-lg text-nyaya-text-dark mb-2">History Log</h3>
          <p className="text-sm text-nyaya-muted max-w-sm mx-auto mb-6">
            A record of your previous questions and answers will appear here. Detailed specifications will follow.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
