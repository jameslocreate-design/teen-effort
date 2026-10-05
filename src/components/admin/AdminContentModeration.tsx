import AdminReports from "@/components/admin/AdminReports";

const AdminContentModeration = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-2xl font-bold text-foreground mb-1">Content Moderation</h2>
      <p className="text-muted-foreground text-sm">Review reports filed by users</p>
    </div>
    <AdminReports />
  </div>
);

export default AdminContentModeration;
