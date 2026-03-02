interface LogoProps {
  title: string;
  subtitle?: string;
}

export function Logo({ title, subtitle }: LogoProps) {
  return (
    <div className="text-center mb-12">
      <div className="w-20 h-20 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-[0_20px_60px_rgba(233,69,96,0.4)] animate-[pulse_3s_ease-in-out_infinite]">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-10 h-10 fill-white stroke-white">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      </div>
      <h1 className="text-[28px] font-bold tracking-tight bg-gradient-to-r from-text-primary to-text-secondary bg-clip-text text-transparent">
        {title}
      </h1>
      {subtitle && <p className="text-text-muted text-sm mt-2">{subtitle}</p>}
    </div>
  );
}
