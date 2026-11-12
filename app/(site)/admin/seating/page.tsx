import AdminLoadError from "@/components/admin/AdminLoadError";
import AdminLoginScreen from "@/components/admin/AdminLoginScreen";
import AdminTabs from "@/components/admin/AdminTabs";
import SeatingChart from "@/components/admin/SeatingChart";
import PageHeader from "@/components/PageHeader";
import { getSeatingList, isAdmin } from "@/lib/admin";
import type { SeatingParty } from "@/lib/types";

export const metadata = { title: "Seating chart" };
export const dynamic = "force-dynamic";

export default async function SeatingPage() {
  // Before any query: without the admin cookie, no seating data is even loaded.
  if (!(await isAdmin())) return <AdminLoginScreen />;

  let parties: SeatingParty[];
  try {
    parties = await getSeatingList();
  } catch (e) {
    console.error(e);
    return <AdminLoadError what="the guest list" />;
  }

  return (
    <div className="mx-auto max-w-[100rem] px-4 pb-24">
      <PageHeader title="Seating chart" />
      <AdminTabs current="/admin/seating" />
      <SeatingChart parties={parties} />
    </div>
  );
}
