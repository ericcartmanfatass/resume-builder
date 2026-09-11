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
  const { version, customToken } = z.object({
    version: z.number().int().positive(),
    customToken: z.string().regex(/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/).nullable().optional(),
  }).parse(req.body)
  res.json(await publishResume(user.id, id, version, customToken))
})
