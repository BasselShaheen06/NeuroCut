"use client"

import { useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { uploadImuData } from "@/app/actions/uploadImu"
import { runMlPrediction } from "@/app/actions/runMlPrediction"

type FlowStep = "upload" | "predict" | "results"
type StepStatus = "idle" | "loading" | "done" | "error"

export default function ImuUploadScreen() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = searchParams.get("sessionId")

  // Step states
  const [currentStep, setCurrentStep] = useState<FlowStep>("upload")
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  // Step 1: Upload
  const [uploadStatus, setUploadStatus] = useState<StepStatus>("idle")
  const [uploadResult, setUploadResult] = useState<{
    strides?: number
    meanRt?: number
  } | null>(null)

  // Step 2: Predict
  const [predictStatus, setPredictStatus] = useState<StepStatus>("idle")
  const [predictResult, setPredictResult] = useState<{
    label?: string
    probability?: number
    recommendation?: string
  } | null>(null)

  // Errors
  const [error, setError] = useState<string | null>(null)

  const handleDragOver = (e: React.DragEvent) => e.preventDefault()

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile.name.endsWith(".csv")) {
        setFile(droppedFile)
        setError(null)
      } else {
        setError("Please upload a valid .csv file from the IMU sensor.")
      }
    }
  }

  // ─── Step 1: Upload & Extract Features ─────────────────────
  const handleUpload = async () => {
    if (!file || !sessionId) return
    setError(null)
    setIsUploading(true)
    setUploadStatus("loading")

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("sessionId", sessionId)

      const result = await uploadImuData(formData)

      if (result.success) {
        setUploadStatus("done")
        setUploadResult({
          strides: (result as Record<string, unknown>).strides_extracted as number | undefined,
          meanRt: (result as Record<string, unknown>).mean_reaction_time as number | undefined,
        })
        setCurrentStep("predict")
      } else {
        setUploadStatus("error")
        setError(result.error ?? "Upload failed")
        setIsUploading(false)
      }
    } catch (err) {
      console.error("Upload error:", err)
      setUploadStatus("error")
      setError("Network error — please try again.")
      setIsUploading(false)
    }
  }

  // ─── Step 2: Feed into ML Model ────────────────────────────
  const handlePredict = async () => {
    if (!sessionId) return
    setError(null)
    setPredictStatus("loading")

    try {
      const result = await runMlPrediction(sessionId)

      if (result.success) {
        setPredictStatus("done")
        setPredictResult({
          label: result.prediction_label,
          probability: result.probability,
          recommendation: result.recommendation,
        })
        setCurrentStep("results")
      } else {
        setPredictStatus("error")
        setError(result.error ?? "Prediction failed")
      }
    } catch (err) {
      console.error("Prediction error:", err)
      setPredictStatus("error")
      setError("ML prediction failed — please try again.")
    }
  }

  // ─── Step 3: Show Results ──────────────────────────────────
  const handleShowResults = () => {
    if (!sessionId) return
    router.push(`/sessions/${sessionId}`)
  }

  // ─── Helper: recommendation badge color ────────────────────
  const getRecBadge = (rec: string) => {
    switch (rec) {
      case "CLEARED":
        return "bg-[var(--color-green-500)]/15 text-[var(--color-green-500)] border-[var(--color-green-500)]"
      case "CONDITIONAL":
        return "bg-[var(--color-amber-500)]/15 text-[var(--color-amber-500)] border-[var(--color-amber-500)]"
      case "WITHHELD":
        return "bg-[var(--color-red-500)]/15 text-[var(--color-red-500)] border-[var(--color-red-500)]"
      default:
        return "bg-[var(--color-text-disabled)]/15 text-[var(--color-text-disabled)]"
    }
  }

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-base)]">
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-bold text-[var(--color-red-500)]">Missing Session ID</h1>
          <p className="text-[var(--color-text-secondary)]">Please complete the stimulus protocol first.</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen p-8 flex flex-col items-center justify-center bg-[var(--color-bg-base)]">
      <div className="max-w-2xl w-full bg-[var(--color-bg-surface)] p-8 rounded-xl border border-[var(--color-bg-border)] shadow-xl">

        {/* ─── Progress Indicator ─────────────────────────── */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {["Upload IMU", "Run Model", "View Results"].map((label, i) => {
            const steps: FlowStep[] = ["upload", "predict", "results"]
            const stepIdx = steps.indexOf(currentStep)
            const isActive = i === stepIdx
            const isDone = i < stepIdx
            return (
              <div key={label} className="flex items-center gap-2">
                {i > 0 && (
                  <div className={`w-8 h-px ${isDone ? "bg-[var(--color-green-500)]" : "bg-[var(--color-bg-border)]"}`} />
                )}
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border transition-all ${
                  isDone
                    ? "bg-[var(--color-green-500)]/15 border-[var(--color-green-500)] text-[var(--color-green-500)]"
                    : isActive
                      ? "bg-[var(--color-cyan-500)]/15 border-[var(--color-cyan-500)] text-[var(--color-cyan-500)]"
                      : "bg-transparent border-[var(--color-bg-border)] text-[var(--color-text-disabled)]"
                }`}>
                  {isDone ? "✓" : i + 1}
                  <span className="hidden sm:inline">{label}</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* ─── Step 1: Upload ─────────────────────────────── */}
        <section className={`mb-6 p-5 rounded-lg border transition-all ${
          uploadStatus === "done"
            ? "border-[var(--color-green-500)]/30 bg-[var(--color-green-500)]/5"
            : currentStep === "upload"
              ? "border-[var(--color-cyan-500)]/30 bg-[var(--color-cyan-500)]/5"
              : "border-[var(--color-bg-border)] opacity-60"
        }`}>
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-3 flex items-center gap-2">
            {uploadStatus === "done" ? (
              <span className="text-[var(--color-green-500)]">✓</span>
            ) : (
              <span className="text-[var(--color-cyan-500)]">1</span>
            )}
            Upload &amp; Extract Gait Features
          </h2>

          {uploadStatus === "loading" && (
            <div className="bg-[var(--color-amber-500)]/10 border border-[var(--color-amber-500)] text-[var(--color-amber-500)] p-4 rounded-lg text-center font-bold mb-4 animate-pulse">
              <p>⚙️ Processing IMU data...</p>
              <p className="text-xs font-normal mt-1 opacity-70">
                Butterworth filtering → IC/FO detection → Stride segmentation → ZUPT
              </p>
            </div>
          )}

          {uploadStatus === "done" && (
            <div className="bg-[var(--color-green-500)]/10 border border-[var(--color-green-500)] text-[var(--color-green-500)] p-3 rounded-lg text-sm font-bold mb-3">
              ✓ Features extracted
              {uploadResult?.strides != null && (
                <span className="font-normal ml-2">
                  — {uploadResult.strides} strides detected
                </span>
              )}
            </div>
          )}

          {currentStep === "upload" && uploadStatus !== "loading" && (
            <>
              {/* Drag & Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 mb-4 transition-colors text-center ${
                  file
                    ? "border-[var(--color-green-500)] bg-[var(--color-green-500)]/5"
                    : "border-[var(--color-bg-border)] hover:border-[var(--color-cyan-500)]"
                }`}
              >
                {file ? (
                  <div className="space-y-2">
                    <div className="text-[var(--color-green-500)] font-bold text-lg">✓ File Selected</div>
                    <div className="font-mono text-sm text-[var(--color-text-secondary)]">{file.name}</div>
                    <div className="text-xs text-[var(--color-text-disabled)]">
                      {(file.size / 1024).toFixed(1)} KB
                    </div>
                    <button
                      onClick={() => { setFile(null); setError(null) }}
                      className="text-xs text-[var(--color-red-500)] hover:underline mt-1"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-[var(--color-text-disabled)] font-bold">
                      Drag and drop IMU .csv file here
                    </div>
                    <div className="text-xs text-[var(--color-text-secondary)]">
                      Expected: timestamp, GyrX, GyrY, GyrZ, AccX, AccY, AccZ
                    </div>
                    <input
                      type="file"
                      accept=".csv"
                      className="hidden"
                      id="file-upload"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setFile(e.target.files[0])
                          setError(null)
                        }
                      }}
                    />
                    <label
                      htmlFor="file-upload"
                      className="block mt-3 text-[var(--color-cyan-500)] cursor-pointer hover:underline text-sm font-bold uppercase tracking-wider"
                    >
                      Browse Files
                    </label>
                  </div>
                )}
              </div>

              <button
                onClick={handleUpload}
                disabled={!file || isUploading}
                className="w-full bg-[var(--color-amber-500)] text-[var(--color-bg-base)] font-bold py-3 rounded-md uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Upload &amp; Extract Features
              </button>
            </>
          )}
        </section>

        {/* ─── Step 2: Feed into Model ────────────────────── */}
        <section className={`mb-6 p-5 rounded-lg border transition-all ${
          predictStatus === "done"
            ? "border-[var(--color-green-500)]/30 bg-[var(--color-green-500)]/5"
            : currentStep === "predict"
              ? "border-[var(--color-cyan-500)]/30 bg-[var(--color-cyan-500)]/5"
              : "border-[var(--color-bg-border)] opacity-40"
        }`}>
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-3 flex items-center gap-2">
            {predictStatus === "done" ? (
              <span className="text-[var(--color-green-500)]">✓</span>
            ) : (
              <span className={currentStep === "predict" ? "text-[var(--color-cyan-500)]" : "text-[var(--color-text-disabled)]"}>2</span>
            )}
            Feed into ML Model
          </h2>

          {predictStatus === "loading" && (
            <div className="bg-[var(--color-amber-500)]/10 border border-[var(--color-amber-500)] text-[var(--color-amber-500)] p-4 rounded-lg text-center font-bold mb-4 animate-pulse">
              <p>🧠 Running Random Forest classifier...</p>
              <p className="text-xs font-normal mt-1 opacity-70">
                Feature engineering → Scaling → Prediction → Feature importance
              </p>
            </div>
          )}

          {predictStatus === "done" && predictResult && (
            <div className="space-y-3 mb-3">
              <div className="bg-[var(--color-green-500)]/10 border border-[var(--color-green-500)] text-[var(--color-green-500)] p-3 rounded-lg text-sm font-bold">
                ✓ Prediction complete
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[var(--color-bg-base)] p-3 rounded-lg text-center">
                  <div className="text-xs text-[var(--color-text-disabled)] uppercase mb-1">Classification</div>
                  <div className="text-lg font-bold text-[var(--color-text-primary)]">
                    {predictResult.label === "DT-Control" ? "Dual-Task" : "Single-Task"}
                  </div>
                </div>
                <div className="bg-[var(--color-bg-base)] p-3 rounded-lg text-center">
                  <div className="text-xs text-[var(--color-text-disabled)] uppercase mb-1">Confidence</div>
                  <div className="text-lg font-bold text-[var(--color-cyan-500)]">
                    {predictResult.probability != null ? `${(predictResult.probability * 100).toFixed(1)}%` : "—"}
                  </div>
                </div>
                <div className="bg-[var(--color-bg-base)] p-3 rounded-lg text-center">
                  <div className="text-xs text-[var(--color-text-disabled)] uppercase mb-1">Recommendation</div>
                  <div className={`inline-block px-2 py-1 rounded-full text-xs font-bold border ${getRecBadge(predictResult.recommendation ?? "")}`}>
                    {predictResult.recommendation ?? "—"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === "predict" && predictStatus !== "loading" && predictStatus !== "done" && (
            <button
              onClick={handlePredict}
              className="w-full bg-[var(--color-cyan-500)] text-[var(--color-bg-base)] font-bold py-3 rounded-md uppercase tracking-wider hover:opacity-90 transition-opacity"
            >
              🧠 Run ML Analysis
            </button>
          )}
        </section>

        {/* ─── Step 3: Show Results ───────────────────────── */}
        <section className={`p-5 rounded-lg border transition-all ${
          currentStep === "results"
            ? "border-[var(--color-cyan-500)]/30 bg-[var(--color-cyan-500)]/5"
            : "border-[var(--color-bg-border)] opacity-40"
        }`}>
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-3 flex items-center gap-2">
            <span className={currentStep === "results" ? "text-[var(--color-cyan-500)]" : "text-[var(--color-text-disabled)]"}>3</span>
            View Full Results
          </h2>

          {currentStep === "results" && (
            <button
              onClick={handleShowResults}
              className="w-full bg-[var(--color-green-500)] text-[var(--color-bg-base)] font-bold py-3 rounded-md uppercase tracking-wider hover:opacity-90 transition-opacity"
            >
              📊 Show Results Dashboard →
            </button>
          )}
        </section>

        {/* ─── Error Display ──────────────────────────────── */}
        {error && (
          <div className="mt-4 bg-[var(--color-red-500)]/10 border border-[var(--color-red-500)] text-[var(--color-red-500)] p-3 rounded-lg text-sm font-bold">
            {error}
          </div>
        )}

        {/* ─── Skip option ────────────────────────────────── */}
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push(`/sessions/${sessionId}`)}
            className="text-[var(--color-text-disabled)] hover:text-[var(--color-text-secondary)] text-xs transition-colors"
          >
            Skip — view available results only →
          </button>
        </div>

      </div>
    </main>
  )
}