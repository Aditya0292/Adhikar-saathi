import { AppShell } from '../components/layout/AppShell';
import { FileText } from 'lucide-react';

export default function MyDocuments() {
  return (
    <AppShell>
      <div className="max-w-3xl">
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-nyaya-text-dark mb-2">My Documents</h1>
        <p className="text-nyaya-muted font-sans text-sm md:text-base mb-8">
          Upload and manage your legal documents, leases, and contracts.
        </p>
        <div className="bg-white rounded-2xl border border-black/8 p-8 shadow-sm text-center">
          <div className="w-16 h-16 bg-nyaya-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText size={24} className="text-nyaya-green" />
          </div>
          <h3 className="font-serif font-semibold text-lg text-nyaya-text-dark mb-2">Document Vault</h3>
          <p className="text-sm text-nyaya-muted max-w-sm mx-auto mb-6">
            Manage all your analyzed contracts and legal agreements in one secure vault. Detailed specifications will follow.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
