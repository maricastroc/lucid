import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Compass,
  Eye,
  EyeOff,
  Gauge,
  History,
  ListChecks,
  Minus,
  Moon,
  PenTool,
  Plus,
  Quote,
  Route,
  Search,
  ShieldAlert,
  SlidersHorizontal,
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
export const ChevronDownIcon = icon(ChevronDown, "ChevronDownIcon");
export const ChevronLeftIcon = icon(ChevronLeft, "ChevronLeftIcon");
export const ChevronRightIcon = icon(ChevronRight, "ChevronRightIcon");
export const CloseIcon = icon(X, "CloseIcon");
export const SunIcon = icon(Sun, "SunIcon");
export const MoonIcon = icon(Moon, "MoonIcon");
export const WandIcon = icon(Wand2, "WandIcon");
export const QuoteIcon = icon(Quote, "QuoteIcon");
export const ShieldAlertIcon = icon(ShieldAlert, "ShieldAlertIcon");
export const EyeIcon = icon(Eye, "EyeIcon");
export const EyeOffIcon = icon(EyeOff, "EyeOffIcon");
export const MinusIcon = icon(Minus, "MinusIcon");
export const PlusIcon = icon(Plus, "PlusIcon");
export const CompassIcon = icon(Compass, "CompassIcon");
export const ListChecksIcon = icon(ListChecks, "ListChecksIcon");
export const HistoryIcon = icon(History, "HistoryIcon");
export const GaugeIcon = icon(Gauge, "GaugeIcon");
export const SlidersIcon = icon(SlidersHorizontal, "SlidersIcon");
export const RouteIcon = icon(Route, "RouteIcon");
export const SearchIcon = icon(Search, "SearchIcon");
