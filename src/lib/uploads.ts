const GITHUB_API = "https://api.github.com"

export interface UploadResult {
  url: string
  filename: string
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error("Failed to read image file"))
    reader.readAsDataURL(file)
  })
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024

export async function uploadImage(owner: string, repo: string, file: File, token: string): Promise<UploadResult> {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(`Image too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 10MB.`)
  }

  const ext = file.name.split(".").pop() || "png"
  const uuid = crypto.randomUUID()
  const path = `.intakepad/uploads/${uuid}.${ext}`

  const dataUrl = await fileToBase64(file)
  const prefix = dataUrl.split(",")[0]
  const content = dataUrl.split(",")[1]
  if (!content || !prefix?.startsWith("data:image/")) {
    throw new Error("Invalid image file.")
  }

  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: `Add screenshot via IntakePad`,
      content,
    }),
  })

  if (res.status === 401) throw new Error("Image upload failed: authentication error. Check your token.")
  if (res.status === 403) throw new Error("Image upload failed: permission denied. Token needs repo scope.")
  if (!res.ok) throw new Error(`Image upload failed (${res.status})`)

  const data = await res.json()
  return {
    url: data.content.download_url,
    filename: file.name,
  }
}
