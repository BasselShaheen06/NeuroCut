"use client"

import { useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"

export default function ImuUploadScreen() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = searchParams.get("sessionId")

  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleDragOver = (e: React.DragEvent) => e.preventDefault()
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile.name.endsWith('.csv')) {
        setFile(droppedFile)
      } else {
        alert("Please upload a valid .csv file from the IMU sensor.")
      }
    }
  }

  const handleUpload = async () => {
    if (!file || !sessionId) return
    setIsUploading(true)

    // Simulate file upload to Supabase Storage / Python Backend processing
    setTimeout(() => {
      alert("IMU Data successfully queued for Python processing!")
      router.push("/dashboard")
    }, 2000)
  }

  if (!sessionId) {
    return <div className="p-8 text-center text-red-500">Missing Session ID</div>
  }

  return (
    <main className="min-h-screen p-8 flex flex-col items-center justify-center bg-[var(--color-bg-base)]">
      <div className="max-w-xl w-full bg-[var(--color-bg-surface)] p-8 rounded-xl border border-[var(--color-bg-border)] shadow-xl text-center">
        
        <h1 className="text-2xl font-display font-bold text-[var(--color-cyan-500)] mb-2">
          Hardware Synchronization
        </h1>
        <p className="text-[var(--color-text-secondary)] mb-8 text-sm">
          Upload the raw IMU data (.csv) for Session ID: <span className="font-mono text-[var(--color-text-primary)]">{sessionId.slice(0,8)}</span>
        </p>

        {/* Drag & Drop Zone */}
        <div 
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-12 mb-8 transition-colors ${
            file ? "border-[var(--color-green-500)] bg-[var(--color-green-500)]/10" : "border-[var(--color-bg-border)] hover:border-[var(--color-cyan-500)]"
          }`}
        >
          {file ? (
            <div className="space-y-2">
              <div className="text-[var(--color-green-500)] font-bold text-xl">✓ File Selected</div>
              <div className="font-mono text-sm text-[var(--color-text-secondary)]">{file.name}</div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-[var(--color-text-disabled)] font-bold">Drag and drop IMU .csv file here</div>
              <div className="text-xs text-[var(--color-text-secondary)]">or click to browse</div>
              <input 
                type="file" 
                accept=".csv" 
                className="hidden" 
                id="file-upload"
                onChange={(e) => e.target.files && setFile(e.target.files[0])}
              />
              <label htmlFor="file-upload" className="block mt-4 text-[var(--color-cyan-500)] cursor-pointer hover:underline text-sm font-bold uppercase tracking-wider">
                Browse Files
              </label>
            </div>
          )}
        </div>

        <button 
          onClick={handleUpload}
          disabled={!file || isUploading}
          className="w-full bg-[var(--color-amber-500)] text-[var(--color-bg-base)] font-bold py-4 rounded-md uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isUploading ? "Uploading & Syncing..." : "Process Telemetry"}
        </button>
        
      </div>
    </main>
  )
}