import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

/**
 * Generates realistic dummy IMU CSV data for a session.
 * The data simulates foot-mounted IMU recordings during a Y-Drill:
 * - 100 Hz sampling rate
 * - Columns: timestamp, GyrX, GyrY, GyrZ, AccX, AccY, AccZ
 * - Gait-like cyclical acceleration patterns with noise
 * - Synced to stimulus run timestamps if available
 */
export async function POST(request: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { sessionId } = await request.json()
  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 })
  }

  // Fetch stimulus runs to sync IMU timestamps
  const dbSession = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { stimulusRuns: { orderBy: { trialIndex: "asc" } } },
  })

  if (!dbSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 })
  }

  const fs = 100 // 100 Hz sampling rate
  const durationSeconds = 30 // 30 seconds of data
  const numSamples = fs * durationSeconds

  // Base timestamp: use first stimulus cue time minus 2 seconds, or now
  const firstCueTime =
    dbSession.stimulusRuns.length > 0 && dbSession.stimulusRuns[0].cuedAt
      ? dbSession.stimulusRuns[0].cuedAt
      : Date.now()
  const startTime = firstCueTime - 2000

  // Helper: generate gait-like acceleration pattern
  function generateGaitSignal(
    sampleIndex: number,
    axis: "x" | "y" | "z"
  ): number {
    const t = sampleIndex / fs
    // Stride frequency ~1.0-1.2 Hz (normal walking)
    const strideFreq = 1.1
    const phase = 2 * Math.PI * strideFreq * t

    let base: number
    switch (axis) {
      case "x": // Mediolateral
        base = 0.15 * Math.sin(phase * 2) + 0.05 * Math.sin(phase * 3.7)
        break
      case "y": // Anteroposterior
        base =
          0.4 * Math.sin(phase) +
          0.2 * Math.sin(phase * 2) +
          0.08 * Math.cos(phase * 3)
        break
      case "z": // Vertical (dominant in foot-mounted IMU)
        base =
          9.81 +
          2.5 * Math.abs(Math.sin(phase)) +
          1.2 * Math.sin(phase * 2) -
          0.5 * Math.cos(phase * 3)
        // Heel strike spikes
        const heelPhase = ((phase % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
        if (heelPhase > 5.5 && heelPhase < 6.0) {
          base += 4.0 * Math.exp(-((heelPhase - 5.7) * (heelPhase - 5.7)) * 20)
        }
        break
    }

    // Add sensor noise (±0.02g)
    const noise = (Math.random() - 0.5) * 0.04
    return base + noise
  }

  function generateGyroSignal(sampleIndex: number, axis: "x" | "y" | "z"): number {
    const t = sampleIndex / fs
    const strideFreq = 1.1
    const phase = 2 * Math.PI * strideFreq * t

    let base: number
    switch (axis) {
      case "x":
        base = 45 * Math.sin(phase) + 15 * Math.sin(phase * 2)
        break
      case "y":
        base = 20 * Math.cos(phase) + 10 * Math.sin(phase * 3)
        break
      case "z":
        base = 30 * Math.sin(phase * 1.5) + 8 * Math.cos(phase * 2.5)
        break
    }

    // Gyro noise ±2 deg/s
    const noise = (Math.random() - 0.5) * 4
    return base + noise
  }

  // Build CSV
  const header = "timestamp,GyrX,GyrY,GyrZ,AccX,AccY,AccZ"
  const rows: string[] = [header]

  for (let i = 0; i < numSamples; i++) {
    const timestamp = startTime + (i / fs) * 1000 // ms
    const gyrX = generateGyroSignal(i, "x").toFixed(4)
    const gyrY = generateGyroSignal(i, "y").toFixed(4)
    const gyrZ = generateGyroSignal(i, "z").toFixed(4)
    const accX = generateGaitSignal(i, "x").toFixed(4)
    const accY = generateGaitSignal(i, "y").toFixed(4)
    const accZ = generateGaitSignal(i, "z").toFixed(4)
    rows.push(`${timestamp.toFixed(1)},${gyrX},${gyrY},${gyrZ},${accX},${accY},${accZ}`)
  }

  const csvContent = rows.join("\n")

  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="dummy_imu_${sessionId.slice(0, 8)}.csv"`,
    },
  })
}
