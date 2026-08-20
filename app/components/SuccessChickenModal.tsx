type SuccessChickenModalProps = {
  open: boolean;
  title: string;
  subtitle?: string;
};

export default function SuccessChickenModal({
  open,
  title,
  subtitle = 'Redirecting to your dashboard...',
}: SuccessChickenModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <div className="mb-4 flex justify-center items-center" style={{ minHeight: '200px' }}>
          <img
            src="/success-chicken.gif"
            alt="Success"
            className="max-w-xs w-auto h-auto"
            style={{ maxHeight: '300px', display: 'block', objectFit: 'contain' }}
          />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{title}</h2>
        {subtitle ? <p className="text-gray-600 mb-4">{subtitle}</p> : null}
      </div>
    </div>
  );
}
