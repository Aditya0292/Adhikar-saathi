import { useAuthStore } from '../../stores/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function LawyerPendingPage() {
  const { lawyer, isLoading, signOut } = useAuthStore();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!isLoading && lawyer?.is_verified) {
      navigate('/lawyer/dashboard');
    }
  }, [lawyer, isLoading, navigate]);

  if (isLoading) return <div className="text-center p-10">Loading status...</div>;

  const isRejected = lawyer?.verification_status === 'rejected';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-200 text-center">
          
          {isRejected ? (
            <>
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <span className="text-red-600 text-xl">⚠️</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-2">Application Rejected</h2>
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded mb-4 text-left">
                <strong>Reason:</strong> {lawyer?.rejection_reason}
              </div>
              <p className="text-sm text-slate-500 mb-6">
                Please review the feedback and submit the correct documents to proceed.
              </p>
              <button onClick={() => navigate('/auth/lawyer/register?step=2')} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-slate-900 hover:bg-slate-800">
                Re-submit Documents
              </button>
            </>
          ) : (
            <>
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                <span className="text-blue-600 text-xl">⏳</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-2">Verification Pending</h2>
              <div className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold mb-4 capitalize">
                Status: {lawyer?.verification_status?.replace('_', ' ')}
              </div>
              <p className="text-sm text-slate-600 mb-6">
                Your documents have been received and are currently under review by our administration team. 
                This process typically takes 24-48 hours.
              </p>
              <p className="text-xs text-slate-400 mb-6">
                You will receive an email notification once your profile is approved.
              </p>
            </>
          )}
          
          <button onClick={signOut} className="mt-4 text-sm text-slate-500 hover:text-slate-900">
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
