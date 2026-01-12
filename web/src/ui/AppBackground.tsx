import { cn } from "../theme/helpers";

type Props = {
  className?: string;
};

/**
 * Szlachetne tło: łagodne przejścia (bez kółek),
 * delikatna biała mgiełka + złoty akcent.
 * Zrobione warstwowo, bez obrazków.
 */
export default function AppBackground({ className }: Props) {
  return (
    <div className={cn("fixed inset-0 -z-50 overflow-hidden", className)}>
      {/* Warstwa bazowa - głęboka zieleń */}
      <div className="absolute inset-0 bg-[#061612]" />

      {/* Łagodne przejścia (bez okręgów) */}
      <div
        className="absolute inset-0 opacity-100"
        style={{
          backgroundImage: `
            radial-gradient(1200px 700px at 10% 10%, rgba(200,160,75,0.10), transparent 60%),
            radial-gradient(1000px 650px at 90% 25%, rgba(255,255,255,0.06), transparent 62%),
            radial-gradient(900px 600px at 50% 95%, rgba(16,185,129,0.10), transparent 60%),
            linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.00) 28%, rgba(0,0,0,0.10) 100%)
          `,
        }}
      />

      {/* Bardzo subtelna "mgiełka" (szlachetność, mniej płasko) */}
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.00) 35%, rgba(200,160,75,0.03) 70%, rgba(0,0,0,0.00))",
        }}
      />

      {/* Mikro-ziarno (daje premium, mniej “plastikowo”) */}
      <div
        className="absolute inset-0 opacity-[0.07] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)' opacity='.35'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Winieta – krawędzie ciemniejsze, środek czystszy */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/35" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.35)_72%,rgba(0,0,0,0.65)_100%)]" />
    </div>
  );
}
