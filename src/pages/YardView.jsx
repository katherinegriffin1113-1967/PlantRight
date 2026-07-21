import { useEffect, useState } from "react";
import { geocodeAddress, satelliteImageUrl } from "../lib/yardView";

// An overhead satellite view of the plan's address. Uses coordinates saved on
// the plan if they're there, otherwise geocodes the address string — so it
// works for plans saved before this feature existed too.
//
// Callers should key this by plan.location so a new plan remounts it fresh.
export default function YardView({ plan }) {
  const hasCoords = plan?.lat != null && plan?.lon != null;
  const [coords, setCoords] = useState(
    hasCoords ? { lat: plan.lat, lon: plan.lon } : null
  );
  const [status, setStatus] = useState(hasCoords ? "ready" : "loading");
  const [imgBroken, setImgBroken] = useState(false);

  useEffect(() => {
    if (coords) return;
    let live = true;
    geocodeAddress(plan?.location).then((c) => {
      if (!live) return;
      if (c) {
        setCoords(c);
        setStatus("ready");
      } else {
        setStatus("failed");
      }
    });
    return () => {
      live = false;
    };
  }, [plan?.location, coords]);

  // If we can't place the address or the image won't load, show nothing rather
  // than a broken box — the plan is complete without it.
  if (status === "failed" || imgBroken) return null;

  return (
    <figure className="yard-view">
      <div className="yard-view-frame">
        {status === "loading" && <div className="yard-view-skeleton" />}
        {status === "ready" && coords && (
          <img
            src={satelliteImageUrl(coords.lon, coords.lat)}
            alt={`Satellite view of ${plan.location}`}
            loading="lazy"
            onError={() => setImgBroken(true)}
          />
        )}
      </div>
      <figcaption className="yard-view-cap">
        <span>🛰️ Overhead view of your address</span>
        <span className="yard-view-attr">
          ©{" "}
          <a href="https://www.mapbox.com/about/maps/" target="_blank" rel="noreferrer">
            Mapbox
          </a>{" "}
          © Maxar
        </span>
      </figcaption>
    </figure>
  );
}
