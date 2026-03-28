import { prisma } from "@/lib/prisma";
import { createServiceRoleClient, getInvoicePdfBucket } from "@/lib/supabase/service";

export function invoicePdfObjectPath(userId: string, invoiceId: string) {
  return `${userId}/${invoiceId}.pdf`;
}

export async function uploadInvoicePdfAndSaveUrl(
  userId: string,
  invoiceId: string,
  buffer: Buffer,
): Promise<string | null> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  const client = createServiceRoleClient();
  const bucket = getInvoicePdfBucket();
  const path = invoicePdfObjectPath(userId, invoiceId);

  const { error: upErr } = await client.storage
    .from(bucket)
    .upload(path, buffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (upErr) {
    console.error("Supabase storage upload failed:", upErr);
    return null;
  }

  const objectPath = `${bucket}/${path}`;
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { pdfUrl: objectPath },
  });

  return objectPath;
}

export async function createSignedInvoicePdfUrl(
  objectPath: string,
  expiresSec: number,
): Promise<string | null> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  const [bucket, ...rest] = objectPath.split("/");
  const pathInBucket = rest.join("/");
  if (!bucket || !pathInBucket) {
    return null;
  }

  const client = createServiceRoleClient();
  const { data, error } = await client.storage
    .from(bucket)
    .createSignedUrl(pathInBucket, expiresSec);

  if (error || !data?.signedUrl) {
    console.error("Signed URL error:", error);
    return null;
  }
  return data.signedUrl;
}
