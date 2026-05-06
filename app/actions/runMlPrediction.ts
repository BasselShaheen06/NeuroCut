"use server"

import { auth } from "@/lib/auth"

interface PredictionResult {
  success: boolean
  prediction?: number
  prediction_label?: string
  probability?: number
  recommendation?: string
  feature_importances?: Record<string, number>
  strides_used?: number
  error?: string
}

export async function runMlPrediction(sessionId: string): Promise<PredictionResult> {
  // 1. Auth check
  const session = await auth()
  if (!session || !["COACH", "PLAYER"].includes(session.user.role)) {
    return { success: false, error: "Unauthorized access" }
  }

  if (!sessionId) {
    return { success: false, error: "Missing session ID" }
  }

  try {
    // 2. Call FastAPI prediction endpoint
    const response = await fetch("http://localhost:8000/api/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const detail = errorData?.detail || `Prediction failed (HTTP ${response.status})`
      console.error("ML prediction error:", detail)
      return { success: false, error: detail }
    }

    const data = await response.json()

    return {
      success: true,
      prediction: data.prediction,
      prediction_label: data.prediction_label,
      probability: data.probability,
      recommendation: data.recommendation,
      feature_importances: data.feature_importances,
      strides_used: data.strides_used,
    }
  } catch (error) {
    console.error("Could not reach Python server for ML prediction:", error)
    return {
      success: false,
      error: "ML engine is offline. Ensure FastAPI is running on port 8000.",
    }
  }
}
