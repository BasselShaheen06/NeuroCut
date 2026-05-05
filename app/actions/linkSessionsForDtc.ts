"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"

/**
 * Pairs a completed ST session with a completed DT session,
 * then calls the Python engine to compute DTC.
 *
 * Called from the coach dashboard via a form action.
 */
export async function linkSessionsForDtc(formData: FormData) {
  const authSession = await auth()
  if (!authSession || authSession.user.role !== "COACH") {
    return { success: false, error: "Unauthorized" }
  }

  const stSessionId = formData.get("stSessionId") as string
  const dtSessionId = formData.get("dtSessionId") as string

  if (!stSessionId || !dtSessionId || stSessionId === dtSessionId) {
    return { success: false, error: "Invalid session IDs" }
  }

  // Verify both sessions are completed and belong to the same player
  const [st, dt] = await Promise.all([
    prisma.session.findUnique({ where: { id: stSessionId }, select: { status: true, conditionType: true, playerId: true } }),
    prisma.session.findUnique({ where: { id: dtSessionId }, select: { status: true, conditionType: true, playerId: true } }),
  ])

  if (!st || !dt) return { success: false, error: "One or both sessions not found" }
  if (st.status !== "completed" || dt.status !== "completed") return { success: false, error: "Both sessions must be completed first" }
  if (st.playerId !== dt.playerId) return { success: false, error: "Sessions belong to different players" }
  if (st.conditionType !== "ST") return { success: false, error: "First session must be ST (Single-Task)" }
  if (dt.conditionType !== "DT") return { success: false, error: "Second session must be DT (Dual-Task)" }

  // Call Python engine
  try {
    const res = await fetch("http://localhost:8000/api/calculate-dtc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ st_session_id: stSessionId, dt_session_id: dtSessionId }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return { success: false, error: body.detail ?? "Python engine error" }
    }

    const data = await res.json()
    revalidatePath(`/sessions/${dtSessionId}`)
    return { success: true, dtc: data.dtc }
  } catch {
    return { success: false, error: "Python engine is offline" }
  }
}