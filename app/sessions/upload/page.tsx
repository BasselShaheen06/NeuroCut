"use client"

import { useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { uploadImuData } from "@/app/actions/uploadImu"
import { uploadInjectedFeatures } from "@/app/actions/uploadInjectedFeatures"
import { runMlPrediction } from "@/app/actions/runMlPrediction"
import { computeCompositeScore } from "@/app/actions/computeComposite"
import { motion, AnimatePresence } from "framer-motion"

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
  const [uploadMode, setUploadMode] = useState<"imu" | "features">("imu")

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
  const [isGeneratingDummy, setIsGeneratingDummy] = useState(false)

  const handleDragOver = (e: React.DragEvent) => e.preventDefault()

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile.name.endsWith(".csv")) {
        setFile(droppedFile)
        setError(null)
      } else {
        setError("Please upload a valid .csv file.")
      }
    }
  }

  // ─── Generate Dummy IMU Data ────────────────────────────────
  const handleGenerateDummyImu = async () => {
    if (!sessionId) return
    setIsGeneratingDummy(true)
    setError(null)

    try {
      const endpoint =
        uploadMode === "features"
          ? "/api/generate-dummy-features"
          : "/api/generate-dummy-imu"

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })

      if (!res.ok) throw new Error("Failed to generate dummy data")

      const blob = await res.blob()
      const filename =
        uploadMode === "features"
          ? "dummy_gait_features.csv"
          : `dummy_imu_${sessionId.slice(0, 8)}.csv`
      const dummyFile = new File([blob], filename, { type: "text/csv" })
      setFile(dummyFile)
    } catch {
      setError("Failed to generate dummy data")
    } finally {
      setIsGeneratingDummy(false)
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

      const result =
        uploadMode === "features"
          ? await uploadInjectedFeatures(formData)
          : await uploadImuData(formData)

      if (result.success) {
        setUploadStatus("done")
        setUploadResult({
          strides: (result as Record<string, unknown>).strides_extracted as
            | number
            | undefined,
          meanRt: (result as Record<string, unknown>).mean_reaction_time as
            | number
            | undefined,
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

        // Also compute composite score
        await computeCompositeScore(sessionId)

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

  // ─── Skip ML, just compute composite from ACL-RSI + RT ─────
  const handleSkipMlAndComposite = async () => {
    if (!sessionId) return
    setError(null)
    setPredictStatus("loading")

    try {
      const result = await computeCompositeScore(sessionId)

      if (result.success) {
        setPredictStatus("done")
        setPredictResult({
          label: undefined,
          probability: undefined,
          recommendation: result.recommendation,
        })
        setCurrentStep("results")
      } else {
        setPredictStatus("error")
        setError(result.error ?? "Composite calculation failed")
      }
    } catch {
      setPredictStatus("error")
      setError("Composite calculation failed")
    }
  }

  // ─── Step 3: Show Results ──────────────────────────────────
  const handleShowResults = () => {
    if (!sessionId) return
    router.push(`/sessions/${sessionId}`)
  }

  const handleModeChange = (mode: "imu" | "features") => {
    setUploadMode(mode)
    setFile(null)
    setUploadStatus("idle")
    setUploadResult(null)
    setPredictStatus("idle")
    setPredictResult(null)
    setCurrentStep("upload")
    setError(null)
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
          <h1 className="text-2xl font-bold text-[var(--color-red-500)]">
            Missing Session ID
          </h1>
          <p className="text-[var(--color-text-secondary)]">
            Please complete the stimulus protocol first.
          </p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen p-8 flex flex-col items-center justify-center bg-[var(--color-bg-base)]">
      <motion.div
        className="max-w-2xl w-full bg-[var(--color-bg-surface)] p-8 rounded-xl border border-[var(--color-bg-border)] shadow-xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* ─── Header ─────────────────────────────────────── */}
        <div className="text-center mb-6">
          <p className="text-xs uppercase tracking-widest text-[var(--color-text-disabled)] font-bold mb-1">
            Step 3 of 4
          </p>
          <h1 className="text-2xl font-display font-bold text-[var(--color-cyan-500)]">
            Data Analysis Pipeline
          </h1>
        </div>

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
                  <motion.div
                    className={`w-8 h-px ${isDone ? "bg-[var(--color-green-500)]" : "bg-[var(--color-bg-border)]"}`}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: isDone ? 1 : 1 }}
                    transition={{ delay: 0.2 }}
                  />
                )}
                <motion.div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border transition-all ${
                    isDone
                      ? "bg-[var(--color-green-500)]/15 border-[var(--color-green-500)] text-[var(--color-green-500)]"
                      : isActive
                        ? "bg-[var(--color-cyan-500)]/15 border-[var(--color-cyan-500)] text-[var(--color-cyan-500)]"
                        : "bg-transparent border-[var(--color-bg-border)] text-[var(--color-text-disabled)]"
                  }`}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                >
                  {isDone ? "✓" : i + 1}
                  <span className="hidden sm:inline">{label}</span>
                </motion.div>
              </div>
            )
          })}
        </div>

        {/* ─── Step 1: Upload ─────────────────────────────── */}
        <AnimatePresence mode="wait">
          <motion.section
            key="upload"
            className={`mb-6 p-5 rounded-lg border transition-all ${
              uploadStatus === "done"
                ? "border-[var(--color-green-500)]/30 bg-[var(--color-green-500)]/5"
                : currentStep === "upload"
                  ? "border-[var(--color-cyan-500)]/30 bg-[var(--color-cyan-500)]/5"
                  : "border-[var(--color-bg-border)] opacity-60"
            }`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-3 flex items-center gap-2">
              {uploadStatus === "done" ? (
                <span className="text-[var(--color-green-500)]">✓</span>
              ) : (
                <span className="text-[var(--color-cyan-500)]">1</span>
              )}
              {uploadMode === "features"
                ? "Upload Precomputed Gait Features"
                : "Upload & Extract Gait Features"}
            </h2>

            <div className="mb-4 flex items-center justify-center gap-2 text-xs">
              <button
                onClick={() => handleModeChange("imu")}
                className={`px-3 py-1.5 rounded-full border uppercase tracking-wider font-bold transition-colors ${
                  uploadMode === "imu"
                    ? "bg-[var(--color-cyan-500)]/15 border-[var(--color-cyan-500)] text-[var(--color-cyan-500)]"
                    : "border-[var(--color-bg-border)] text-[var(--color-text-disabled)] hover:text-[var(--color-text-secondary)]"
                }`}
              >
                IMU Raw
              </button>
              <button
                onClick={() => handleModeChange("features")}
                className={`px-3 py-1.5 rounded-full border uppercase tracking-wider font-bold transition-colors ${
                  uploadMode === "features"
                    ? "bg-[var(--color-cyan-500)]/15 border-[var(--color-cyan-500)] text-[var(--color-cyan-500)]"
                    : "border-[var(--color-bg-border)] text-[var(--color-text-disabled)] hover:text-[var(--color-text-secondary)]"
                }`}
              >
                Inject Features
              </button>
            </div>

            {uploadStatus === "loading" && (
              <motion.div
                className="bg-[var(--color-amber-500)]/10 border border-[var(--color-amber-500)] text-[var(--color-amber-500)] p-4 rounded-lg text-center font-bold mb-4"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <p>
                  {uploadMode === "features"
                    ? "⚙️ Validating feature file..."
                    : "⚙️ Processing IMU data..."}
                </p>
                {uploadMode === "imu" && (
                  <p className="text-xs font-normal mt-1 opacity-70">
                    Butterworth filtering → IC/FO detection → Stride
                    segmentation → ZUPT
                  </p>
                )}
              </motion.div>
            )}

            {uploadStatus === "done" && (
              <div className="bg-[var(--color-green-500)]/10 border border-[var(--color-green-500)] text-[var(--color-green-500)] p-3 rounded-lg text-sm font-bold mb-3">
                ✓{" "}
                {uploadMode === "features"
                  ? "Features injected"
                  : "Features extracted"}
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
                      <div className="text-[var(--color-green-500)] font-bold text-lg">
                        ✓ File Selected
                      </div>
                      <div className="font-mono text-sm text-[var(--color-text-secondary)]">
                        {file.name}
                      </div>
                      <div className="text-xs text-[var(--color-text-disabled)]">
                        {(file.size / 1024).toFixed(1)} KB
                      </div>
                      <button
                        onClick={() => {
                          setFile(null)
                          setError(null)
                        }}
                        className="text-xs text-[var(--color-red-500)] hover:underline mt-1"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-[var(--color-text-disabled)] font-bold">
                        {uploadMode === "features"
                          ? "Drag and drop feature .csv file here"
                          : "Drag and drop IMU .csv file here"}
                      </div>
                      {uploadMode === "features" ? (
                        <div className="text-xs text-[var(--color-text-secondary)]">
                          Required columns: stride_lengths, stride_times,
                          swing_times, stance_times, stance_ratios,
                          clearances_min, clearances_max
                        </div>
                      ) : (
                        <div className="text-xs text-[var(--color-text-secondary)]">
                          Expected: timestamp, GyrX, GyrY, GyrZ, AccX, AccY,
                          AccZ
                        </div>
                      )}
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

                {/* Generate Dummy Data Button */}
                <button
                  onClick={handleGenerateDummyImu}
                  disabled={isGeneratingDummy}
                  className="w-full mb-3 border border-dashed border-[var(--color-amber-500)]/50 bg-[var(--color-amber-500)]/5 text-[var(--color-amber-500)] font-bold py-2.5 rounded-md text-xs uppercase tracking-wider hover:bg-[var(--color-amber-500)]/10 transition-colors disabled:opacity-50"
                >
                  {isGeneratingDummy
                    ? "Generating..."
                    : `🧪 Generate Dummy ${uploadMode === "features" ? "Features" : "IMU"} Data (for testing)`}
                </button>

                <button
                  onClick={handleUpload}
                  disabled={!file || isUploading}
                  className="w-full bg-[var(--color-amber-500)] text-[var(--color-bg-base)] font-bold py-3 rounded-md uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {uploadMode === "features"
                    ? "Upload Features"
                    : "Upload & Extract Features"}
                </button>
              </>
            )}
          </motion.section>
        </AnimatePresence>

        {/* ─── Step 2: Feed into Model ────────────────────── */}
        <motion.section
          className={`mb-6 p-5 rounded-lg border transition-all ${
            predictStatus === "done"
              ? "border-[var(--color-green-500)]/30 bg-[var(--color-green-500)]/5"
              : currentStep === "predict"
                ? "border-[var(--color-cyan-500)]/30 bg-[var(--color-cyan-500)]/5"
                : "border-[var(--color-bg-border)] opacity-40"
          }`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-3 flex items-center gap-2">
            {predictStatus === "done" ? (
              <span className="text-[var(--color-green-500)]">✓</span>
            ) : (
              <span
                className={
                  currentStep === "predict"
                    ? "text-[var(--color-cyan-500)]"
                    : "text-[var(--color-text-disabled)]"
                }
              >
                2
              </span>
            )}
            Feed into ML Model
          </h2>

          {predictStatus === "loading" && (
            <motion.div
              className="bg-[var(--color-amber-500)]/10 border border-[var(--color-amber-500)] text-[var(--color-amber-500)] p-4 rounded-lg text-center font-bold mb-4"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <p>🧠 Running Random Forest classifier...</p>
              <p className="text-xs font-normal mt-1 opacity-70">
                Feature engineering → Scaling → Prediction → Feature importance
              </p>
            </motion.div>
          )}

          {predictStatus === "done" && predictResult && (
            <motion.div
              className="space-y-3 mb-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="bg-[var(--color-green-500)]/10 border border-[var(--color-green-500)] text-[var(--color-green-500)] p-3 rounded-lg text-sm font-bold">
                ✓ Analysis complete
              </div>
              {predictResult.label && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-[var(--color-bg-base)] p-3 rounded-lg text-center">
                    <div className="text-xs text-[var(--color-text-disabled)] uppercase mb-1">
                      Classification
                    </div>
                    <div className="text-lg font-bold text-[var(--color-text-primary)]">
                      {predictResult.label === "DT-Control"
                        ? "Dual-Task"
                        : "Single-Task"}
                    </div>
                  </div>
                  <div className="bg-[var(--color-bg-base)] p-3 rounded-lg text-center">
                    <div className="text-xs text-[var(--color-text-disabled)] uppercase mb-1">
                      Confidence
                    </div>
                    <div className="text-lg font-bold text-[var(--color-cyan-500)]">
                      {predictResult.probability != null
                        ? `${(predictResult.probability * 100).toFixed(1)}%`
                        : "—"}
                    </div>
                  </div>
                  <div className="bg-[var(--color-bg-base)] p-3 rounded-lg text-center">
                    <div className="text-xs text-[var(--color-text-disabled)] uppercase mb-1">
                      Recommendation
                    </div>
                    <div
                      className={`inline-block px-2 py-1 rounded-full text-xs font-bold border ${getRecBadge(predictResult.recommendation ?? "")}`}
                    >
                      {predictResult.recommendation ?? "—"}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {currentStep === "predict" &&
            predictStatus !== "loading" &&
            predictStatus !== "done" && (
              <div className="space-y-3">
                <button
                  onClick={handlePredict}
                  className="w-full bg-[var(--color-cyan-500)] text-[var(--color-bg-base)] font-bold py-3 rounded-md uppercase tracking-wider hover:opacity-90 transition-opacity"
                >
                  🧠 Run ML Analysis
                </button>
                <button
                  onClick={handleSkipMlAndComposite}
                  className="w-full border border-[var(--color-bg-border)] text-[var(--color-text-secondary)] font-bold py-2.5 rounded-md text-xs uppercase tracking-wider hover:text-[var(--color-text-primary)] transition-colors"
                >
                  Skip ML → Compute Composite from ACL-RSI + RT only
                </button>
              </div>
            )}
        </motion.section>

        {/* ─── Step 3: Show Results ───────────────────────── */}
        <motion.section
          className={`p-5 rounded-lg border transition-all ${
            currentStep === "results"
              ? "border-[var(--color-cyan-500)]/30 bg-[var(--color-cyan-500)]/5"
              : "border-[var(--color-bg-border)] opacity-40"
          }`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-3 flex items-center gap-2">
            <span
              className={
                currentStep === "results"
                  ? "text-[var(--color-cyan-500)]"
                  : "text-[var(--color-text-disabled)]"
              }
            >
              3
            </span>
            View Full Results
          </h2>

          {currentStep === "results" && (
            <motion.button
              onClick={handleShowResults}
              className="w-full bg-[var(--color-green-500)] text-[var(--color-bg-base)] font-bold py-3 rounded-md uppercase tracking-wider hover:opacity-90 transition-opacity"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              📊 Show Results Dashboard →
            </motion.button>
          )}
        </motion.section>

        {/* ─── Error Display ──────────────────────────────── */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="mt-4 bg-[var(--color-red-500)]/10 border border-[var(--color-red-500)] text-[var(--color-red-500)] p-3 rounded-lg text-sm font-bold"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Skip option ────────────────────────────────── */}
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push(`/sessions/${sessionId}`)}
            className="text-[var(--color-text-disabled)] hover:text-[var(--color-text-secondary)] text-xs transition-colors"
          >
            Skip — view available results only →
          </button>
        </div>
      </motion.div>
    </main>
  )
}