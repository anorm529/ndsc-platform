import Image from "next/image";

export const metadata = {
  title: "Maintenance | NDSC Members",
  description: "The NDSC Members platform is currently undergoing maintenance.",
};

export default function MaintenancePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0F172A] px-6 text-white">
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { opacity: 1; filter: drop-shadow(0 0 12px rgba(45, 212, 191, 0.4)); }
          50%       { opacity: 0.75; filter: drop-shadow(0 0 28px rgba(45, 212, 191, 0.8)); }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .logo-pulse { animation: pulse-glow 2.8s ease-in-out infinite; }
        .fade-up-1  { animation: fade-up 0.6s ease-out 0.2s both; }
        .fade-up-2  { animation: fade-up 0.6s ease-out 0.5s both; }
        .fade-up-3  { animation: fade-up 0.6s ease-out 0.8s both; }
        .spinner    {
          width: 48px; height: 48px;
          border: 3px solid rgba(45, 212, 191, 0.2);
          border-top-color: rgba(45, 212, 191, 0.9);
          border-radius: 50%;
          animation: spin-slow 1s linear infinite;
        }
      `}</style>

      <div className="flex flex-col items-center gap-8 text-center">
        <div className="logo-pulse">
          <Image
            src="/NDSC TECH.png"
            alt="NDSC Tech"
            width={220}
            height={220}
            priority
            className="rounded-2xl"
          />
        </div>

        <div className="fade-up-1 space-y-2">
          <div className="inline-flex rounded-full border border-teal-300/35 bg-teal-500/10 px-4 py-2 text-sm font-semibold text-teal-400">
            Scheduled Maintenance
          </div>
        </div>

        <div className="fade-up-2 max-w-md space-y-3">
          <h1 className="text-3xl font-semibold md:text-4xl">
            We&apos;ll be right back
          </h1>
          <p className="text-base text-slate-400">
            The NDSC Members platform is currently undergoing maintenance.
            We&apos;re working hard to improve things — check back soon.
          </p>
        </div>

        <div className="fade-up-3 flex flex-col items-center gap-4">
          <div className="spinner" />
          <p className="text-sm text-slate-500">Work in progress&hellip;</p>
        </div>
      </div>
    </main>
  );
}
