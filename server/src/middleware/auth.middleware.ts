import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/tokenHelper.js';
import { User, IUser } from '../models/User.js';
import { Employee, IEmployee } from '../models/Employee.js';
import { LoginSession } from '../models/LoginSession.js';

export interface AuthenticatedRequest extends Request {
  user?: IUser & { _id: any };
  employee?: IEmployee | null;
  tokenPayload?: TokenPayload;
}

const ACTIVITY_WRITE_INTERVAL_MS = 60 * 1000;
const lastActivityWrites = new Map<string, number>();

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let token = '';

    // 1. Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.aagspire_token) {
      token = req.cookies.aagspire_token;
    }

    if (!token) {
      res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
      return;
    }

    // 2. Verify Token
    const payload = verifyToken(token);
    req.tokenPayload = payload;

    // 3. Find user in database. For employee tokens the employee profile is looked up in parallel;
    // access is still decided by the stored user's role and status below, not the token's role.
    const [user, employeeForToken] = await Promise.all([
      User.findById(payload.userId),
      payload.role === 'employee' ? Employee.findOne({ userId: payload.userId }) : Promise.resolve(undefined),
    ]);
    if (!user) {
      res.status(401).json({ success: false, message: 'User session invalid. Please log in again.' });
      return;
    }

    if (user.status !== 'active') {
      res.status(403).json({ success: false, message: 'Your account has been deactivated or suspended.' });
      return;
    }

    req.user = user as any;

    // 4. If employee, attach employee document
    if (user.role === 'employee') {
      req.employee = employeeForToken !== undefined
        ? employeeForToken
        : await Employee.findOne({ userId: user._id });
    }

    // 5. Asynchronously update lastActivityAt on latest active session (at most once a minute per user)
    const userKey = String(user._id);
    const now = Date.now();
    if (now - (lastActivityWrites.get(userKey) || 0) >= ACTIVITY_WRITE_INTERVAL_MS) {
      lastActivityWrites.set(userKey, now);
      LoginSession.findOneAndUpdate(
        { userId: user._id, status: 'active' },
        { lastActivityAt: new Date() },
        { sort: { loginAt: -1 } }
      ).exec().catch(() => {});
    }

    next();
  } catch (error: any) {
    res.status(401).json({ success: false, message: 'Session expired or invalid token. Please log in.' });
  }
}
