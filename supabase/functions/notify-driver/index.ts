import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Web Push crypto utilities for VAPID
async function generateVapidAuthHeader(
  endpoint: string,
  vapidSubject: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
) {
  const urlObj = new URL(endpoint);
  const audience = `${urlObj.protocol}//${urlObj.host}`;

  // JWT header and payload
  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: vapidSubject,
  };

  const enc = new TextEncoder();

  // Base64url encode
  function b64url(data: Uint8Array): string {
    return btoa(String.fromCharCode(...data))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  function b64urlStr(str: string): string {
    return b64url(enc.encode(str));
  }

  const headerB64 = b64urlStr(JSON.stringify(header));
  const payloadB64 = b64urlStr(JSON.stringify(payload));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import private key
  const privateKeyBytes = Uint8Array.from(
    atob(vapidPrivateKey.replace(/-/g, "+").replace(/_/g, "/") + "=="),
    (c) => c.charCodeAt(0)
  );

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    await buildPkcs8(privateKeyBytes),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    enc.encode(unsignedToken)
  );

  // Convert DER signature to raw r||s format
  const sigBytes = new Uint8Array(signature);
  const rawSig = derToRaw(sigBytes);
  const jwt = `${unsignedToken}.${b64url(rawSig)}`;

  // Decode public key for p256ecdsa
  const pubKeyBytes = Uint8Array.from(
    atob(vapidPublicKey.replace(/-/g, "+").replace(/_/g, "/")),
    (c) => c.charCodeAt(0)
  );

  return {
    authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
    cryptoKey: pubKeyBytes,
  };
}

// Build PKCS8 wrapper around raw 32-byte EC private key
async function buildPkcs8(rawKey: Uint8Array): Promise<ArrayBuffer> {
  // EC P-256 PKCS#8 prefix
  const prefix = new Uint8Array([
    0x30, 0x81, 0x87, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86,
    0x48, 0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d,
    0x03, 0x01, 0x07, 0x04, 0x6d, 0x30, 0x6b, 0x02, 0x01, 0x01, 0x04, 0x20,
  ]);
  const suffix = new Uint8Array([0xa1, 0x44, 0x03, 0x42, 0x00]);

  // We need the public key too, but since we don't have it separately,
  // we'll use a simpler PKCS8 format without the public key
  const simplePrefix = new Uint8Array([
    0x30, 0x41, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48,
    0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03,
    0x01, 0x07, 0x04, 0x27, 0x30, 0x25, 0x02, 0x01, 0x01, 0x04, 0x20,
  ]);

  const pkcs8 = new Uint8Array(simplePrefix.length + rawKey.length);
  pkcs8.set(simplePrefix);
  pkcs8.set(rawKey, simplePrefix.length);
  return pkcs8.buffer;
}

// Convert DER-encoded ECDSA signature to raw r||s (64 bytes)
function derToRaw(der: Uint8Array): Uint8Array {
  // If already 64 bytes, it's raw
  if (der.length === 64) return der;

  const raw = new Uint8Array(64);
  // DER: 0x30 <len> 0x02 <r_len> <r> 0x02 <s_len> <s>
  let offset = 2; // skip 0x30 and total length
  
  // R
  offset++; // skip 0x02
  const rLen = der[offset++];
  const rStart = rLen > 32 ? offset + (rLen - 32) : offset;
  const rDest = rLen > 32 ? 0 : 32 - rLen;
  raw.set(der.slice(rStart, offset + rLen), rDest);
  offset += rLen;

  // S
  offset++; // skip 0x02
  const sLen = der[offset++];
  const sStart = sLen > 32 ? offset + (sLen - 32) : offset;
  const sDest = sLen > 32 ? 32 : 64 - sLen;
  raw.set(der.slice(sStart, offset + sLen), sDest);

  return raw;
}

