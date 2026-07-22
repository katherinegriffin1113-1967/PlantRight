import { useEffect, useRef, useState } from "react";
import { fetchPlantPhoto, wikipediaSearchUrl } from "../lib/plantPhotos";
import {
  plantingCalendar,
  companionInfo,
  careInfo,
  isPollinatorFriendly,
} from "../lib/plantData";

// Shows what a recommended plant looks like and how to grow it: photo, a
// planting calendar timed to the plan's frost dates, care notes, and good
// companions. Opened by clicking a plant in the plan; exported on its own so
// it can be rendered against fixture data like GardenPrefs and PlanCard.
//
// Callers must key this by plant name so switching plants remounts it — that
// keeps the loading state an initial value instead of an effect that resets it.
export default function PlantPhotoModal({ plant, plan, onClose }) {
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
  const calendar = plantingCalendar(plant, plan);
  const companions = companionInfo(plant);
  const care = careInfo(plant);
  const pollinator = isPollinatorFriendly(plant);

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
          <div className="plant-modal-heading">
            <h3>{name}</h3>
            {pollinator && (
              <span className="plant-modal-badge" title="Attracts bees and butterflies">
                🐝 Pollinator-friendly
              </span>
            )}
          </div>
          {plant.why && <p className="plant-modal-why">{plant.why}</p>}

          {status === "done" && data.description && (
            <p className="plant-modal-desc">{data.description}</p>
          )}

          {/* A note pulled from local growing pages for this exact area, when
              the Firecrawl search actually mentioned this plant. */}
          {plant.localNote && (
            <section className="plant-detail plant-local-note">
              <h4>📍 Note for your area</h4>
              <p>{plant.localNote}</p>
              {plant.localNoteSource && (
                <a
                  href={plant.localNoteSource}
                  target="_blank"
                  rel="noreferrer"
                  className="plant-local-src"
                >
                  Source
                </a>
              )}
            </section>
          )}

          {calendar && (
            <section className="plant-detail">
              <h4>🗓️ When to plant</h4>
              <ul className="plant-detail-steps">
                {calendar.steps.map((s, i) => (
                  <li key={i}>
                    <span className="step-label">{s.label}</span>
                    <span className="step-value">{s.value}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {care && (care.spacing || care.watering || care.sun || care.watch) && (
            <section className="plant-detail">
              <h4>🌱 Care</h4>
              <ul className="plant-detail-list">
                {care.spacing && <li><strong>Spacing:</strong> {care.spacing}</li>}
                {care.sun && <li>{care.sun}</li>}
                {care.watering && <li>{care.watering}</li>}
                {care.watch && <li>{care.watch}</li>}
              </ul>
            </section>
          )}

          {companions && (
            <section className="plant-detail">
              <h4>🤝 Good companions</h4>
              <ul className="plant-detail-list">
                {companions.good && (
                  <li><strong>Plant near:</strong> {companions.good}</li>
                )}
                {companions.avoid && (
                  <li><strong>Keep apart:</strong> {companions.avoid}</li>
                )}
              </ul>
            </section>
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
