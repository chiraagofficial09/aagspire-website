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

    // 3. Find user in database
    const user = await User.findById(payload.userId);
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
      const employee = await Employee.findOne({ userId: user._id });
      req.employee = employee;
    }

    // 5. Asynchronously update lastActivityAt on latest active session
    LoginSession.findOneAndUpdate(
      { userId: user._id, status: 'active' },
      { lastActivityAt: new Date() },
      { sort: { loginAt: -1 } }
    ).exec().catch(() => {});

    next();
  } catch (error: any) {
    res.status(401).json({ success: false, message: 'Session expired or invalid token. Please log in.' });
  }
}
