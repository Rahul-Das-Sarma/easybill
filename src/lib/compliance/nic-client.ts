import {
  createCipheriv,
  createDecipheriv,
  publicEncrypt,
  randomBytes,
  constants,
} from "node:crypto";

type NicEnv = "sandbox" | "production";

const HOSTS: Record<NicEnv, string> = {
  sandbox: "https://einv-apisandbox.nic.in",
  production: "https://einvoice1.gst.gov.in",
};

export class NicError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NicError";
  }
}

function encryptWithPublicKey(value: string, publicKeyPem: string) {
  return publicEncrypt(
    { key: publicKeyPem, padding: constants.RSA_PKCS1_PADDING },
    Buffer.from(value, "utf8"),
  ).toString("base64");
}

function aes(mode: "enc" | "dec", payload: string, key: Buffer) {
  if (mode === "enc") {
    const cipher = createCipheriv("aes-128-ecb", key, null);
    return Buffer.concat([
      cipher.update(payload, "utf8"),
      cipher.final(),
    ]).toString("base64");
  }
  const decipher = createDecipheriv("aes-128-ecb", key, null);
  return Buffer.concat([
    decipher.update(Buffer.from(payload, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

type AuthSession = { authToken: string; sek: Buffer };

async function authenticate(input: {
  env: NicEnv;
  gstin: string;
  username: string;
  password: string;
  clientId: string;
  clientSecret: string;
  publicKeyPem: string;
}): Promise<AuthSession> {
  const appKey = randomBytes(16);
  const body = {
    Data: {
      UserName: input.username,
      Password: encryptWithPublicKey(input.password, input.publicKeyPem),
      AppKey: encryptWithPublicKey(appKey.toString("base64"), input.publicKeyPem),
      ForceRefreshAuthToken: "true",
    },
  };

  const res = await fetch(`${HOSTS[input.env]}/eivital/v1.04/auth`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      client_id: input.clientId,
      client_secret: input.clientSecret,
      Gstin: input.gstin,
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as {
    Status?: number;
    ErrorDetails?: { ErrorMessage?: string }[];
    Data?: { AuthToken?: string; Sek?: string } | string;
  };
  if (!res.ok || json.Status === 0) {
    throw new NicError(
      json.ErrorDetails?.map((e) => e.ErrorMessage).filter(Boolean).join(" ") ||
        "E-invoice portal rejected the login.",
    );
  }

  const data =
    typeof json.Data === "string"
      ? (JSON.parse(aes("dec", json.Data, appKey)) as {
          AuthToken?: string;
          Sek?: string;
        })
      : json.Data;
  if (!data?.AuthToken || !data.Sek) {
    throw new NicError("E-invoice portal did not return a session.");
  }
  const sekPlain = aes("dec", data.Sek, appKey);
  return {
    authToken: data.AuthToken,
    sek: Buffer.from(sekPlain, "base64"),
  };
}

async function postEncrypted(input: {
  env: NicEnv;
  path: string;
  gstin: string;
  username: string;
  clientId: string;
  clientSecret: string;
  session: AuthSession;
  payload: unknown;
}) {
  const res = await fetch(`${HOSTS[input.env]}${input.path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      client_id: input.clientId,
      client_secret: input.clientSecret,
      Gstin: input.gstin,
      user_name: input.username,
      AuthToken: input.session.authToken,
    },
    body: JSON.stringify({
      Data: aes("enc", JSON.stringify(input.payload), input.session.sek),
    }),
  });
  const json = (await res.json()) as {
    Status?: number;
    ErrorDetails?: { ErrorMessage?: string }[];
    Data?: string;
  };
  if (!res.ok || json.Status === 0 || !json.Data) {
    throw new NicError(
      json.ErrorDetails?.map((e) => e.ErrorMessage).filter(Boolean).join(" ") ||
        "E-invoice portal rejected the request.",
    );
  }
  return JSON.parse(aes("dec", json.Data, input.session.sek)) as Record<
    string,
    unknown
  >;
}

export async function registerInvoice(input: {
  env: NicEnv;
  gstin: string;
  username: string;
  password: string;
  clientId: string;
  clientSecret: string;
  publicKeyPem: string;
  payload: unknown;
}) {
  const session = await authenticate(input);
  const data = await postEncrypted({
    ...input,
    path: "/eicore/v1.03/Invoice",
    session,
    payload: input.payload,
  });
  const irn = String(data.Irn ?? "");
  if (!irn) throw new NicError("Portal response did not include an IRN.");
  return {
    irn,
    ackNo: String(data.AckNo ?? ""),
    ackDate: String(data.AckDt ?? ""),
    signedQr: String(data.SignedQRCode ?? ""),
  };
}

export async function registerEwayBill(input: {
  env: NicEnv;
  gstin: string;
  username: string;
  password: string;
  clientId: string;
  clientSecret: string;
  publicKeyPem: string;
  irn: string;
  distanceKm: number;
  vehicleNo: string;
}) {
  const session = await authenticate(input);
  const data = await postEncrypted({
    ...input,
    path: "/eiewb/v1.03/ewaybill",
    session,
    payload: {
      Irn: input.irn,
      Distance: input.distanceKm,
      TransMode: "1",
      VehNo: input.vehicleNo.toUpperCase(),
      VehType: "R",
    },
  });
  const ewbNo = String(data.EwbNo ?? "");
  if (!ewbNo) throw new NicError("Portal response did not include an e-way bill number.");
  return {
    ewayBillNo: ewbNo,
    ewayBillDate: String(data.EwbDt ?? ""),
    validTill: String(data.EwbValidTill ?? ""),
  };
}
