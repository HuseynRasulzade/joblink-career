"use client";
import { useState } from "react";
import { OTHER_DOMESTIC, domesticPlaces, foreignPlaces } from "@/lib/trip-places";

// The destination of a trip, chosen from the places the law names (Cabinet of Ministers decision No. 14 of 25.01.2008):
// inside the country the four cities with a norm of their own or "other" (the place is typed); abroad a country or city of the table.
export default function TripPlacePicker({ destination, abroad, onChange }: { destination: string; abroad: boolean; onChange: (destination: string, abroad: boolean) => void }) {
  const domestic = domesticPlaces();
  const foreign = foreignPlaces();
  const named = domestic.find((p) => p.value && p.value === destination);
  // "Other" stays selected while the person types the name of the place.
  const [other, setOther] = useState(() => !abroad && !!destination && !named);
  const isOther = !abroad && (other || (!!destination && !named));
  return (
    <div className="trip-place">
      <div className="trip-place-kind" role="group" aria-label="Ezamiyyət növü">
        <button type="button" className={!abroad ? "on" : ""} aria-pressed={!abroad} onClick={() => { setOther(false); onChange("", false); }}>Azərbaycan daxilində</button>
        <button type="button" className={abroad ? "on" : ""} aria-pressed={abroad} onClick={() => { setOther(false); onChange("", true); }}>Xarici ölkə</button>
      </div>
      {abroad ? (
        <label className="field">
          <span>Ölkə və ya şəhər (qanunun cədvəlindən)</span>
          <select value={destination} onChange={(e) => onChange(e.target.value, true)}>
            <option value="">Seçin…</option>
            {foreign.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </label>
      ) : (
        <>
          <label className="field">
            <span>Şəhər / yer (qanunun cədvəlindən)</span>
            <select
              value={isOther ? "" : named ? named.value : "none"}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "none") { setOther(false); onChange("", false); return; }
                if (value === "") { setOther(true); onChange("", false); return; }
                setOther(false);
                onChange(value, false);
              }}
            >
              <option value="none">Seçin…</option>
              {domestic.map((p) => <option key={p.value || "other"} value={p.value}>{p.label}</option>)}
            </select>
          </label>
          {isOther && (
            <label className="field">
              <span>{OTHER_DOMESTIC}: yerin adı</span>
              <input value={destination} placeholder="Məsələn: Şəki, Quba, Lənkəran rayonu" onChange={(e) => onChange(e.target.value, false)} />
            </label>
          )}
        </>
      )}
    </div>
  );
}
