import { apiHandler, allowMethods } from "@/lib/server/http"
import { getApiUser } from "@/lib/server/auth"
import { authConfigured } from "@/lib/server/config"
import { guestId, requestFingerprint, requestIpHash } from "@/lib/server/guest"
import { exportAllowance } from "@/lib/server/export-quota"

export default apiHandler(async (req, res) => {
  allowMethods(req, res, ["GET"])
  const user = await getApiUser(req, res)
  const allowance = user ? { remainingExports: null, loginRequired: false } : await exportAllowance({
    guestId: guestId(req, res, true), fingerprintHash: requestFingerprint(req), ipHash: requestIpHash(req),
  })
  res.json({ user, loginEnabled: authConfigured(), ...allowance })
})
