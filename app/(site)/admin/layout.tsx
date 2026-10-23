import AdminBell from "@/components/admin/AdminBell";

// Adds the notifications bell to every admin page. It doesn't gate anything: a
// layout renders in parallel with its page, so each page still checks the
// admin cookie first, and the bell checks it too.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <AdminBell />
      {children}
    </div>
  );
}
