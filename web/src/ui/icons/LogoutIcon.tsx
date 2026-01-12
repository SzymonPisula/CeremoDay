type LogoutIconProps = {
  size?: number;
  className?: string;
};

export default function LogoutIcon({ size = 18, className }: LogoutIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Drzwi – kształt C */}
      <path
        d="M6 4
           H13
           M6 4
           V20
           M6 20
           H13"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Strzałka w prawo */}
      <path
        d="M12 12h7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M16 8l4 4-4 4"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
