"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

type StimulusRunInput = {
  trialIndex: number
  direction: string
  cuedAt: number         // Unix timestamp ms — when the visual cue appeared
  respondedAt: number    // Unix timestamp ms — when player pressed the key
  reactionTimeMs: number // respondedAt - cuedAt (measured via performance.now())
}

/**
 * Attaches stimulus run data (with browser-measured reaction times) to an
 * existing session. Called after the visual stimulus protocol is completed.
 *
 * Unlike `saveVisualSession`, this does NOT create a new session — it adds
 * StimulusRun records to the session that was already created during the
 * ACL-RSI questionnaire step.
 */
export async function saveStimulusRuns(
  sessionId: string,
  runs: StimulusRunInput[]
) {
  const authSession = await auth()
  if (!authSession) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    // Verify the session exists
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    })

    if (!session) {
      return { success: false, error: "Session not found" }
    }

    // Create all stimulus runs in a transaction
    await prisma.$transaction(
      runs.map((run) =>
        prisma.stimulusRun.create({
          data: {
            sessionId,
            trialIndex: run.trialIndex,
            direction: run.direction,
            cuedAt: run.cuedAt,
            respondedAt: run.respondedAt,
            reactionTimeMs: run.reactionTimeMs,
          },
        })
      )
    )

    return { success: true }
  } catch (error) {
    console.error("Failed to save stimulus runs:", error)
    return { success: false, error: "Database write failed" }
  }
}
