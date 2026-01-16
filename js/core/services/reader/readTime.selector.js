import { getLocalTotalReadTime } from "./localProgress.service.js";
import { getCloudProgress } from "./cloudProgress.service.js";

export async function getTotalReadTime({ userId, taleId }) {
  if (!userId || !taleId) return 0;

  const localTime = getLocalTotalReadTime({ userId, taleId });

  const cloud = await getCloudProgress({ userId, taleId });
  const cloudTime = cloud?.totalReadTimeMs || 0;

  // Same rule as resume selector: trust newest / max
  return Math.max(localTime, cloudTime);
}