// Encrypt payload using Web Push encryption (aes128gcm)
async function encryptPayload(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string
) {
  const enc = new TextEncoder();
  
  // Decode subscription keys
  function decodeB64(str: string): Uint8Array {
    const padded = str + "=".repeat((4 - (str.length % 4)) % 4);
    return Uint8Array.from(atob(padded.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
  }

  const clientPublicKey = decodeB64(subscription.p256dh);
  const clientAuth = decodeB64(subscription.auth);

  // Generate server ECDH key pair
  const serverKeys = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  // Export server public key (uncompressed, 65 bytes)
  const serverPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", serverKeys.publicKey)
  );

  // Import client public key
  const clientKey = await crypto.subtle.importKey(
    "raw",
    clientPublicKey,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // ECDH shared secret
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: clientKey },
      serverKeys.privateKey,
      256
    )
  );

  // Generate 16-byte salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // HKDF-based key derivation (RFC 8291)
  const authInfo = enc.encode("Content-Encoding: auth\0");
  const prkAuth = await hkdf(clientAuth, sharedSecret, authInfo, 32);

  // Key info
  const keyInfoBuf = new Uint8Array([
    ...enc.encode("Content-Encoding: aes128gcm\0"),
  ]);
  const nonceInfoBuf = new Uint8Array([
    ...enc.encode("Content-Encoding: nonce\0"),
  ]);

  // Context for CEK and nonce
  const context = new Uint8Array([
    ...enc.encode("P-256\0"),
    0, 65, ...clientPublicKey,
    0, 65, ...serverPublicKeyRaw,
  ]);

  const cekInfo = new Uint8Array([...keyInfoBuf, ...context]);
  const nonceInfo = new Uint8Array([...nonceInfoBuf, ...context]);

  const contentKey = await hkdf(salt, prkAuth, cekInfo, 16);
  const nonce = await hkdf(salt, prkAuth, nonceInfo, 12);

  // Encrypt with AES-128-GCM
  const paddedPayload = new Uint8Array([...enc.encode(payload), 2]); // 2 = record delimiter

  const aesKey = await crypto.subtle.importKey(
    "raw",
    contentKey,
    "AES-GCM",
    false,
    ["encrypt"]
  );

  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce, tagLength: 128 },
      aesKey,
      paddedPayload
    )
  );

  // Build aes128gcm header: salt(16) + rs(4) + idlen(1) + keyid(65) + encrypted
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096, false);

  const body = new Uint8Array([
    ...salt,
    ...rs,
    65,
    ...serverPublicKeyRaw,
    ...encrypted,
  ]);

  return body;
}

async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info },
    key,
    length * 8
  );
  return new Uint8Array(bits);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
    const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
    const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:contato@aguiatransportes.com";

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      throw new Error("VAPID keys not configured");
    }

    const body = await req.json();
    const { record, type: eventType } = body;

    if (!record) {
      return new Response(JSON.stringify({ error: "No record" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const status = record.status || "";
    const transportType = record.transport_type || "";

    if (!["solicitada", "enviada"].includes(status)) {
      return new Response(JSON.stringify({ skipped: true, reason: "status not relevant" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!transportType) {
      return new Response(JSON.stringify({ skipped: true, reason: "no transport_type" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find drivers with matching vehicle type
    const { data: matchingDrivers } = await supabase
      .from("driver_vehicle_types")
      .select("driver_id, drivers!inner(user_id, status)")
      .eq("vehicle_type", transportType);

    if (!matchingDrivers || matchingDrivers.length === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: "no matching drivers" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetUserIds = matchingDrivers
      .filter((d: any) => d.drivers?.status === "available" && d.drivers?.user_id)
      .map((d: any) => d.drivers.user_id);

    if (targetUserIds.length === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: "no available drivers" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get push subscriptions for target drivers
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", targetUserIds);

    if (subError) {
      console.error("[notify-driver] Error fetching subscriptions:", subError);
      throw new Error("Failed to fetch subscriptions");
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("[notify-driver] No push subscriptions found for drivers:", targetUserIds);
      return new Response(JSON.stringify({ skipped: true, reason: "no subscriptions" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[notify-driver] Found ${subscriptions.length} subscriptions for ${targetUserIds.length} drivers`);

    const title = "🚛 Nova solicitação disponível!";
    const message = `De: ${record.origin_address}\nPara: ${record.destination_address}`;

    const notificationPayload = JSON.stringify({
      title,
      body: message,
      tag: `request-${record.id}`,
      data: {
        request_id: record.id,
        request_number: record.request_number,
        type: "new_request",
      },
    });

    let sent = 0;
    let failed = 0;
    const expiredEndpoints: string[] = [];

    for (const sub of subscriptions) {
      try {
        const encrypted = await encryptPayload(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          notificationPayload
        );

        const vapidHeaders = await generateVapidAuthHeader(
          sub.endpoint,
          VAPID_SUBJECT,
          VAPID_PUBLIC_KEY,
          VAPID_PRIVATE_KEY
        );

        const response = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            "Content-Encoding": "aes128gcm",
            Authorization: vapidHeaders.authorization,
            TTL: "3600",
            Urgency: "high",
            Topic: `request-${record.id}`,
          },
          body: encrypted,
        });

        if (response.status === 201 || response.status === 200) {
          sent++;
          console.log(`[notify-driver] Push sent to ${sub.user_id}`);
        } else if (response.status === 410 || response.status === 404) {
          // Subscription expired, mark for cleanup
          expiredEndpoints.push(sub.endpoint);
          failed++;
          console.log(`[notify-driver] Subscription expired for ${sub.user_id}: ${response.status}`);
        } else {
          failed++;
          const text = await response.text();
          console.error(`[notify-driver] Push failed for ${sub.user_id}: ${response.status} ${text}`);
        }
      } catch (err) {
        failed++;
        console.error(`[notify-driver] Error sending to ${sub.user_id}:`, err);
      }
    }

    // Clean up expired subscriptions
    if (expiredEndpoints.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", expiredEndpoints);
      console.log(`[notify-driver] Cleaned ${expiredEndpoints.length} expired subscriptions`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent,
        failed,
        total_subscriptions: subscriptions.length,
        expired_cleaned: expiredEndpoints.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[notify-driver] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
