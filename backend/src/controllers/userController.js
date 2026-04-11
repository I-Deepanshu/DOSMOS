import User from "../models/User.js";
import planetService from "../services/planetService.js";

export async function getMe(req, res, next) {
  try {
    const user = await User.findById(req.user.id)
      .select("-answer_hash -active_step_token_id -failed_attempts -lock_until");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
  } catch (err) { next(err); }
}

export async function renamePlanet(req, res, next) {
  try {
    const { name } = req.body;
    if (!name || name.trim().length < 3 || name.trim().length > 20) {
      return res.status(400).json({ error: "Planet name must be 3–20 characters" });
    }
    const updated = await planetService.renamePlanet(req.user.id, name.trim());
    res.json({ planet: updated.planet, last_renamed_at: updated.last_renamed_at });
  } catch (err) { next(err); }
}

export async function verifyUser(req, res, next) {
  try {
    const { userId } = req.params;
    const user = await User.findByIdAndUpdate(
      userId,
      { is_verified: req.body.is_verified },
      { new: true }
    ).select("name is_verified");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
  } catch (err) { next(err); }
}

export default { getMe, renamePlanet, verifyUser };
