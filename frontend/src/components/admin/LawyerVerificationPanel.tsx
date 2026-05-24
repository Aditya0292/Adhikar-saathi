import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useAuthStore } from '../../stores/useAuthStore';

interface PendingLawyer {
  id: string;
  full_name: string;
  bar_enrollment_number: string;
  state_bar_council: string;
  city: string;
  enrollment_certificate_url?: string;
  certificate_of_practice_url?: string;
  government_id_url?: string;
}

export default function LawyerVerificationPanel() {
  const [lawyers, setLawyers] = useState<PendingLawyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectionModal, setRejectionModal] = useState<{ isOpen: boolean; lawyerId: string | null }>({ isOpen: false, lawyerId: null });
  const [rejectionReason, setRejectionReason] = useState('');
  const { role } = useAuthStore();

  useEffect(() => {
    if (role === 'admin') fetchPending();
  }, [role]);

  const fetchPending = async () => {
    try {
      const data = await api.get('/api/v1/admin/lawyers/pending');
      setLawyers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await api.patch(`/api/v1/admin/lawyers/${id}/verify`, { action: 'approve' });
      setLawyers(prev => prev.filter(l => l.id !== id));
    } catch (e) {
      alert('Failed to approve');
    }
  };

  const handleRejectSubmit = async () => {
    if (rejectionReason.length < 10) {
      alert("Reason must be at least 10 characters");
      return;
    }
    try {
      await api.patch(`/api/v1/admin/lawyers/${rejectionModal.lawyerId}/verify`, { 
        action: 'reject', 
        rejection_reason: rejectionReason 
      });
      setLawyers(prev => prev.filter(l => l.id !== rejectionModal.lawyerId));
      setRejectionModal({ isOpen: false, lawyerId: null });
      setRejectionReason('');
    } catch (e) {
      alert('Failed to reject');
    }
  };

  if (role !== 'admin') return <div className="p-10 text-center text-red-600">Access Denied. Admins only.</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Pending Lawyer Verifications</h1>
      
      {loading ? (
        <div>Loading pending applications...</div>
      ) : lawyers.length === 0 ? (
        <div className="p-8 bg-slate-50 border rounded-lg text-center text-slate-500">
          No pending lawyers to verify.
        </div>
      ) : (
        <div className="space-y-6">
          {lawyers.map(lawyer => (
            <div key={lawyer.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 justify-between items-start">
              
              <div className="flex-1 space-y-2">
                <h3 className="text-xl font-bold text-slate-900">{lawyer.full_name}</h3>
                <div className="text-sm text-slate-600 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <p><span className="font-semibold text-slate-900">Enrollment No:</span> {lawyer.bar_enrollment_number}</p>
                  <p><span className="font-semibold text-slate-900">Bar Council:</span> {lawyer.state_bar_council}</p>
                  <p><span className="font-semibold text-slate-900">City:</span> {lawyer.city}</p>
                </div>
              </div>

              <div className="flex flex-col gap-2 w-full md:w-auto">
                <h4 className="text-sm font-semibold text-slate-900 border-b pb-1">Documents</h4>
                {lawyer.enrollment_certificate_url && (
                  <a href={lawyer.enrollment_certificate_url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline px-3 py-1.5 bg-blue-50 rounded">
                    📄 View Enrollment Certificate
                  </a>
                )}
                {lawyer.certificate_of_practice_url && (
                  <a href={lawyer.certificate_of_practice_url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline px-3 py-1.5 bg-blue-50 rounded">
                    📄 View COP (AIBE)
                  </a>
                )}
                {lawyer.government_id_url && (
                  <a href={lawyer.government_id_url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline px-3 py-1.5 bg-blue-50 rounded">
                    🛂 View Government ID
                  </a>
                )}
              </div>

              <div className="flex flex-col sm:flex-row md:flex-col gap-3 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 mt-4 md:mt-0">
                <button onClick={() => handleApprove(lawyer.id)} className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md shadow-sm w-full">
                  ✅ Approve
                </button>
                <button onClick={() => setRejectionModal({ isOpen: true, lawyerId: lawyer.id })} className="px-6 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-medium rounded-md w-full">
                  ❌ Reject
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Rejection Modal */}
      {rejectionModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Reject Application</h3>
            <p className="text-sm text-slate-600 mb-4">Provide a clear reason for rejection. This will be emailed to the lawyer.</p>
            <textarea 
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder="e.g. Enrollment certificate is blurry, please re-upload a clear copy."
              className="w-full border border-slate-300 rounded p-3 h-32 mb-4 focus:ring-red-500 focus:border-red-500 text-sm"
            ></textarea>
            <div className="flex justify-end gap-3">
              <button onClick={() => setRejectionModal({ isOpen: false, lawyerId: null })} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancel</button>
              <button onClick={handleRejectSubmit} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Submit Rejection</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
