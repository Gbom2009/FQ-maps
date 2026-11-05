import logo from "./assets/logo.svg";

export function Splash() {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-[#040404] animate-[fqfade_1.4s_ease-in_forwards]">
      <img src={logo} alt="Team Funqtion" className="h-36 w-36" />
      <div className="font-display text-2xl tracking-[-0.03em] text-[#f0f0f0]">FUNQTION MAPS</div>
      <div className="text-xs tracking-[0.3em] text-[#f68712]">FEEL THE MUSIQ</div>
      <style>{`@keyframes fqfade{0%,75%{opacity:1}100%{opacity:0}}`}</style>
    </div>
  );
}
