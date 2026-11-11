import PageHeader from "@/components/PageHeader";

/** What an admin page shows when its data won't load. `what` is "the guest list", "the notifications", etc. */
export default function AdminLoadError({ what }: { what: string }) {
  return (
    <div className="pb-24">
      <PageHeader title="Admin" intro={`Couldn't load ${what}. Check your Supabase env vars and that schema.sql has been run.`} />
    </div>
  );
}
