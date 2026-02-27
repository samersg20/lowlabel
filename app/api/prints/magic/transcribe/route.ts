import { NextResponse } from "next/server";
import { withTenantTx } from "@/lib/tenant-tx";
import { transcribeAudio } from "@/lib/openai-transcribe";
import { resolveItemsFast } from "@/lib/magic-resolver";
import { segmentMagicInput } from "@/lib/magic-segmentation";
import { sanitizeText } from "@/lib/magic-text";
import { requireUnitForTenant } from "@/lib/unit-validation";

const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };

function json(data: any, init?: { status?: number; headers?: HeadersInit }) {
  return NextResponse.json(data, {
    ...init,
    headers: { ...JSON_HEADERS, ...(init?.headers || {}) },
  });
}

export async function POST(req: Request) {
  try {
    console.time("magic_transcribe");
    return await withTenantTx(req, async ({ db, tenantId, session }) => {
      const form = await req.formData();
      const audioField = form.get("audio");
      if (!(audioField instanceof File)) {
        return json({ error: "Arquivo de áudio é obrigatório" }, { status: 400 });
      }

      try {
        await requireUnitForTenant(db, session.user.unit);
      } catch {
        return json({ error: "Unidade inválida" }, { status: 400 });
      }

      const [textPtRaw, textEnRaw] = await Promise.all([
        transcribeAudio(audioField, "pt"),
        transcribeAudio(audioField, "en"),
      ]);

      const textPt = sanitizeText(textPtRaw).trim();
      const textEn = sanitizeText(textEnRaw).trim();

      async function scoreText(text: string) {
        if (!text) return { score: 0, avgConfidence: 0, coverage: 0 };
        const segments = segmentMagicInput(text);
        if (!segments.length) return { score: 0, avgConfidence: 0, coverage: 0 };
        const resolved = await resolveItemsFast({ segments, tenantId }, db);
        const total = segments.length;
        const resolvedCount = resolved.filter((entry) => entry.itemId).length;
        const avgConfidence = resolved.reduce((sum, entry) => sum + (entry.confidence || 0), 0) / total;
        const coverage = resolvedCount / total;
        const score = coverage * 0.6 + avgConfidence * 0.4;
        return { score, avgConfidence, coverage };
      }

      const [scorePt, scoreEn] = await Promise.all([scoreText(textPt), scoreText(textEn)]);
      const pickedLanguage = scoreEn.score > scorePt.score ? "en" : "pt";
      const text = pickedLanguage === "en" ? textEn : textPt;

      if (!text) {
        return json({ error: "Transcrição vazia" }, { status: 400 });
      }

      return json({
        text,
        pickedLanguage,
        altTextPt: textPt,
        altTextEn: textEn,
      });
    });
  } catch (error: any) {
    return json({ error: error?.message || "Erro ao transcrever áudio" }, { status: 500 });
  } finally {
    console.timeEnd("magic_transcribe");
  }
}
