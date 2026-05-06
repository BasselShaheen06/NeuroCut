import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

/**
 * Generates realistic dummy precomputed gait features CSV.
 * Matches the format expected by /api/inject-features.
 * 8-12 strides with realistic biomechanical values.
 */
export async function POST() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const numStrides = 8 + Math.floor(Math.random() * 5) // 8-12 strides

  const header =
    "stride_lengths,stride_times,swing_times,stance_times,stance_ratios,clearances_min,clearances_max"
  const rows: string[] = [header]

  for (let i = 0; i < numStrides; i++) {
    // Realistic gait values based on DUO-GAIT dataset ranges
    const strideLength = (1.2 + Math.random() * 0.4).toFixed(4) // 1.2-1.6 m
    const strideTime = (1.0 + Math.random() * 0.3).toFixed(4) // 1.0-1.3 s
    const swingTime = (0.35 + Math.random() * 0.1).toFixed(4) // 0.35-0.45 s
    const stanceTime = (0.55 + Math.random() * 0.2).toFixed(4) // 0.55-0.75 s
    const stanceRatio = (55 + Math.random() * 10).toFixed(4) // 55-65%
    const clearanceMin = (1.5 + Math.random() * 1.0).toFixed(4) // 1.5-2.5 cm
    const clearanceMax = (12 + Math.random() * 6).toFixed(4) // 12-18 cm

    rows.push(
      `${strideLength},${strideTime},${swingTime},${stanceTime},${stanceRatio},${clearanceMin},${clearanceMax}`
    )
  }

  const csvContent = rows.join("\n")

  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="dummy_gait_features.csv"`,
    },
  })
}
