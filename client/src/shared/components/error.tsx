export function ErrorMessage({ message }: { message: string }) {
  return (
    <div
      className="px-3 py-3 rounded-lg mb-4 text-sm"
      style={{
        backgroundColor: "rgba(233, 69, 96, 0.1)",
        border: "1px solid rgba(233, 69, 96, 0.3)",
        color: "#e94560",
      }}
    >
      {message}
    </div>
  );
}
