"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"

export async function uploadImuData(formData: FormData) {
  // 1. Verify the coach is securely logged in
  const session = await auth()
  if (!session || session.user.role !== "COACH") {
    return { success: false, error: "Unauthorized access" }
  }

  // 2. Extract the file and session ID from the form data
  const file = formData.get("file") as File
  const sessionId = formData.get("sessionId") as string

  if (!file || !sessionId) {
    return { success: false, error: "Missing file or session ID" }
  }

  try {
    // 3. Convert the file into a buffer so the server can transmit it
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // We store it cleanly in a folder named after the Session ID
    const filePath = `${sessionId}/${file.name}`

    // 4. Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from("imu-data")
      .upload(filePath, buffer, { 
        contentType: 'text/csv', 
        upsert: true // Overwrite if the coach uploads twice by mistake
      })

    if (error) {
      console.error("Supabase Storage Error:", error)
      throw new Error("Failed to upload file to storage bucket.")
    }

    // 5. Update the Database Session with the path and change status to 'processing'
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        imuFilePath: data.path,
        status: "processing" 
      }
    })

    // 6. WAKE UP THE PYTHON ENGINE!
    try {
      // We ping the FastAPI server and wait for it to calculate the reaction times
      const pythonResponse = await fetch("http://localhost:8000/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId })
      })

      if (!pythonResponse.ok) {
        console.error("Python Engine reported an error. Status:", pythonResponse.status)
        return { success: false, error: "Math engine failed to process data." }
      }

      // If we made it here, Python successfully processed the data!
      return { success: true }
      
    } catch (pythonError) {
      console.error("Could not reach Python server. Is it running?", pythonError)
      return { success: false, error: "Signal processing engine is offline. Ensure FastAPI is running on port 8000." }
    }

  } catch (error) {
    console.error("Failed to execute upload pipeline:", error)
    return { success: false, error: "Cloud pipeline execution failed" }
  }
}