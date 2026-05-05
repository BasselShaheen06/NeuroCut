"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

type TrialCue = {
  trialIndex: number
  direction: string
  absoluteTimestampMs: number
}

export async function saveVisualSession(playerId: string, cueLogs: TrialCue[]) {
  // 1. Verify the coach is securely logged in
  const session = await auth()
  if (!session || session.user.role !== "COACH") {
    return { success: false, error: "Unauthorized access" }
  }

  try {
    // 2. Create the Session and safely nest the StimulusRuns in one transaction
    const newSession = await prisma.session.create({
      data: {
        playerId: playerId,
        status: "pending", // matches your schema default
        stimulusRuns: {
          create: cueLogs.map((log) => ({
            trialIndex: log.trialIndex,
            direction: log.direction,
            cuedAt: log.absoluteTimestampMs, // Maps perfectly to the Float? in your schema
          }))
        }
      }
    })

    return { success: true, sessionId: newSession.id }
  } catch (error) {
    console.error("Failed to save session:", error)
    return { success: false, error: "Database write failed" }
  }
}