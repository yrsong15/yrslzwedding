import PageHeader from "@/components/PageHeader";
import RsvpFlow from "@/components/rsvp/RsvpFlow";
import { rsvpDeadline } from "@/lib/site";

export const metadata = { title: "RSVP" };

export default function RsvpPage() {
  return (
    <div className="pb-24">
      <PageHeader
        eyebrow="Kindly reply"
        title="RSVP"
        intro={`Please respond by ${rsvpDeadline}. Search for your name as it appears on your invitation. You can RSVP for everyone in your party.`}
      />
      <div className="mx-auto max-w-2xl px-4">
        <RsvpFlow />
      </div>
    </div>
  );
}
