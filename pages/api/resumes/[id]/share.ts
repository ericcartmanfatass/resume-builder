import { z } from "zod"
import { apiHandler, allowMethods, requireSameOrigin } from "@/lib/server/http"
import { requireApiUser } from "@/lib/server/auth"
import { resumeIdSchema } from "@/lib/server/resume-schema"
import { publishResume, revokeShare } from "@/lib/server/resumes"

export default apiHandler(async (req, res) => {
  allowMethods(req, res, ["POST", "DELETE"])
  requireSameOrigin(req)
  const user = await requireApiUser(req, res)
  const id = resumeIdSchema.parse(req.query.id)
  if (req.method === "DELETE") {
    await revokeShare(user.id, id)
    return res.status(204).end()
  }
  const { version } = z.object({ version: z.number().int().positive() }).parse(req.body)
  res.json({ token: await publishResume(user.id, id, version) })
})
