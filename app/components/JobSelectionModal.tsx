'use client';

interface Job {
  _id: string;
  title: string;
  company: string;
  city: string;
}

interface JobSelectionModalProps {
  isOpen: boolean;
  jobs: Job[];
  onSelect: (jobId: string) => void;
  onClose: () => void;
  candidateName?: string;
}

export default function JobSelectionModal({
  isOpen,
  jobs,
  onSelect,
  onClose,
  candidateName,
}: JobSelectionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Select a Job
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {candidateName && (
            <p className="text-gray-600 mb-4">
              Select which job to link when contacting <strong>{candidateName}</strong>:
            </p>
          )}

          <div className="space-y-3">
            {jobs.map((job) => (
              <button
                key={job._id}
                onClick={() => onSelect(job._id)}
                className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <div className="font-semibold text-gray-900">{job.title}</div>
                <div className="text-sm text-gray-600 mt-1">
                  {job.company} • {job.city}
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

