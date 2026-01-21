import { Star } from "lucide-react";

interface Props {
  pinned: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export default function DocumentPinButton({ pinned, onToggle, disabled }: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      className={
        "inline-flex items-center gap-2 rounded-lg px-3 py-1 text-xs border transition " +
        (pinned
          ? "bg-[#c8a04b]/15 border-[#c8a04b]/40 text-white hover:bg-[#c8a04b]/20"
          : "bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10") +
        (disabled ? " opacity-60 cursor-not-allowed" : "")
      }
      title={pinned ? "Ukryj z głównych (przenieś do Dodatkowych)" : "Dodaj do głównych"}
    >
      <Star className={"w-4 h-4 " + (pinned ? "text-[#d7b45a]" : "text-white/50")} />
      {pinned ? "Ukryj" : "Do głównych"}
    </button>
  );
}
