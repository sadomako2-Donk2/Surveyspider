"use client";

import { useState } from "react";
import { EnquiryForm } from "@/components/enquiries/EnquiryForm";
import { VENUE_CITIES } from "@/content/sections";

/** "Venues and dates" box on a course page, which fills in the enquiry form below it. */
export function RequestCourse({ title, days }: { title: string; days: number }) {
  const [venue, setVenue] = useState("");
  const [message, setMessage] = useState(
    `Course: ${title} (${days} days)\nPreferred venue: Live online\nNumber of participants: `,
  );
  const [n, setN] = useState(0); // remounts the form so the new message shows
  const fill = (inhouse: boolean) => {
    setMessage(
      inhouse
        ? `Course: ${title} (${days} days)\nIn-house for our organisation, at: \nNumber of participants: `
        : `Course: ${title} (${days} days)\nPreferred venue: ${venue || "Live online"}\nNumber of participants: `,
    );
    setN((x) => x + 1);
    setTimeout(() => document.getElementById("ask")?.scrollIntoView({ behavior: "smooth" }), 0);
  };
  return (
    <>
      <aside className="stack">
        <section className="card">
          <h2>Venues and dates</h2>
          <p className="muted">
            This course can run as a classroom course in any of our venues, live online, or in-house. Dates and fees
            depend on the venue.
          </p>
          <label>
            Preferred venue
            <select value={venue} onChange={(e) => setVenue(e.target.value)}>
              <option value="">Live online</option>
              {VENUE_CITIES.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <button type="button" className="btn primary" onClick={() => fill(false)}>
            Request dates and fees
          </button>
          <button type="button" className="btn" onClick={() => fill(true)}>
            Run it in-house
          </button>
        </section>
      </aside>
      <div id="ask" style={{ gridColumn: "1 / -1" }}>
        <EnquiryForm
          key={n}
          type="TRAINING"
          title="Ask about this course"
          intro="We'll reply with dates, fees and options for the venue you choose."
          serviceLabel="What are you interested in?"
          messageLabel="Course, venue and group size"
          defaultMessage={message}
        />
      </div>
    </>
  );
}
