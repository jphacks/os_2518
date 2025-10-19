import { NextRequest } from 'next/server';

import { requireUser } from '@/lib/auth/session';
import { isAppError } from '@/lib/errors';
import { error, ok } from '@/lib/http/responses';

const DEEPL_ENDPOINT = process.env.DEEPL_API_ENDPOINT ?? 'https://api-free.deepl.com/v2/translate';

function normalizeLang(code?: string | null) {
  if (!code) {
    return undefined;
  }
  return code.replace('_', '-').toUpperCase();
}

export async function POST(request: NextRequest) {
  try {
    await requireUser(request);

    const apiKey = process.env.DEEPL_API_KEY;
    if (!apiKey) {
      return error('DEEPL_API_KEY_MISSING', 'DeepL API key is not configured', 500);
    }

    const body = await request.json();
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    const sourceLang = normalizeLang(body.sourceLang);
    const targetLang = normalizeLang(body.targetLang);

    if (!text) {
      return error('INVALID_REQUEST', 'text is required', 400);
    }

    if (!targetLang) {
      return error('INVALID_REQUEST', 'targetLang is required', 400);
    }

    const params = new URLSearchParams();
    params.append('text', text);
    params.append('target_lang', targetLang);
    if (sourceLang) {
      params.append('source_lang', sourceLang);
    }

    const response = await fetch(DEEPL_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const payload = await response.text();
      console.error('DeepL API error', response.status, payload);
      return error('DEEPL_API_ERROR', 'Translation request failed', 502, { status: response.status, payload });
    }

    const data = (await response.json()) as {
      translations: Array<{ text: string; detected_source_language?: string }>;
    };

    const translation = data.translations?.[0]?.text ?? '';

    return ok({ translation });
  } catch (err) {
    if (isAppError(err)) {
      return error(err.code, err.message, err.status, err.details);
    }
    console.error('Translation error', err);
    return error('INTERNAL_SERVER_ERROR', 'Unexpected error', 500);
  }
}
