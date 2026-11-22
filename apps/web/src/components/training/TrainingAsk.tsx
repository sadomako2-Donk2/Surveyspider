import { EnquiryForm } from "@/components/enquiries/EnquiryForm";
import { TickList } from "@/components/site/sections";

/** The training enquiry form with "what to expect", used across the Training section. */
export function TrainingAsk({ title, message }: { title: string; message?: string }) {
  return (
    <div className="split" id="ask">
      <EnquiryForm
        type="TRAINING"
        title={title}
        intro="Tell us which course, where and how many people. We'll reply with dates, fees and options."
        serviceLabel="What are you interested in?"
        messageLabel="Course, venue and group size"
        placeholder="e.g. Strategic Planning and Execution for 15 managers in Accra, or online"
        defaultMessage={message}
      />
      <section className="card">
        <h2>What to expect</h2>
        <TickList
          items={[
            ["Hands-on learning", "Short explanations followed by practice on real cases and your own data."],
            ["Small groups", "Enough time for questions and feedback."],
            ["Course materials", "Slides, templates and exercises to keep."],
            [
              "Certificate of completion",
              "For participants who attend and complete the course. It is not an accredited qualification.",
            ],
          ]}
        />
      </section>
    </div>
  );
}
