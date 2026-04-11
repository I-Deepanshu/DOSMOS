import authService from "../services/authService.js";

const COOKIE_OPTS = {
  httpOnly: true,
  secure:   true,       // user requested secure: true
  sameSite: "strict",   // Strict
};

export async function checkDob(req, res, next) {
  try {
    const { dob } = req.body;
    if (!dob) return res.status(400).json({ error: "DOB is required" });
    
    // Will return { redirect, message } or { maskedName, stepToken }
    const result = await authService.checkDob(dob);
    return res.status(200).json(result);
  } catch (err) { next(err); }
}

export async function verifyName(req, res, next) {
  try {
    const { stepToken, name } = req.body;
    if (!stepToken || !name) return res.status(400).json({ error: "Name and token required" });
    
    // Returns { redirect, message } OR { success, question, stepToken }
    const result = await authService.verifyName(stepToken, name);
    return res.status(200).json(result);
  } catch (err) { next(err); }
}

export async function verifyAnswer(req, res, next) {
  try {
    const { stepToken, answer } = req.body;
    if (!stepToken || !answer) return res.status(400).json({ error: "Missing fields" });

    // Returns { redirect, message } OR { error, attemptsLeft } OR { accessToken, refreshToken, user }
    const result = await authService.verifyAnswer(stepToken, answer);

    if (result.redirect) {
      return res.status(200).json(result);
    }
    if (result.error) {
      return res.status(401).json(result);
    }

    // Success
    res.cookie("refreshToken", result.refreshToken, { ...COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ accessToken: result.accessToken, user: { id: result.user._id, name: result.user.name, role: result.user.role, planet: result.user.planet, status: result.user.status } });
  } catch (err) { next(err); }
}

export async function register(req, res, next) {
  try {
    const { name, dob, security_question, security_answer } = req.body;
    if (!name || !dob || !security_question || !security_answer) {
      return res.status(400).json({ error: "All fields are required" });
    }
    if (name.trim().length < 2 || name.trim().length > 30) {
      return res.status(400).json({ error: "Name must be 2–30 characters" });
    }
    if (new Date(dob) > new Date()) return res.status(400).json({ error: "DOB cannot be in the future" });

    const result = await authService.register(name, dob, security_question, security_answer, req.ip);
    res.cookie("refreshToken", result.refreshToken, { ...COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.status(201).json({
      accessToken: result.accessToken,
      chatId:      result.chatId,
      user: {
        id:     result.user._id,
        name:   result.user.name,
        role:   result.user.role,
        planet: result.user.planet,
        status: result.user.status,
      },
    });
  } catch (err) { next(err); }
}

export async function refresh(req, res, next) {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ error: "No refresh token" });
    const { accessToken, refreshToken } = await authService.refreshTokens(
      token, req.ip, req.headers["user-agent"]
    );
    res.cookie("refreshToken", refreshToken, { ...COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ accessToken });
  } catch (err) { next(err); }
}

export async function logout(req, res, next) {
  try {
    if (req.user?.id) await authService.logout(req.user.id);
    res.clearCookie("refreshToken", COOKIE_OPTS);
    res.json({ message: "Logged out" });
  } catch (err) { next(err); }
}

export default { checkDob, verifyName, verifyAnswer, register, refresh, logout };
