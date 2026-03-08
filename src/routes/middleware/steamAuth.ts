import express from "express";

export const steamAuthMiddleware = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): void => {
  const systemId = req.headers["x-system-id"] as string;
  const systemToken = req.headers["x-system-token"] as string;
  const openKey = req.headers["x-open-key"] as string;
  if (!systemToken || !systemId || !openKey) {
    res.status(401).json({ error: "系统ID、系统令牌和OpenKey均不能为空" });
    return;
  }
  if (openKey !== process.env.OPEN_KEY) {
    res.status(401).json({ error: "OpenKey错误" });
    return;
  }
  // 预留后续校验系统ID和系统令牌
  next();
};
