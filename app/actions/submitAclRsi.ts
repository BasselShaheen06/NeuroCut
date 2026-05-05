"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// Questions 2,3,6,7,9,10 are reverse-scored:
// the "bad" end is 10, so raw score must be flipped: score = 10 - raw
const REVERSED_QUESTIONS = new Set([2, 3, 6, 7, 9, 10])

function computeSubscales(raw: Record<number, number>) {
  // ACL-RSI subscales (Webster & Feller, 2018):
  //   Emotions    : Q3, Q6, Q7, Q9
  //   Confidence  : Q1, Q4, Q5, Q8, Q11
  //   Risk        : Q2, Q10, Q12
  const normalize = (qId: number) => {
    const v = raw[qId] ?? 0
    return REVERSED_QUESTIONS.has(qId) ? 10 - v : v
  }

  const emotions   = [3, 6, 7, 9].map(normalize)
  const confidence = [1, 4, 5, 8, 11].map(normalize)
  const risk       = [2, 10, 12].map(normalize)

  const avg = (arr: number[]) =>
    (arr.reduce((a, b) => a + b, 0) / arr.length / 10) * 100

  return {
    subscaleEmotions:   avg(emotions),
    subscaleConfidence: avg(confidence),
    subscaleRisk:       avg(risk),
  }
}

export async function submitAclRsi(rawAnswers: Record<number, number>) {
  const authSession = await auth()
  if (!authSession || authSession.user.role !== "PLAYER") {
    return { success: false as const, error: "Unauthorized" }
  }

  // Look up the player profile
  const player = await prisma.player.findUnique({
    where: { userId: authSession.user.id },
    select: { id: true },
  })
  if (!player) return { success: false as const, error: "Player profile not found" }

  // Compute scores
  const normalizedValues = Object.entries(rawAnswers).map(([qId, v]) =>
    REVERSED_QUESTIONS.has(Number(qId)) ? 10 - v : v
  )
  const compositeScore = parseFloat(
    ((normalizedValues.reduce((a, b) => a + b, 0) / 120) * 100).toFixed(1)
  )
  const { subscaleEmotions, subscaleConfidence, subscaleRisk } =
    computeSubscales(rawAnswers)

  const readinessLevel =
    compositeScore >= 77 ? "READY" : compositeScore >= 56 ? "BORDERLINE" : "NOT_READY"

  try {
    // Create Session + AclRsiResult in one transaction
    const newSession = await prisma.session.create({
      data: {
        playerId: player.id,
        status: "pending",
        aclRsiResult: {
          create: {
            compositeScore,
            subscaleEmotions,
            subscaleConfidence,
            subscaleRisk,
            rawResponses: rawAnswers,
            readinessLevel,
          },
        },
      },
    })

    return { success: true as const, sessionId: newSession.id, compositeScore, readinessLevel }
  } catch (e) {
    console.error("ACL-RSI save failed:", e)
    return { success: false as const, error: "Database write failed" }
  }
}