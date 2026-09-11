/**
 * Marca do CreatorBox.
 * O quadrado roxo com a letra B é um placeholder: quando os arquivos
 * definitivos do logo existirem, basta trocar o conteúdo de <LogoMark />
 * por <img src="/logo.svg" ... /> — o resto do app continua igual.
 */
export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/40 ${className}`}
    >
      <span className="font-display text-sm font-bold text-primary">B</span>
    </span>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark />
      <span className="font-display text-lg font-semibold tracking-tight">
        Creator<span className="text-primary">Box</span>
      </span>
    </span>
  );
}
