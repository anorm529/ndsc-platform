import { NeonUploadManager } from "@/components/admin/neon-upload-manager";
import { uploadSections } from "@/lib/neon-admin";

export default function UploadsPage() {
  return (
    <div className="space-y-6">
      <NeonUploadManager sections={uploadSections} />
    </div>
  );
}
