import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDatabase } from '../config/database.js';
import { ENV } from '../config/env.js';
import { User } from '../models/User.js';
import { Employee } from '../models/Employee.js';
import { Client } from '../models/Client.js';
import { Project } from '../models/Project.js';
import { ProjectCommission } from '../models/ProjectCommission.js';
import { ProjectEmployee } from '../models/ProjectEmployee.js';
import { CommissionPreset } from '../models/CommissionPreset.js';
import { ClientPayment } from '../models/ClientPayment.js';
import { WorkLog } from '../models/WorkLog.js';
import { Attendance } from '../models/Attendance.js';
import { Settlement } from '../models/Settlement.js';
import { SettlementItem } from '../models/SettlementItem.js';
import { Receipt } from '../models/Receipt.js';
import { Notification } from '../models/Notification.js';
import { CommissionHistory } from '../models/CommissionHistory.js';
import { InvoiceCounter } from '../models/InvoiceCounter.js';
import { LoginSession } from '../models/LoginSession.js';

async function clearAllData() {
  await connectDatabase();
  console.log('🧹 [Clear Data] Connected to database. Removing all operational data...');

  const [
    delProjects,
    delCommissions,
    delCommissionHistory,
    delProjEmps,
    delPayments,
    delWorkLogs,
    delAttendance,
    delSettlements,
    delSettlementItems,
    delReceipts,
    delNotifications,
    delInvoiceCounters,
    delLoginSessions,
    delClients,
    delEmployees,
    delUsers,
  ] = await Promise.all([
    Project.deleteMany({}),
    ProjectCommission.deleteMany({}),
    CommissionHistory.deleteMany({}),
    ProjectEmployee.deleteMany({}),
    ClientPayment.deleteMany({}),
    WorkLog.deleteMany({}),
    Attendance.deleteMany({}),
    Settlement.deleteMany({}),
    SettlementItem.deleteMany({}),
    Receipt.deleteMany({}),
    Notification.deleteMany({}),
    InvoiceCounter.deleteMany({}),
    LoginSession.deleteMany({}),
    Client.deleteMany({}),
    Employee.deleteMany({}),
    User.deleteMany({ role: { $ne: 'admin' } }),
  ]);

  console.log(`• Projects removed: ${delProjects.deletedCount}`);
  console.log(`• Project Commissions removed: ${delCommissions.deletedCount}`);
  console.log(`• Commission History records removed: ${delCommissionHistory.deletedCount}`);
  console.log(`• Project Employee allocations removed: ${delProjEmps.deletedCount}`);
  console.log(`• Client Payments removed: ${delPayments.deletedCount}`);
  console.log(`• Work Logs removed: ${delWorkLogs.deletedCount}`);
  console.log(`• Attendance records removed: ${delAttendance.deletedCount}`);
  console.log(`• Settlements removed: ${delSettlements.deletedCount}`);
  console.log(`• Settlement Items removed: ${delSettlementItems.deletedCount}`);
  console.log(`• Receipts removed: ${delReceipts.deletedCount}`);
  console.log(`• Notifications removed: ${delNotifications.deletedCount}`);
  console.log(`• Invoice Counter sequences reset: ${delInvoiceCounters.deletedCount}`);
  console.log(`• Login Sessions cleared: ${delLoginSessions.deletedCount}`);
  console.log(`• Clients removed: ${delClients.deletedCount}`);
  console.log(`• Employees removed: ${delEmployees.deletedCount}`);
  console.log(`• Employee User accounts removed: ${delUsers.deletedCount}`);

  // Ensure Admin User is intact so the system is accessible
  const adminEmail = (ENV.ADMIN_INITIAL_EMAIL || 'admin@aagspire.com').toLowerCase();
  let admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    const passwordHash = await bcrypt.hash(ENV.ADMIN_INITIAL_PASSWORD || 'AagspireAdmin@2026', 10);
    admin = await User.create({
      name: 'Aagspire Admin',
      email: adminEmail,
      passwordHash,
      role: 'admin',
      status: 'active',
    });
    console.log(`👤 [Clear Data] Verified Admin User created: ${adminEmail}`);
  } else {
    console.log(`👤 [Clear Data] Admin User preserved: ${admin.email}`);
  }

  // Ensure default commission presets exist
  const presetsCount = await CommissionPreset.countDocuments();
  if (presetsCount === 0) {
    await CommissionPreset.create([
      {
        name: 'Standard Production',
        brokerPercent: 10,
        employeePercent: 40,
        officePercent: 10,
        adminPercent: 35,
        settlementPercent: 5,
        isDefault: true,
      },
      {
        name: 'Direct Client Special',
        brokerPercent: 0,
        employeePercent: 40,
        officePercent: 15,
        adminPercent: 40,
        settlementPercent: 5,
        isDefault: false,
      },
    ]);
    console.log('📊 [Clear Data] Initialized default commission presets.');
  }

  console.log('✨ [Clear Data] All operational data has been completely wiped from the database!');
  await mongoose.disconnect();
}

clearAllData().catch((err) => {
  console.error('❌ [Clear Data Error]:', err);
  process.exit(1);
});
