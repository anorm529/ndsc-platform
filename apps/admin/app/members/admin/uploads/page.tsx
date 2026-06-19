import { NeonUploadManager } from "@/components/admin/neon-upload-manager";
import { uploadSections } from "@/lib/neon-admin";
import { requireAdminPermission } from "@/lib/permissions";

export default async function UploadsPage() {
  await requireAdminPermission("database");
  return (
    <div className="space-y-6">
      <NeonUploadManager sections={uploadSections} />
    </div>
  );
}
