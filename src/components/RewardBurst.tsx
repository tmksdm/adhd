import { useEffect, useState } from "react";
import { IconFire } from "./Icons";

type RewardBurstProps = {
  streak: number;
  firstToday: boolean;
};

export function RewardBurst({ streak, firstToday }: RewardBurstProps) {
  // flew=false → искры в центре; через мгновение flew=true → разлетаются
  const [flew, setFlew] = useState(false);
  // gone=true → искры отыграли и убираются из DOM
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const r = requestAnimationFrame(() =>
      requestAnimationFrame(() => setFlew(true)),
    );
    const t = window.setTimeout(() => setGone(true), 750);
    return () => {
      cancelAnimationFrame(r);
      window.clearTimeout(t);
    };
  }, []);

  // 6 искорок, разлетающихся в разные стороны
  const sparks = Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI * 2 * i) / 6;
    const dist = 70;
    return {
      tx: Math.cos(angle) * dist,
      ty: Math.sin(angle) * dist,
    };
  });

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
      {/* Искры */}
      <div className="relative">
        {!gone && sparks.map((s, i) => (
          <span
            key={i}
            className="animate-spark absolute h-2.5 w-2.5 rounded-full bg-reward"
            style={{
              left: "-5px",
              top: "-5px",
              transform: flew
                ? `translate(${s.tx}px, ${s.ty}px) scale(0.4)`
                : "translate(0px, 0px) scale(1)",
            }}
          />
        ))}
      </div>

      {/* Плашка "Серия N" — только при первом выполнении за день */}
      {firstToday && (
        <div className="animate-streak-rise absolute bottom-28 flex items-center gap-1.5 rounded-btn bg-reward px-5 py-3 text-[17px] font-bold text-bg shadow-lg">
          Серия: {streak} <IconFire className="h-5 w-5" />
        </div>
      )}
    </div>
  );
}