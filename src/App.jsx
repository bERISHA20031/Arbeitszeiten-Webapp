import React, { useEffect, useMemo, useState } from "react";

export default function ArbeitszeitRechner() {
  const today = new Date().toISOString().slice(0, 10);

  const [seite, setSeite] = useState("erfassen");
  const [datum, setDatum] = useState(today);
  const [start, setStart] = useState("08:00");
  const [ende, setEnde] = useState("16:45");
  const [pauseMin, setPauseMin] = useState(45);
  const [eintraege, setEintraege] = useState([]);

  useEffect(() => {
    const gespeicherteEintraege = localStorage.getItem("arbeitszeitEintraege");
    if (gespeicherteEintraege) {
      setEintraege(JSON.parse(gespeicherteEintraege));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("arbeitszeitEintraege", JSON.stringify(eintraege));
  }, [eintraege]);

  function timeToMinutes(time) {
    if (!time) return null;
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  }

  function formatMinutes(totalMinutes) {
    const sign = totalMinutes < 0 ? "-" : "";
    const abs = Math.abs(totalMinutes);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return `${sign}${h} Std. ${m.toString().padStart(2, "0")} Min.`;
  }

  function formatDate(dateString) {
    if (!dateString) return "";
    return new Date(dateString + "T00:00:00").toLocaleDateString("de-DE");
  }

  function parseDate(dateString) {
    return new Date(dateString + "T00:00:00");
  }

  function startOfWeek(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d;
  }

  function endOfWeek(date) {
    const d = startOfWeek(date);
    d.setDate(d.getDate() + 6);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  function endOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  function summeImZeitraum(von, bis) {
    return eintraege.reduce((summe, eintrag) => {
      const eintragDatum = parseDate(eintrag.datum);
      if (eintragDatum >= von && eintragDatum <= bis) {
        return summe + eintrag.netto;
      }
      return summe;
    }, 0);
  }

  const result = useMemo(() => {
    const startMin = timeToMinutes(start);
    let endeMin = timeToMinutes(ende);

    if (startMin === null || endeMin === null) {
      return {
        valid: false,
        text: "Bitte Start- und Endzeit eintragen.",
        brutto: 0,
        netto: 0,
      };
    }

    if (endeMin < startMin) {
      endeMin += 24 * 60;
    }

    const brutto = endeMin - startMin;
    const netto = brutto - Number(pauseMin || 0);

    if (netto < 0) {
      return {
        valid: false,
        text: "Die Pause ist länger als die Arbeitszeit.",
        brutto,
        netto,
      };
    }

    return {
      valid: true,
      text: formatMinutes(netto),
      brutto,
      netto,
    };
  }, [start, ende, pauseMin]);

  const gesamtzeit = useMemo(() => {
    return eintraege.reduce((summe, eintrag) => summe + eintrag.netto, 0);
  }, [eintraege]);

  const auswertung = useMemo(() => {
    const heute = parseDate(today);

    const dieseWocheStart = startOfWeek(heute);
    const dieseWocheEnde = endOfWeek(heute);

    const letzteWocheStart = new Date(dieseWocheStart);
    letzteWocheStart.setDate(letzteWocheStart.getDate() - 7);

    const letzteWocheEnde = new Date(dieseWocheEnde);
    letzteWocheEnde.setDate(letzteWocheEnde.getDate() - 7);

    const dieserMonatStart = startOfMonth(heute);
    const dieserMonatEnde = endOfMonth(heute);

    const letzterMonat = new Date(heute.getFullYear(), heute.getMonth() - 1, 1);
    const letzterMonatStart = startOfMonth(letzterMonat);
    const letzterMonatEnde = endOfMonth(letzterMonat);

    return {
      dieseWoche: summeImZeitraum(dieseWocheStart, dieseWocheEnde),
      letzteWoche: summeImZeitraum(letzteWocheStart, letzteWocheEnde),
      dieserMonat: summeImZeitraum(dieserMonatStart, dieserMonatEnde),
      letzterMonat: summeImZeitraum(letzterMonatStart, letzterMonatEnde),
    };
  }, [eintraege, today]);

  function speichern() {
    if (!result.valid) return;

    const neuerEintrag = {
      id: crypto.randomUUID(),
      datum,
      start,
      ende,
      pauseMin: Number(pauseMin || 0),
      brutto: result.brutto,
      netto: result.netto,
      erstelltAm: new Date().toISOString(),
    };

    setEintraege((alt) => [neuerEintrag, ...alt]);
  }

  function loeschen(id) {
    setEintraege((alt) => alt.filter((eintrag) => eintrag.id !== id));
  }

  function allesLoeschen() {
    const sicher = window.confirm("Möchten Sie wirklich alle gespeicherten Arbeitszeiten löschen?");
    if (sicher) {
      setEintraege([]);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <section className="w-full max-w-3xl bg-white rounded-2xl shadow-lg p-6 md:p-8">
        <div className="mb-6 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            Arbeitszeit-Rechner
          </h1>
          <p className="mt-3 text-lg text-gray-600">
            Einfach Zeiten erfassen und später auswerten.
          </p>
        </div>

        <nav className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => setSeite("erfassen")}
            className={`text-2xl font-bold rounded-xl py-4 border-2 transition ${
              seite === "erfassen"
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-900 border-gray-300 hover:bg-gray-100"
            }`}
          >
            Zeit erfassen
          </button>

          <button
            onClick={() => setSeite("auswertung")}
            className={`text-2xl font-bold rounded-xl py-4 border-2 transition ${
              seite === "auswertung"
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-900 border-gray-300 hover:bg-gray-100"
            }`}
          >
            Auswertung & Verlauf
          </button>
        </nav>

        {seite === "erfassen" && (
          <>
            <div className="space-y-6">
              <label className="block">
                <span className="block text-xl font-semibold text-gray-800 mb-2">
                  Datum
                </span>
                <input
                  type="date"
                  value={datum}
                  onChange={(e) => setDatum(e.target.value)}
                  className="w-full text-3xl p-4 rounded-xl border-2 border-gray-300 focus:border-blue-600 focus:outline-none"
                />
              </label>

              <label className="block">
                <span className="block text-xl font-semibold text-gray-800 mb-2">
                  Anfangszeit
                </span>
                <input
                  type="time"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="w-full text-3xl p-4 rounded-xl border-2 border-gray-300 focus:border-blue-600 focus:outline-none"
                />
              </label>

              <label className="block">
                <span className="block text-xl font-semibold text-gray-800 mb-2">
                  Endzeit
                </span>
                <input
                  type="time"
                  value={ende}
                  onChange={(e) => setEnde(e.target.value)}
                  className="w-full text-3xl p-4 rounded-xl border-2 border-gray-300 focus:border-blue-600 focus:outline-none"
                />
              </label>

              <label className="block">
                <span className="block text-xl font-semibold text-gray-800 mb-2">
                  Pause in Minuten
                </span>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={pauseMin}
                  onChange={(e) => setPauseMin(e.target.value)}
                  className="w-full text-3xl p-4 rounded-xl border-2 border-gray-300 focus:border-blue-600 focus:outline-none"
                />
              </label>
            </div>

            <div className="mt-8 p-6 rounded-2xl bg-gray-100 text-center">
              <p className="text-xl text-gray-700 mb-2">Gearbeitete Zeit ohne Pause</p>
              <p
                className={`text-4xl md:text-5xl font-bold ${
                  result.valid ? "text-green-700" : "text-red-700"
                }`}
              >
                {result.text}
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={speichern}
                disabled={!result.valid}
                className="w-full text-2xl font-bold bg-green-700 text-white rounded-xl py-4 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed active:scale-[0.99] transition"
              >
                Arbeitszeit speichern
              </button>

              <button
                onClick={() => {
                  setDatum(today);
                  setStart("08:00");
                  setEnde("16:45");
                  setPauseMin(45);
                }}
                className="w-full text-2xl font-bold bg-gray-900 text-white rounded-xl py-4 hover:bg-gray-700 active:scale-[0.99] transition"
              >
                Zurücksetzen
              </button>
            </div>
          </>
        )}

        {seite === "auswertung" && (
          <>
            <div className="mb-10">
              <h2 className="text-3xl font-bold text-gray-900 mb-5">Auswertung</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl bg-blue-50 border border-blue-100 p-5 text-center">
                  <p className="text-xl text-gray-700">Diese Woche</p>
                  <p className="text-3xl font-bold text-blue-900 mt-2">
                    {formatMinutes(auswertung.dieseWoche)}
                  </p>
                </div>

                <div className="rounded-2xl bg-blue-50 border border-blue-100 p-5 text-center">
                  <p className="text-xl text-gray-700">Letzte Woche</p>
                  <p className="text-3xl font-bold text-blue-900 mt-2">
                    {formatMinutes(auswertung.letzteWoche)}
                  </p>
                </div>

                <div className="rounded-2xl bg-green-50 border border-green-100 p-5 text-center">
                  <p className="text-xl text-gray-700">Dieser Monat</p>
                  <p className="text-3xl font-bold text-green-900 mt-2">
                    {formatMinutes(auswertung.dieserMonat)}
                  </p>
                </div>

                <div className="rounded-2xl bg-green-50 border border-green-100 p-5 text-center">
                  <p className="text-xl text-gray-700">Letzter Monat</p>
                  <p className="text-3xl font-bold text-green-900 mt-2">
                    {formatMinutes(auswertung.letzterMonat)}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t pt-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">Gespeicherte Zeiten</h2>
                  <p className="text-lg text-gray-600 mt-1">
                    Gesamt: <strong>{formatMinutes(gesamtzeit)}</strong>
                  </p>
                </div>

                {eintraege.length > 0 && (
                  <button
                    onClick={allesLoeschen}
                    className="text-xl font-bold bg-red-100 text-red-800 rounded-xl px-5 py-3 hover:bg-red-200"
                  >
                    Alle löschen
                  </button>
                )}
              </div>

              {eintraege.length === 0 ? (
                <p className="text-xl text-gray-500 text-center bg-gray-50 rounded-xl p-6">
                  Noch keine Arbeitszeiten gespeichert.
                </p>
              ) : (
                <div className="space-y-4">
                  {eintraege.map((eintrag) => (
                    <div
                      key={eintrag.id}
                      className="rounded-2xl border border-gray-200 p-5 bg-gray-50 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                    >
                      <div>
                        <p className="text-2xl font-bold text-gray-900">
                          {formatDate(eintrag.datum)}
                        </p>
                        <p className="text-lg text-gray-700 mt-1">
                          {eintrag.start} - {eintrag.ende} Uhr · Pause: {eintrag.pauseMin} Min.
                        </p>
                        <p className="text-2xl font-bold text-green-700 mt-2">
                          {formatMinutes(eintrag.netto)}
                        </p>
                      </div>

                      <button
                        onClick={() => loeschen(eintrag.id)}
                        className="text-xl font-bold bg-white border-2 border-red-200 text-red-700 rounded-xl px-5 py-3 hover:bg-red-50"
                      >
                        Löschen
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

