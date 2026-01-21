import { ArrowRightLeft } from "lucide-react";

interface Props {
  currentPinned: boolean;
  disabled?: boolean;
  onMove: (toPinned: boolean) => void;
}

export default function DocumentMoveButton({ currentPinned, disabled, onMove }: Props) {
  const label = currentPinned ? "Przenieś do dodatkowych" : "Dodaj do głównych";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onMove(!currentPinned)}
      className={
        "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold border transition " +
        (currentPinned
          ? "bg-white/5 border-white/10 text-white/75 hover:bg-white/10"
          : "bg-[#c8a04b]/12 border-[#c8a04b]/35 text-[#f3dfb0] hover:bg-[#c8a04b]/18") +
        (disabled ? " opacity-60 cursor-not-allowed" : "")
      }
      title={label}
    >
      <ArrowRightLeft className="w-4 h-4" />
      {label}
    </button>
  );
}
