import { useEffect, useRef, useState } from "react";
import { fetchPlantPhoto, wikipediaSearchUrl } from "../lib/plantPhotos";

// Shows what a recommended plant actually looks like. Opened by clicking a
// plant in the plan; exported on its own so it can be rendered against fixture
// data the same way GardenPrefs and PlanCard are.
//
// Callers must key this by plant name so switching plants remounts it — that
// keeps the loading state an initial value instead of an effect that resets it.
export default function PlantPhotoModal({ plant, onClose }) {
  const [state, setState] = useState({ status: "loading", data: null });
  const closeRef = useRef(null);

  const name = plant?.name;

  useEffect(() => {
    if (!name) return;
    let live = true;
    fetchPlantPhoto(name).then((data) => {
      if (live) setState({ status: "done", data });
    });
    return () => {
      live = false;
    };
  }, [name]);

  // Escape closes, the close button takes focus so the dialog is reachable
  // from the keyboard the moment it opens, and the plan behind it stops
  // scrolling away under the overlay.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  if (!plant) return null;

  const { status, data } = state;

  return (
    <div
      className="plant-modal-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="plant-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${name} — photo and details`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={closeRef}
          className="plant-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        <div className="plant-modal-photo">
          {status === "loading" && <div className="plant-modal-skeleton" />}
          {status === "done" &&
            (data.photo ? (
              <img
                src={data.photo}
                alt={`${name} plant`}
                onError={(e) => {
                  // The 2x width isn't always available; drop to the size
                  // Wikipedia offered, and only once so this can't loop.
                  if (data.photoFallback && e.target.src !== data.photoFallback) {
                    e.target.src = data.photoFallback;
                  }
                }}
              />
            ) : (
              <div className="plant-modal-nophoto">
                <span aria-hidden="true">🌱</span>
                <p>No photo available for this one.</p>
              </div>
            ))}
        </div>

        <div className="plant-modal-body">
          <h3>{name}</h3>
          {plant.why && <p className="plant-modal-why">{plant.why}</p>}

          {status === "done" && data.description && (
            <p className="plant-modal-desc">{data.description}</p>
          )}

          <p className="plant-modal-credit">
            {status === "done" ? (
              <a href={data.pageUrl} target="_blank" rel="noreferrer">
                {data.photo ? "Photo and description from Wikipedia" : "Look it up on Wikipedia"}
              </a>
            ) : (
              <a href={wikipediaSearchUrl(name)} target="_blank" rel="noreferrer">
                Look it up on Wikipedia
              </a>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
