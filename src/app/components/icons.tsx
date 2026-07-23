// Todos os glifos vêm do lucide-react — nada é desenhado à mão.
// Este barril só reexporta os ícones do lucide com os nomes usados no app
// e aplica dois padrões da identidade: stroke mais fino e aria-hidden
// (decorativos por padrão; a semântica vem do botão/rótulo que os envolve).
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Moon,
  PenTool,
  Quote,
  Sun,
  Wand2,
  X,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";

function icon(Glyph: LucideIcon, displayName: string) {
  const Wrapped = (props: LucideProps) => <Glyph aria-hidden strokeWidth={1.75} {...props} />;
  Wrapped.displayName = displayName;
  return Wrapped;
}

export const CheckIcon = icon(Check, "CheckIcon");
export const PenNibIcon = icon(PenTool, "PenNibIcon");
export const ArrowRightIcon = icon(ArrowRight, "ArrowRightIcon");
export const ArrowLeftIcon = icon(ArrowLeft, "ArrowLeftIcon");
export const ArrowDownIcon = icon(ArrowDown, "ArrowDownIcon");
export const ChevronLeftIcon = icon(ChevronLeft, "ChevronLeftIcon");
export const ChevronRightIcon = icon(ChevronRight, "ChevronRightIcon");
export const CloseIcon = icon(X, "CloseIcon");
export const SunIcon = icon(Sun, "SunIcon");
export const MoonIcon = icon(Moon, "MoonIcon");
export const WandIcon = icon(Wand2, "WandIcon");
export const QuoteIcon = icon(Quote, "QuoteIcon");
