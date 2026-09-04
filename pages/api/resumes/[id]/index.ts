import { apiHandler, allowMethods, requireSameOrigin } from "@/lib/server/http"
import { requireApiUser } from "@/lib/server/auth"
import { resumeIdSchema, saveResumeSchema } from "@/lib/server/resume-schema"
import { deleteResume, readResume, updateResume } from "@/lib/server/resumes"

export const config = { api: { bodyParser: { sizeLimit: "5mb" } } }
export default apiHandler(async (req, res) => {
  allowMethods(req, res, ["GET", "PUT", "DELETE"])
  if (req.method !== "GET") requireSameOrigin(req)
  const user = await requireApiUser(req, res)
  const id = resumeIdSchema.parse(req.query.id)
  if (req.method === "GET") return res.json({ resume: await readResume(user.id, id) })
  if (req.method === "DELETE") {
    await deleteResume(user.id, id)
    return res.status(204).end()
  }
  const { data, version } = saveResumeSchema.parse(req.body)
  res.json({ resume: await updateResume(user.id, id, data, version) })
})
