import { Request, Response } from 'express';
import { Holiday, isValidHolidayDate } from '../models/Holiday.js';

export async function listHolidays(req: Request, res: Response): Promise<void> {
  const { startDate, endDate } = req.query;
  if ((startDate !== undefined && !isValidHolidayDate(startDate)) ||
      (endDate !== undefined && !isValidHolidayDate(endDate))) {
    res.status(400).json({ success: false, message: 'Use valid startDate and endDate values in YYYY-MM-DD format.' });
    return;
  }
  if (typeof startDate === 'string' && typeof endDate === 'string' && startDate > endDate) {
    res.status(400).json({ success: false, message: 'startDate must be on or before endDate.' });
    return;
  }

  const filter: { date?: { $gte?: string; $lte?: string } } = {};
  if (typeof startDate === 'string' || typeof endDate === 'string') {
    filter.date = {};
    if (typeof startDate === 'string') filter.date.$gte = startDate;
    if (typeof endDate === 'string') filter.date.$lte = endDate;
  }

  try {
    const holidays = await Holiday.find(filter).sort({ date: 1 }).lean();
    res.json({ success: true, data: holidays });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to load holidays.' });
  }
}

export async function createHoliday(req: Request, res: Response): Promise<void> {
  const { date, name } = req.body ?? {};
  if (!isValidHolidayDate(date)) {
    res.status(400).json({ success: false, message: 'Use a valid holiday date in YYYY-MM-DD format.' });
    return;
  }
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) {
    res.status(400).json({ success: false, message: 'Holiday name is required and must be 100 characters or fewer.' });
    return;
  }

  try {
    const holiday = await Holiday.create({ date, name: name.trim() });
    res.status(201).json({ success: true, data: holiday });
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
      res.status(409).json({ success: false, message: 'A holiday already exists on this date.' });
      return;
    }
    res.status(500).json({ success: false, message: 'Failed to save holiday.' });
  }
}
