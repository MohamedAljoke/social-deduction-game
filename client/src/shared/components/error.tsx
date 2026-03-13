export function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="px-3 py-3 rounded-lg mb-4 text-sm bg-danger/10 border border-danger/30 text-danger">
      {message}
    </div>
  );
}
