"use server"

import { auth } from "@/lib/auth"

function normalizeErrorDetail(detail: unknown): string {
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (item && typeof item === "object" && "msg" in item) {
          return String((item as { msg?: unknown }).msg ?? "")
        }
        return String(item)
      })
      .filter((text) => text.length > 0)
      .join("; ")
  }

  if (detail && typeof detail === "object") {
    return JSON.stringify(detail)
  }

  return typeof detail === "string" ? detail : "Unknown error"
}

export async function uploadInjectedFeatures(formData: FormData) {
  const session = await auth()
  if (!session) {
    return { success: false, error: "Unauthorized access" }
  }

  const file = formData.get("file") as File
  const sessionId = formData.get("sessionId") as string

  if (!file || !sessionId) {
    return { success: false, error: "Missing file or session ID" }
  }

  try {
    const response = await fetch("http://localhost:8000/api/inject-features", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const detail = errorData?.detail
        ? normalizeErrorDetail(errorData.detail)
        : `Injection failed (HTTP ${response.status})`
      console.error("Injected feature upload error:", detail)
      return { success: false, error: detail }
    }

    const data = await response.json()
    return {
      success: true,
      strides_extracted: data.strides_extracted,
    }
  } catch (error) {
    console.error("Could not reach Python server for feature injection:", error)
    return {
      success: false,
      error: "ML engine is offline. Ensure FastAPI is running on port 8000.",
    }
  }
}
