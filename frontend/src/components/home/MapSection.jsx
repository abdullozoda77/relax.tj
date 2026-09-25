import { Suspense, lazy, useState } from "react";
import Icon from "../Icon.jsx";

// The 3D library is big: it is loaded only after the visitor presses the button.
const PlacesMap3D = lazy(() => import("./PlacesMap3D.jsx"));

export default function MapSection() {
  const [open, setOpen] = useState(false);

  return (
    <section className="py-24 px-6 lg:px-12 bg-[#0b1117] scroll-mt-20" id="map">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
          <div>
            <span className="text-label-md font-label-md text-emerald-400 uppercase tracking-widest mb-2 block">Карта</span>
            <h2 className="text-3xl md:text-headline-lg font-headline-lg text-white">Все места на 3D-карте</h2>
          </div>
          <p className="text-body-md text-slate-400 max-w-md">
            Реальный рельеф и спутниковые снимки. Нажмите на метку — камера перелетит к месту.
          </p>
        </div>
        {open ? (
          <Suspense fallback={<div className="h-[560px] rounded-2xl bg-slate-900 animate-pulse" />}>
            <PlacesMap3D />
          </Suspense>
        ) : (
          <button
            className="group relative w-full h-[360px] rounded-2xl overflow-hidden border border-slate-800 hover:border-emerald-500/40 transition-all"
            onClick={() => setOpen(true)}
            type="button"
          >
            <div className="absolute inset-0 bg-cover bg-center scale-105 group-hover:scale-110 transition-transform duration-700" style={{ backgroundImage: 'url("/hero/yashikul.jpg")' }} />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/30" />
            <div className="relative h-full flex flex-col items-center justify-center gap-4 text-center px-6">
              <span className="w-16 h-16 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-950 group-hover:scale-110 transition-transform">
                <Icon name="3d_rotation" className="text-[32px]" />
              </span>
              <span className="text-headline-md font-headline-md text-white">Открыть 3D-карту Таджикистана</span>
              <span className="text-body-sm text-slate-300">Горы, озёра и все места Relax.tj на одной карте</span>
            </div>
          </button>
        )}
      </div>
    </section>
  );
}
