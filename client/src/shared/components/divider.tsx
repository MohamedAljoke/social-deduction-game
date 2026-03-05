export function Divider() {
  return (
    <div
      className="flex items-center my-6 text-xs"
      style={{ color: "#6b6b80" }}
    >
      <div className="flex-1 h-px" style={{ backgroundColor: "#2a2a4a" }} />
      <span className="px-4">or</span>
      <div className="flex-1 h-px" style={{ backgroundColor: "#2a2a4a" }} />
    </div>
  );
}
