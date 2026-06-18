"use client";

export default function AnnouncementBar() {
  const messages = [
    "NORTH DOWN SOFTBALL CLUB - ESTABLISHED. COMPETITIVE. AMBITIOUS.",
    "ADULT CO-ED SOFTBALL IN BANGOR - ALL ABILITIES WELCOME",
    "NEW PLAYERS WELCOME - NO EXPERIENCE NEEDED",
    "WOMEN'S SOFTBALL IN NORTH DOWN - NEW PLAYERS WANTED",
    "TRY SOFTBALL IN BANGOR - TRAINING AT WARD PARK",
    "JOIN NORTH DOWN SOFTBALL CLUB - BANGOR, NORTHERN IRELAND",
    "LOOKING FOR A SPORTS CLUB IN NORTH DOWN? PLAY SOFTBALL",
    "TRAINING MONDAYS AND THURSDAYS 6:30PM AND SUNDAYS 2PM - WARD PARK, BANGOR",
    "HOME OF THE BUCCANEERS, BARRACUDAS, SLUGGERS, NIGHTMARES AND STALLIONS",
    "SIGN UP TODAY - PLAY THIS WEEK",
  ];

  const repeated = [...messages, ...messages];

  return (
    <div className="relative overflow-hidden border-b border-teal-300 bg-teal-400 text-[#262626]">
      <div className="whitespace-nowrap py-2 text-sm font-semibold tracking-wide animate-marquee">
        {repeated.map((msg, i) => (
          <span key={i} className="mx-6">
            {msg} *
          </span>
        ))}
      </div>
    </div>
  );
}
