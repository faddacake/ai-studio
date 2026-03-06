export function Container({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        maxWidth: 1120,
        marginLeft: "auto",
        marginRight: "auto",
        paddingLeft: 20,
        paddingRight: 20,
      }}
    >
      {children}
    </div>
  );
}
