// Supabase Edge Function: upload-avatar
// Handles secure Cloudinary profile photo uploads with server-side authentication,
// backend file type & size validation, rate limiting, and Cloudinary signed upload API.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function getCorsHeaders(req: Request) {
  const requestOrigin = req.headers.get('origin') || '';
  const allowedEnv = Deno.env.get('ALLOWED_ORIGIN');

  let allowOrigin = '*';
  if (allowedEnv && allowedEnv !== '*') {
    const allowedList = allowedEnv.split(',').map((s) => s.trim());
    if (
      allowedList.includes(requestOrigin) ||
      requestOrigin.startsWith('http://localhost') ||
      requestOrigin.startsWith('http://127.0.0.1')
    ) {
      allowOrigin = requestOrigin;
    } else {
      allowOrigin = allowedList[0];
    }
  }

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

// In-memory per-user rate limiter (max 10 avatar uploads per hour per user)
const avatarRateLimitMap = new Map<string, { count: number; resetAt: number }>();
const AVATAR_RATE_LIMIT_MAX = 10;
const AVATAR_RATE_LIMIT_WINDOW_MS = 3600_000; // 1 hour

function checkAvatarRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = avatarRateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    avatarRateLimitMap.set(userId, { count: 1, resetAt: now + AVATAR_RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= AVATAR_RATE_LIMIT_MAX) return false;
  entry.count += 1;
  return true;
}

// Maximum file constraints
const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

async function sha1(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Strict Authentication Check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Acesso negado. Token de autenticação ausente.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Sessão inválida ou expirada. Faça login novamente.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Rate Limiting Check
    if (!checkAvatarRateLimit(user.id)) {
      return new Response(
        JSON.stringify({ error: 'Limite de trocas de foto por hora atingido (máx. 10 por hora).' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Parse JSON Body
    const body = await req.json();
    const { file_base64, mime_type } = body as { file_base64?: string; mime_type?: string };

    if (!file_base64 || typeof file_base64 !== 'string') {
      return new Response(
        JSON.stringify({ error: 'O arquivo de imagem em base64 é obrigatório.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Backend File Type Validation
    const cleanMime = (mime_type || '').toLowerCase().trim();
    if (!ALLOWED_MIME_TYPES.includes(cleanMime)) {
      return new Response(
        JSON.stringify({ error: 'Formato de arquivo não suportado. Envie uma imagem JPG, PNG ou WebP.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Backend File Size Validation (Approx Base64 Size calculation)
    const base64Clean = file_base64.replace(/^data:image\/[a-z]+;base64,/, '');
    const estimatedBytes = Math.ceil((base64Clean.length * 3) / 4);

    if (estimatedBytes > MAX_AVATAR_BYTES) {
      return new Response(
        JSON.stringify({ error: 'A imagem excede o tamanho máximo permitido de 5MB.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Retrieve Cloudinary Secrets
    const cloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME');
    const apiKey = Deno.env.get('CLOUDINARY_API_KEY');
    const apiSecret = Deno.env.get('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      return new Response(
        JSON.stringify({ error: 'Serviço Cloudinary não configurado nos Secrets do Supabase (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET).' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7. Signed Cloudinary Upload
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = 'avatars';
    const publicId = `user_${user.id}`;

    // Alphabetical string for SHA1 signature
    const signatureStr = `folder=${folder}&invalidate=true&overwrite=true&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = await sha1(signatureStr);

    const formData = new FormData();
    formData.append('file', `data:${cleanMime};base64,${base64Clean}`);
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp.toString());
    formData.append('folder', folder);
    formData.append('public_id', publicId);
    formData.append('overwrite', 'true');
    formData.append('invalidate', 'true');
    formData.append('signature', signature);

    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    const cRes = await fetch(cloudinaryUrl, {
      method: 'POST',
      body: formData,
    });

    if (!cRes.ok) {
      const errText = await cRes.text().catch(() => '');
      console.error('[Cloudinary Upload Error]:', errText);
      return new Response(
        JSON.stringify({ error: 'Falha ao processar a imagem na Cloudinary.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cData = await cRes.json();
    const avatarUrl = cData.secure_url || cData.url;

    // 8. Update User Metadata in Supabase Auth
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (serviceRoleKey) {
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        user_metadata: { ...user.user_metadata, avatar_url: avatarUrl },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        avatar_url: avatarUrl,
        message: 'Foto de perfil atualizada com sucesso!',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[upload-avatar Edge Function Error]:', err);
    return new Response(
      JSON.stringify({ error: 'Ocorreu um erro interno ao enviar a foto de perfil.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
