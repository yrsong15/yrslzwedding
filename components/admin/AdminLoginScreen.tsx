import AdminLogin from "@/components/AdminLogin";
import PageHeader from "@/components/PageHeader";

/** What every /admin page shows instead of its content without the admin cookie. */
export default function AdminLoginScreen() {
  return (
    <div className="pb-24">
      <PageHeader title="Admin" intro="For the couple only." />
      <AdminLogin />
    </div>
  );
}
