import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import { ENV } from '../config/env.js';
import { User } from '../models/User.js';

async function seedAdmin() {
  try {
    await connectDatabase();
    console.log('🚀 [Seed Admin] Connected to MongoDB database.');

    const email = (ENV.ADMIN_INITIAL_EMAIL || 'admin@aagspire.com').toLowerCase().trim();
    const rawPassword = ENV.ADMIN_INITIAL_PASSWORD || 'AagspireAdmin@2026';
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    let admin = await User.findOne({ email });

    if (admin) {
      admin.passwordHash = passwordHash;
      admin.role = 'admin';
      admin.status = 'active';
      admin.name = admin.name || 'Aagspire Admin';
      await admin.save();
      console.log('✅ [Seed Admin] Existing Admin user updated successfully.');
    } else {
      admin = await User.create({
        name: 'Aagspire Admin',
        email,
        passwordHash,
        role: 'admin',
        status: 'active',
      });
      console.log('✅ [Seed Admin] New Admin user created successfully.');
    }

    console.log('\n=============================================');
    console.log('🔑 ADMIN LOGIN CREDENTIALS:');
    console.log(`   Email:    ${email}`);
    console.log(`   Password: ${rawPassword}`);
    console.log(`   Role:     ${admin.role}`);
    console.log(`   Status:   ${admin.status}`);
    console.log('=============================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ [Seed Admin] Error:', error.message || error);
    process.exit(1);
  }
}

seedAdmin();
