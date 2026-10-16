export default function Message({ type = "info", children }) {
  if (!children) return null;
  return <p className={`message ${type}`}>{children}</p>;
}
