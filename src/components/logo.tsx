/**
 * Marca do CreatorBox.
 * A imagem é sempre exibida com a proporção original (object-contain),
 * em tamanhos pré-definidos por contexto.
 */
const tamanhos = {
  xs: "size-6",
  sm: "size-7",
  md: "size-9",
  lg: "size-12",
} as const;

export type LogoSize = keyof typeof tamanhos;

export function LogoMark({
  size = "sm",
  className = "",
}: {
  size?: LogoSize;
  className?: string;
}) {
  return (
    <img
      src="/logo-mark.png"
      alt=""
      aria-hidden
      width={129}
      height={127}
      className={`block shrink-0 object-contain ${tamanhos[size]} ${className}`}
    />
  );
}

export function Logo({
  size = "sm",
  showName = true,
  className = "",
}: {
  size?: LogoSize;
  showName?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      {showName && (
        <span
          className={`font-display font-semibold tracking-tight ${
            size === "lg" ? "text-2xl" : size === "md" ? "text-xl" : "text-lg"
          }`}
        >
          Creator<span className="text-primary">Box</span>
        </span>
      )}
      <span className="sr-only">CreatorBox</span>
    </span>
  );
}
