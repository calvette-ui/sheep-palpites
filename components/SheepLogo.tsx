export default function SheepLogo({ large = false }: { large?: boolean }) {
  return <div className={`sheep-logo ${large ? "large" : ""}`}>
    <svg viewBox="0 0 120 120" role="img" aria-label="Carneiro com óculos nerd">
      <g stroke="#203022" strokeWidth="4" strokeLinejoin="round">
        <path fill="#c8ed8d" d="M27 45C8 28 20 5 38 20 44 0 72 0 80 20c20-15 38 5 23 26l-8 15H24z"/>
        <path fill="#f4f5e9" d="M27 48c0-22 14-34 33-34s34 12 34 34v30c0 22-14 33-34 33S27 100 27 78z"/>
        <path fill="#f0c5a5" d="M26 54C8 42 4 65 22 73M94 54c18-12 22 11 4 19"/>
        <path fill="none" strokeWidth="7" d="M30 65c0-14 8-20 19-20s17 7 17 21H42c-8 0-12-1-12-1zM65 66c0-14 7-21 18-21s17 6 17 20c0 0-4 1-12 1H65zM65 62h-1"/>
        <path fill="#203022" d="M42 60h7v6h-7zM76 60h7v6h-7z"/>
        <path fill="#dc907d" d="M53 83c4-7 10-7 14 0-2 9-12 9-14 0z"/>
        <path fill="none" d="M46 96c9 6 20 6 29 0"/>
      </g>
    </svg>
  </div>;
}
