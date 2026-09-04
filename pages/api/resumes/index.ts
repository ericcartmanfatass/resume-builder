import { apiHandler, allowMethods, requireSameOrigin } from "@/lib/server/http"
import { requireApiUser } from "@/lib/server/auth"
import { resumeSchema } from "@/lib/server/resume-schema"
import { createResume, listResumes } from "@/lib/server/resumes"

export const config = { api: { bodyParser: { sizeLimit: "5mb" } } }
export default apiHandler(async (req, res) => {
  allowMethods(req, res, ["GET", "POST"])
  if (req.method !== "GET") requireSameOrigin(req)
  const user = await requireApiUser(req, res)
  if (req.method === "GET") return res.json({ resumes: await listResumes(user.id) })
  const data = resumeSchema.parse(req.body?.data)
  res.status(201).json({ resume: await createResume(user.id, data) })
})
