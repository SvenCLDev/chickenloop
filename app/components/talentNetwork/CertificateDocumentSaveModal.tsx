type CertificateDocumentSaveModalProps = {
  open: boolean;
  certificateLabels: string[];
  onGoBack: () => void;
  onSaveSelfReported: () => void;
};

export default function CertificateDocumentSaveModal({
  open,
  certificateLabels,
  onGoBack,
  onSaveSelfReported,
}: CertificateDocumentSaveModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className="bg-white rounded-lg shadow-lg p-6 md:p-8 max-w-lg w-full"
        role="dialog"
        aria-labelledby="certificate-save-modal-title"
        aria-modal="true"
      >
        <h2 id="certificate-save-modal-title" className="text-xl font-bold text-gray-900 mb-3">
          Upload documents to verify your certificates?
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Chickenloop can only verify qualifications when you upload a photo or PDF of your
          credential. Without a document, the items below will stay self-reported on your profile.
        </p>
        <ul className="mb-4 space-y-2">
          {certificateLabels.map((label) => (
            <li
              key={label}
              className="text-sm text-gray-800 bg-amber-50 border border-amber-100 rounded-md px-3 py-2"
            >
              {label}
            </li>
          ))}
        </ul>
        <p className="text-sm text-gray-500 mb-6">
          You can upload documents later from Edit Profile.
        </p>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button
            type="button"
            onClick={onSaveSelfReported}
            className="px-4 py-2 rounded-md text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200"
          >
            Save as self-reported
          </button>
          <button
            type="button"
            onClick={onGoBack}
            className="px-4 py-2 rounded-md text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700"
          >
            Go back and upload
          </button>
        </div>
      </div>
    </div>
  );
}
