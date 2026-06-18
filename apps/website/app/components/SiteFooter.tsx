import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Mail, MapPin, Sparkles, Trophy, UserPlus } from "lucide-react";

type NavLink = {
  label: string;
  href: string;
};

export default function SiteFooter({ navLinks }: { navLinks: NavLink[] }) {
  return (
    <footer className="bg-[#0B1324] text-white">
      <div className="mx-auto max-w-6xl border-t border-white/10 px-6 py-12">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="North Down Softball Club Logo"
                width={100}
                height={100}
                className="h-20 w-auto object-contain"
              />
              <div className="font-semibold">North Down Softball Club</div>
            </div>
            <p className="mt-4 text-sm text-white/70">
              Community softball in Bangor, Northern Ireland. Fast Pitch. Big
              Hits. Community Spirit.
            </p>
          </div>

          <div>
            <div className="font-semibold">Quick Links</div>
            <div className="mt-4 space-y-2 text-sm text-white/70">
              {navLinks.map((link) =>
                link.href.startsWith("/") ? (
                  <Link key={link.href} href={link.href} className="block hover:text-white">
                    {link.label}
                  </Link>
                ) : (
                  <a key={link.href} href={link.href} className="block hover:text-white">
                    {link.label}
                  </a>
                )
              )}
              <Link href="/#join" className="block hover:text-white">
                Join Us
              </Link>
              <a
                href="https://tournaments.northdownsoftballclub.co.uk"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-white"
              >
                <Trophy className="h-3.5 w-3.5 text-amber-400" />
                Tournaments
                <ExternalLink className="h-3 w-3 opacity-50" />
              </a>
              <a
                href="https://fantasy.northdownsoftballclub.co.uk/login"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-white"
              >
                <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                Fantasy League
                <ExternalLink className="h-3 w-3 opacity-50" />
              </a>
              <Link href="/privacy-policy" className="block hover:text-white">
                Privacy Policy
              </Link>
              <Link href="/cookies" className="block hover:text-white">
                Cookies
              </Link>
            </div>
          </div>

          <div>
            <div className="font-semibold">Contact</div>
            <div className="mt-4 space-y-3 text-sm text-white/70">
              <a
                href="mailto:northdownsoftballclub@gmail.com?subject=Enquiry about joining North Down Softball Club"
                className="group inline-flex items-center gap-2 transition hover:text-white"
              >
                <Mail className="h-4 w-4 text-teal-300" />
                <span className="underline underline-offset-4">
                  northdownsoftballclub@gmail.com
                </span>
              </a>
              <a
                href="https://www.google.com/maps/search/?api=1&query=54.65628969954839,-5.658349500806431"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 transition hover:text-white"
              >
                <MapPin className="h-4 w-4 text-teal-300" />
                Ward Park, Bangor
              </a>
              <a
                href="https://www.facebook.com/Northdownsoftballclub"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 transition hover:text-white"
              >
                <ExternalLink className="h-4 w-4 text-teal-300" />
                Facebook
              </a>
              <a
                href="https://tally.so/r/7RKdrz"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-teal-400 px-4 py-2 font-semibold text-[#0B1324] transition hover:bg-teal-300"
              >
                <UserPlus className="h-4 w-4" />
                Register Interest
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 text-xs text-white/50">
          <span>
            Copyright {new Date().getFullYear()} North Down Softball Club. All
            rights reserved.
          </span>
          <div className="flex items-center gap-4">
            <Link href="/privacy-policy" className="transition-colors hover:text-white">
              Privacy
            </Link>
            <Link href="/cookies" className="transition-colors hover:text-white">
              Cookies
            </Link>
            <span>
              Created by{" "}
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-white"
              >
                AN Digital
              </a>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
