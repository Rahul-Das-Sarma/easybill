import { NextResponse } from "next/server";

import { ensureAppUser, getSessionUser } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";
import {
  createServiceRoleClient,
  getCompanyLogoBucket,
} from "@/lib/supabase/service";

const MAX_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp"]);

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureAppUser(user);

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is required for logo upload" },
      { status: 500 },
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: "Only PNG, JPG, and WEBP are supported" },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File too large (max 2MB)" },
      { status: 400 },
    );
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${user.id}/company-logo.${ext}`;
  const bucket = getCompanyLogoBucket();
  const client = createServiceRoleClient();
  const bytes = await file.arrayBuffer();

  const { error: upErr } = await client.storage
    .from(bucket)
    .upload(path, bytes, {
      upsert: true,
      contentType: file.type,
      cacheControl: "3600",
    });

  if (upErr) {
    return NextResponse.json(
      { error: `Upload failed: ${upErr.message}` },
      { status: 500 },
    );
  }

  const { data } = client.storage.from(bucket).getPublicUrl(path);
  const publicUrl = data.publicUrl;

  await prisma.user.update({
    where: { id: user.id },
    data: { companyLogoUrl: publicUrl },
  });

  return NextResponse.json({ companyLogoUrl: publicUrl });
}
