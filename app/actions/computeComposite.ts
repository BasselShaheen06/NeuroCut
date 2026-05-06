"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

/**
 * Computes the final composite readiness score from all session metrics.
 * 
 * Composite = weighted combination of:
 *   - ACL-RSI (30%)  — psychological readiness
 *   - RT Score (25%)  — reaction time performance
 *   - DTC (20%)       — dual-task cost if available
 *   - ML Score (25%)  — model confidence
 * 
 * Final recommendation:
 *   ≥ 75 → CLEARED
 *   ≥ 55 → CONDITIONAL
 *   < 55 → WITHHELD
 */
export async function computeCompositeScore(sessionId: string) {
  const authSession = await auth()
  if (!authSession) return { success: false, error: "Unauthorized" }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      aclRsiResult: true,
      analysisResult: true,
      stimulusRuns: true,
    },
  })

  if (!session) return { success: false, error: "Session not found" }

  // ── ACL-RSI component (0-100) ──
  const aclScore = session.aclRsiResult?.compositeScore ?? null
  const aclNormalized = aclScore ?? 50 // Default to midpoint if missing

  // ── RT component (0-100 scale, lower RT = higher score) ──
  const validRuns = session.stimulusRuns.filter(
    (r) => r.reactionTimeMs !== null && r.reactionTimeMs > 0
  )
  let rtScore = 50
  if (validRuns.length > 0) {
    const meanRT =
      validRuns.reduce((s, r) => s + (r.reactionTimeMs ?? 0), 0) / validRuns.length
    // Scale: 200ms = 100, 600ms = 0
    rtScore = Math.max(0, Math.min(100, ((600 - meanRT) / 400) * 100))
  }

  // ── RT variability component (CV) ──
  let rtCV = 0
  if (validRuns.length > 1) {
    const meanRT =
      validRuns.reduce((s, r) => s + (r.reactionTimeMs ?? 0), 0) / validRuns.length
    const variance =
      validRuns.reduce((acc, r) => {
        const d = (r.reactionTimeMs ?? 0) - meanRT
        return acc + d * d
      }, 0) / validRuns.length
    rtCV = (Math.sqrt(variance) / meanRT) * 100
  }

  // ── DTC component (0-100 scale, lower DTC = higher score) ──
  const dtcRaw = session.analysisResult?.dtcScore ?? null
  let dtcScore = 50
  let hasDtc = false
  if (dtcRaw !== null) {
    hasDtc = true
    // Scale: 0% DTC = 100, 30% DTC = 0
    dtcScore = Math.max(0, Math.min(100, ((30 - Math.abs(dtcRaw)) / 30) * 100))
  }

  // ── ML component (0-100 scale) ──
  const mlRaw = session.analysisResult?.mlScore ?? null
  let mlScore = 50
  if (mlRaw !== null) {
    // mlScore is P(DualTask). For clearance:
    // prediction=0 (ST pattern) = healthy gait, higher clearance score
    // Lower mlScore = better (more like single-task)
    mlScore = (1 - mlRaw) * 100
  }

  // ── Weighted composite ──
  let composite: number
  let weights: { acl: number; rt: number; dtc: number; ml: number }
  
  if (hasDtc && mlRaw !== null) {
    weights = { acl: 0.30, rt: 0.25, dtc: 0.20, ml: 0.25 }
  } else if (mlRaw !== null) {
    weights = { acl: 0.35, rt: 0.30, dtc: 0, ml: 0.35 }
  } else if (hasDtc) {
    weights = { acl: 0.35, rt: 0.30, dtc: 0.35, ml: 0 }
  } else {
    weights = { acl: 0.45, rt: 0.55, dtc: 0, ml: 0 }
  }

  composite =
    aclNormalized * weights.acl +
    rtScore * weights.rt +
    dtcScore * weights.dtc +
    mlScore * weights.ml

  composite = parseFloat(composite.toFixed(1))

  // ── Recommendation ──
  let recommendation: string
  if (composite >= 75) recommendation = "CLEARED"
  else if (composite >= 55) recommendation = "CONDITIONAL"
  else recommendation = "WITHHELD"

  // ── Persist ──
  try {
    if (session.analysisResult) {
      await prisma.analysisResult.update({
        where: { sessionId },
        data: {
          compositeScore: composite,
          recommendation,
          rtMean: validRuns.length > 0
            ? validRuns.reduce((s, r) => s + (r.reactionTimeMs ?? 0), 0) / validRuns.length
            : undefined,
          rtCV: rtCV > 0 ? rtCV : undefined,
        },
      })
    } else {
      await prisma.analysisResult.create({
        data: {
          sessionId,
          compositeScore: composite,
          recommendation,
          rtMean: validRuns.length > 0
            ? validRuns.reduce((s, r) => s + (r.reactionTimeMs ?? 0), 0) / validRuns.length
            : null,
          rtCV: rtCV > 0 ? rtCV : null,
        },
      })
    }

    // Mark session as completed
    await prisma.session.update({
      where: { id: sessionId },
      data: { status: "completed" },
    })

    return {
      success: true,
      composite,
      recommendation,
      breakdown: {
        aclRsi: { score: aclNormalized, weight: weights.acl },
        rt: { score: rtScore, weight: weights.rt, meanMs: validRuns.length > 0
          ? validRuns.reduce((s, r) => s + (r.reactionTimeMs ?? 0), 0) / validRuns.length : null, cv: rtCV },
        dtc: { score: dtcScore, weight: weights.dtc, raw: dtcRaw },
        ml: { score: mlScore, weight: weights.ml, raw: mlRaw },
      },
    }
  } catch (e) {
    console.error("Composite score save failed:", e)
    return { success: false, error: "Database write failed" }
  }
}
