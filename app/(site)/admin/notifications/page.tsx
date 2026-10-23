import AdminLoginScreen from "@/components/admin/AdminLoginScreen";
import AdminTabs from "@/components/admin/AdminTabs";
import NotificationList from "@/components/admin/NotificationList";
import PageHeader from "@/components/PageHeader";
import { countNewer, getNotifications, getSeen, getWho, isAdmin } from "@/lib/admin";
import type { RsvpNotification, Side } from "@/lib/types";

export const metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  if (!(await isAdmin())) return <AdminLoginScreen />;

  let items: RsvpNotification[];
  let who: Side | null;
  let fresh = 0;
  try {
    who = await getWho();
    const [all, seen] = await Promise.all([getNotifications(), getSeen(who)]);
    items = all;
    // New since this person last opened this page. Counted in SQL, which keeps
    // the timestamps' microseconds.
    if (who) fresh = await countNewer(seen.list_seen_at);
  } catch (e) {
    console.error(e);
    return (
      <div className="pb-24">
        <PageHeader title="Admin" intro="Couldn't load the notifications. Check your Supabase env vars and that schema.sql has been run." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24">
      <PageHeader title="Notifications" />
      <AdminTabs />
      <NotificationList items={items} fresh={fresh} who={who} />
    </div>
  );
}
