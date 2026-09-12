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
import { toDecimal, round2 } from '../utils/decimalHelper.js';
import {
  generateEmployeeCode,
  generateClientCode,
  generateProjectCode,
  generateSettlementCode,
  generateReceiptCode,
} from '../utils/codeGenerator.js';
import { calculateCommissionAmounts } from '../services/commission.service.js';

async function seedComprehensiveDatabase() {
  await connectDatabase();
  console.log('🚀 [Seed] Connected to MongoDB. Starting database reset and comprehensive seeding...');

  // 1. Clear Existing Data Collections (Clean slate for pristine testbed)
  await Promise.all([
    Project.deleteMany({}),
    ProjectCommission.deleteMany({}),
    ProjectEmployee.deleteMany({}),
    ClientPayment.deleteMany({}),
    WorkLog.deleteMany({}),
    Attendance.deleteMany({}),
    Settlement.deleteMany({}),
    SettlementItem.deleteMany({}),
    Receipt.deleteMany({}),
    Notification.deleteMany({}),
    Client.deleteMany({}),
    Employee.deleteMany({}),
    CommissionPreset.deleteMany({}),
    User.deleteMany({ role: 'employee' }),
  ]);
  console.log('🧹 [Seed] Cleaned existing collections.');

  // 2. Admin User
  const adminEmail = (ENV.ADMIN_INITIAL_EMAIL || 'admin@aagspire.com').toLowerCase();
  let admin = await User.findOne({ email: adminEmail });
  if (!admin) {
    const passwordHash = await bcrypt.hash(ENV.ADMIN_INITIAL_PASSWORD || 'Admin@123', 10);
    admin = await User.create({
      name: 'Aagspire Admin',
      email: adminEmail,
      passwordHash,
      role: 'admin',
      status: 'active',
    });
    console.log(`👤 [Seed] Created Super Admin: ${adminEmail}`);
  } else {
    console.log(`👤 [Seed] Using existing Super Admin: ${adminEmail}`);
  }

  // 3. Commission Presets
  const presets = [
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
    {
      name: 'High Margin Commercial',
      brokerPercent: 5,
      employeePercent: 35,
      officePercent: 10,
      adminPercent: 45,
      settlementPercent: 5,
      isDefault: false,
    },
    {
      name: 'VFX & 3D Heavy',
      brokerPercent: 5,
      employeePercent: 45,
      officePercent: 15,
      adminPercent: 30,
      settlementPercent: 5,
      isDefault: false,
    },
  ];
  for (const p of presets) {
    await CommissionPreset.create(p);
  }
  console.log('📊 [Seed] Created 4 Commission Presets.');

  // 4. Create 6 Skill-Specialized Employees
  const employeeDefs = [
    {
      name: 'Rahul Patel',
      email: 'rahul@aagspire.com',
      designation: 'Senior Brand Architect',
      department: 'Creative & Branding',
      phone: '+91 98765 43210',
      joiningDate: new Date('2025-01-10'),
      upiId: 'rahul@okhdfcbank',
      bankName: 'HDFC Bank',
      accountNumber: '918237465012',
      ifsc: 'HDFC0001234',
    },
    {
      name: 'Ananya Sharma',
      email: 'ananya@aagspire.com',
      designation: 'Lead Motion Designer & Colorist',
      department: 'Video Production',
      phone: '+91 98234 56781',
      joiningDate: new Date('2025-02-01'),
      upiId: 'ananya.sharma@okaxis',
      bankName: 'Axis Bank',
      accountNumber: '918299384756',
      ifsc: 'UTIB0000456',
    },
    {
      name: 'Vikramaditya Roy',
      email: 'vikram@aagspire.com',
      designation: 'Lead 3D Animator & CGI Director',
      department: '3D & VFX',
      phone: '+91 97123 45672',
      joiningDate: new Date('2025-03-15'),
      upiId: 'vikram.roy@icici',
      bankName: 'ICICI Bank',
      accountNumber: '002305012384',
      ifsc: 'ICIC0000023',
    },
    {
      name: 'Pooja Iyer',
      email: 'pooja@aagspire.com',
      designation: 'Commercial Video Editor',
      department: 'Post Production',
      phone: '+91 96543 21093',
      joiningDate: new Date('2025-04-01'),
      upiId: 'pooja.editor@paytm',
      bankName: 'State Bank of India',
      accountNumber: '203948571624',
      ifsc: 'SBIN0004521',
    },
    {
      name: 'Siddharth Verma',
      email: 'siddharth@aagspire.com',
      designation: 'Sound Designer & Audio Engineer',
      department: 'Audio & Music',
      phone: '+91 95432 10984',
      joiningDate: new Date('2025-05-15'),
      upiId: 'siddharth.audio@oksbi',
      bankName: 'Kotak Mahindra Bank',
      accountNumber: '748291038472',
      ifsc: 'KKBK0001892',
    },
    {
      name: 'Neha Kulkarni',
      email: 'neha@aagspire.com',
      designation: 'Visual Identity & Thumbnail Specialist',
      department: 'Design & Graphics',
      phone: '+91 94321 09875',
      joiningDate: new Date('2025-06-01'),
      upiId: 'neha.designs@okicici',
      bankName: 'HDFC Bank',
      accountNumber: '501004829103',
      ifsc: 'HDFC0000240',
    },
  ];

  const employees: any[] = [];
  for (let i = 0; i < employeeDefs.length; i++) {
    const def = employeeDefs[i];
    const passwordHash = await bcrypt.hash(`${def.name.split(' ')[0]}@123`, 10);
    const user = await User.create({
      name: def.name,
      email: def.email,
      passwordHash,
      role: 'employee',
      status: 'active',
    });

    const empCode = generateEmployeeCode(i + 1);
    const emp = await Employee.create({
      userId: user._id,
      employeeCode: empCode,
      fullName: def.name,
      email: def.email,
      phone: def.phone,
      designation: def.designation,
      department: def.department,
      joiningDate: def.joiningDate,
      defaultCommissionPercent: 40,
      bankDetails: {
        accountHolderName: def.name,
        accountNumber: def.accountNumber,
        bankName: def.bankName,
        ifscCode: def.ifsc,
      },
      upiId: def.upiId,
      status: 'active',
    });
    employees.push(emp);
  }
  console.log(`👥 [Seed] Created ${employees.length} Employees with active portals.`);

  // 5. Create 6 Premium Clients
  const clientDefs = [
    {
      name: 'Jyotnar Organics',
      companyName: 'Jyotnar Natural Foods Pvt Ltd',
      email: 'accounts@jyotnarfoods.com',
      phone: '+91 91234 56780',
      address: 'Plot 42, GIDC Estate, Ahmedabad, Gujarat',
      gstNumber: '24AAACJ1234F1Z5',
      industry: 'FMCG & Organic Nutrition',
    },
    {
      name: 'Nexus Mobility',
      companyName: 'Nexus Electric Vehicles Technologies Ltd',
      email: 'partnerships@nexusmobility.io',
      phone: '+91 91234 56781',
      address: 'Nexus Tech Park, Outer Ring Road, Bengaluru, Karnataka',
      gstNumber: '29AABCN9876K1Z2',
      industry: 'Autotech & Clean Energy',
    },
    {
      name: 'Zephex FinTech',
      companyName: 'Zephex Capital & AI Systems Corp',
      email: 'operations@zephexfin.com',
      phone: '+91 91234 56782',
      address: 'Level 18, One BKC, Bandra Kurla Complex, Mumbai, Maharashtra',
      gstNumber: '27AABCZ5432J1Z8',
      industry: 'Banking & Quantitative AI',
    },
    {
      name: 'Aura Luxury Living',
      companyName: 'Aura Architectural & Interior Spaces LLP',
      email: 'projects@auraluxuryliving.com',
      phone: '+91 91234 56783',
      address: 'Golf Course Road, Sector 54, Gurugram, Haryana',
      gstNumber: '06AABCA7654L1Z9',
      industry: 'Luxury Real Estate & Hospitality',
    },
    {
      name: 'PulseFit Global',
      companyName: 'PulseFit Athletics & Gear Pvt Ltd',
      email: 'marketing@pulsefitglobal.com',
      phone: '+91 91234 56784',
      address: 'HITEC City, Madhapur, Hyderabad, Telangana',
      gstNumber: '36AABCP3456M1Z1',
      industry: 'Athleisure & Wearable Tech',
    },
    {
      name: 'Kavya Media',
      companyName: 'Kavya Entertainment Studios India Ltd',
      email: 'production@kavyastudios.in',
      phone: '+91 91234 56785',
      address: 'Film City Road, Goregaon East, Mumbai, Maharashtra',
      gstNumber: '27AABCK8901N1Z3',
      industry: 'Digital Streaming & OTT Originals',
    },
  ];

  const clients: any[] = [];
  for (let i = 0; i < clientDefs.length; i++) {
    const cDef = clientDefs[i];
    const clientCode = generateClientCode(i + 1);
    const cl = await Client.create({
      clientCode,
      name: cDef.name,
      companyName: cDef.companyName,
      email: cDef.email,
      phone: cDef.phone,
      address: cDef.address,
      gstNumber: cDef.gstNumber,
      industry: cDef.industry,
      status: 'active',
      createdBy: admin._id,
    });
    clients.push(cl);
  }
  console.log(`🏢 [Seed] Created ${clients.length} Corporate Clients.`);

  // 6. Create 22 Diverse Projects across 2026 (March to September)
  // Ensures all months (Mar, Apr, May, Jun, Jul, Aug, Sep) have rich trends!
  const projectConfigs = [
    // Client 0: Jyotnar
    {
      clientIndex: 0,
      name: 'Jyotnar Complete Brand Identity',
      desc: 'Visual branding system, packaging hierarchy, and typography guidelines.',
      value: 180000,
      start: '2026-03-01',
      deadline: '2026-04-15',
      status: 'delivered',
      assignedIndices: [0, 5], // Rahul (70%), Neha (30%)
      shares: [70, 30],
      payments: [
        { date: '2026-03-05', amount: 90000, method: 'bank_transfer', ref: 'HDFC-NEFT-991823', note: 'Advance booking 50%' },
        { date: '2026-04-12', amount: 90000, method: 'bank_transfer', ref: 'HDFC-NEFT-994821', note: 'Final delivery tranche' },
      ],
    },
    {
      clientIndex: 0,
      name: 'Jyotnar Organic Tea Packaging System',
      desc: '12-SKU premium tea box packaging design and print-ready finishes.',
      value: 240000,
      start: '2026-04-10',
      deadline: '2026-05-20',
      status: 'completed',
      assignedIndices: [0, 5],
      shares: [60, 40],
      payments: [
        { date: '2026-04-15', amount: 120000, method: 'bank_transfer', ref: 'HDFC-NEFT-996712', note: 'Milestone 1 tranche' },
        { date: '2026-05-18', amount: 120000, method: 'bank_transfer', ref: 'HDFC-NEFT-998812', note: 'Print signoff tranche' },
      ],
    },
    {
      clientIndex: 0,
      name: 'Jyotnar Farm-to-Fork Documentary',
      desc: '3-minute cinematic 4K mini-doc profiling sustainable organic farmers.',
      value: 350000,
      start: '2026-05-05',
      deadline: '2026-06-25',
      status: 'completed',
      assignedIndices: [1, 3, 4], // Ananya (40%), Pooja (40%), Siddharth (20%)
      shares: [40, 40, 20],
      payments: [
        { date: '2026-05-10', amount: 150000, method: 'bank_transfer', ref: 'HDFC-RTGS-110293', note: 'Production advance' },
        { date: '2026-06-20', amount: 200000, method: 'bank_transfer', ref: 'HDFC-RTGS-114829', note: 'Post-production wrap' },
      ],
    },
    {
      clientIndex: 0,
      name: 'Jyotnar D2C E-Commerce Campaign',
      desc: 'Social reels, performance marketing ads, and Shopify banner creatives.',
      value: 290000,
      start: '2026-07-01',
      deadline: '2026-08-15',
      status: 'in_progress',
      assignedIndices: [1, 5],
      shares: [50, 50],
      payments: [
        { date: '2026-07-08', amount: 150000, method: 'upi', ref: 'UPI-JYOT-778291', note: 'Project kickoff payment' },
      ],
    },

    // Client 1: Nexus Mobility
    {
      clientIndex: 1,
      name: 'Nexus Apex Electric Hypercar CGI',
      desc: 'Photorealistic automotive 3D studio render and 60s reveal video.',
      value: 850000,
      start: '2026-03-15',
      deadline: '2026-05-01',
      status: 'delivered',
      assignedIndices: [2, 1, 4], // Vikram (50%), Ananya (30%), Siddharth (20%)
      shares: [50, 30, 20],
      payments: [
        { date: '2026-03-20', amount: 400000, method: 'bank_transfer', ref: 'ICIC-RTGS-884729', note: 'Initial CGI asset model deposit' },
        { date: '2026-04-28', amount: 450000, method: 'bank_transfer', ref: 'ICIC-RTGS-889102', note: 'Master video delivery' },
      ],
    },
    {
      clientIndex: 1,
      name: 'Nexus Battery Thermal 3D Exploded View',
      desc: 'Technical animation illustrating battery architecture & liquid cooling.',
      value: 480000,
      start: '2026-05-15',
      deadline: '2026-06-30',
      status: 'completed',
      assignedIndices: [2, 4],
      shares: [70, 30],
      payments: [
        { date: '2026-05-20', amount: 240000, method: 'bank_transfer', ref: 'ICIC-NEFT-991820', note: 'Tranche 1 CAD signoff' },
        { date: '2026-06-25', amount: 240000, method: 'bank_transfer', ref: 'ICIC-NEFT-997281', note: 'Tranche 2 4K render wrap' },
      ],
    },
    {
      clientIndex: 1,
      name: 'Nexus Autonomous Cockpit Interface UI',
      desc: 'Futuristic HUD display motion graphics & dashboard UI animation.',
      value: 520000,
      start: '2026-07-10',
      deadline: '2026-08-30',
      status: 'review',
      assignedIndices: [1, 2],
      shares: [50, 50],
      payments: [
        { date: '2026-07-18', amount: 260000, method: 'bank_transfer', ref: 'ICIC-RTGS-339182', note: 'Sprint 1 milestone' },
        { date: '2026-08-22', amount: 150000, method: 'bank_transfer', ref: 'ICIC-RTGS-342019', note: 'Sprint 2 milestone' },
      ],
    },
    {
      clientIndex: 1,
      name: 'Nexus World EV Day Global Anthem',
      desc: 'Global digital campaign with fast-paced kinetic typography and sound.',
      value: 360000,
      start: '2026-08-15',
      deadline: '2026-09-20',
      status: 'in_progress',
      assignedIndices: [1, 3, 4],
      shares: [40, 30, 30],
      payments: [
        { date: '2026-08-20', amount: 180000, method: 'upi', ref: 'UPI-NEX-449102', note: 'Campaign deposit' },
      ],
    },

    // Client 2: Zephex FinTech
    {
      clientIndex: 2,
      name: 'Zephex AI Wealth Management Launch',
      desc: 'FinTech app interactive demo, kinetic graphic ads, and UI screens.',
      value: 750000,
      start: '2026-04-01',
      deadline: '2026-05-15',
      status: 'delivered',
      assignedIndices: [0, 1, 3],
      shares: [40, 40, 20],
      payments: [
        { date: '2026-04-05', amount: 375000, method: 'bank_transfer', ref: 'AXIS-RTGS-772819', note: 'Contract advance' },
        { date: '2026-05-12', amount: 375000, method: 'bank_transfer', ref: 'AXIS-RTGS-779912', note: 'App Store launch delivery' },
      ],
    },
    {
      clientIndex: 2,
      name: 'Zephex Algorithmic Trading Teaser 3D',
      desc: 'High-tech neon 3D particle data visualization and investor presentation.',
      value: 420000,
      start: '2026-05-20',
      deadline: '2026-06-30',
      status: 'completed',
      assignedIndices: [2, 4],
      shares: [70, 30],
      payments: [
        { date: '2026-05-25', amount: 210000, method: 'bank_transfer', ref: 'AXIS-NEFT-883719', note: 'Concept lock' },
        { date: '2026-06-28', amount: 210000, method: 'bank_transfer', ref: 'AXIS-NEFT-889921', note: 'Master render export' },
      ],
    },
    {
      clientIndex: 2,
      name: 'Zephex Institutional Security Reel',
      desc: 'Cybersecurity explainer video highlighting quantum-proof ledger.',
      value: 380000,
      start: '2026-07-05',
      deadline: '2026-08-20',
      status: 'completed',
      assignedIndices: [1, 3],
      shares: [60, 40],
      payments: [
        { date: '2026-07-12', amount: 200000, method: 'bank_transfer', ref: 'AXIS-NEFT-449102', note: 'Storyboard signoff' },
        { date: '2026-08-18', amount: 180000, method: 'bank_transfer', ref: 'AXIS-NEFT-452910', note: 'Final deliverables' },
      ],
    },
    {
      clientIndex: 2,
      name: 'Zephex Global Keynote Brand Film',
      desc: 'Opening keynote film for Singapore FinTech Festival 2026.',
      value: 650000,
      start: '2026-08-10',
      deadline: '2026-09-25',
      status: 'review',
      assignedIndices: [0, 1, 4],
      shares: [40, 40, 20],
      payments: [
        { date: '2026-08-15', amount: 325000, method: 'bank_transfer', ref: 'AXIS-RTGS-558291', note: 'Advance mobilization' },
      ],
    },

    // Client 3: Aura Luxury Living
    {
      clientIndex: 3,
      name: 'Aura Estate 3D Architectural Flythrough',
      desc: 'Unreal Engine 5 architectural luxury villa walkthrough in 60fps.',
      value: 1250000,
      start: '2026-03-20',
      deadline: '2026-05-30',
      status: 'delivered',
      assignedIndices: [2, 4, 1], // Vikram (60%), Siddharth (20%), Ananya (20%)
      shares: [60, 20, 20],
      payments: [
        { date: '2026-03-25', amount: 500000, method: 'bank_transfer', ref: 'KOTAK-RTGS-991823', note: 'Initial CAD BIM setup' },
        { date: '2026-04-30', amount: 400000, method: 'bank_transfer', ref: 'KOTAK-RTGS-994829', note: 'Interior lighting pass' },
        { date: '2026-05-28', amount: 350000, method: 'bank_transfer', ref: 'KOTAK-RTGS-998821', note: 'Final master walkthrough' },
      ],
    },
    {
      clientIndex: 3,
      name: 'Aura Penthouse Cinematic Showcase',
      desc: 'Golden hour drone shots, interior color grade, and bespoke jazz soundtrack.',
      value: 680000,
      start: '2026-06-01',
      deadline: '2026-07-20',
      status: 'completed',
      assignedIndices: [1, 3, 4],
      shares: [40, 30, 30],
      payments: [
        { date: '2026-06-08', amount: 340000, method: 'bank_transfer', ref: 'KOTAK-RTGS-118291', note: 'Tranche 1 shoot wrap' },
        { date: '2026-07-18', amount: 340000, method: 'bank_transfer', ref: 'KOTAK-RTGS-123849', note: 'Tranche 2 grade wrap' },
      ],
    },
    {
      clientIndex: 3,
      name: 'Aura Sustainable Materials Film',
      desc: 'Macro lens cinematography showcasing Italian marble and reclaimed teak.',
      value: 410000,
      start: '2026-07-15',
      deadline: '2026-08-30',
      status: 'review',
      assignedIndices: [3, 4],
      shares: [60, 40],
      payments: [
        { date: '2026-07-22', amount: 200000, method: 'bank_transfer', ref: 'KOTAK-NEFT-662910', note: 'Tranche 1 mobilization' },
      ],
    },
    {
      clientIndex: 3,
      name: 'Aura Luxury Living Coffee Table Book',
      desc: 'Editorial design, foil-stamped catalog layout, and print management.',
      value: 320000,
      start: '2026-08-20',
      deadline: '2026-09-30',
      status: 'in_progress',
      assignedIndices: [0, 5],
      shares: [60, 40],
      payments: [
        { date: '2026-08-25', amount: 160000, method: 'upi', ref: 'UPI-AURA-992810', note: 'Layout drafting advance' },
      ],
    },

    // Client 4: PulseFit Global
    {
      clientIndex: 4,
      name: 'PulseFit Smartwear Global Commercial',
      desc: 'High-energy crossfit commercial with dynamic velocity editing & sound FX.',
      value: 580000,
      start: '2026-05-01',
      deadline: '2026-06-15',
      status: 'delivered',
      assignedIndices: [3, 4, 1],
      shares: [40, 30, 30],
      payments: [
        { date: '2026-05-06', amount: 290000, method: 'bank_transfer', ref: 'SBI-RTGS-338192', note: 'Production kickoff' },
        { date: '2026-06-12', amount: 290000, method: 'bank_transfer', ref: 'SBI-RTGS-342918', note: 'Final cut signoff' },
      ],
    },
    {
      clientIndex: 4,
      name: 'PulseFit HyperLight Shoe 3D Product Ad',
      desc: 'Full 3D floating sneaker breakdown showcasing cushioning rebound foam.',
      value: 490000,
      start: '2026-06-15',
      deadline: '2026-07-31',
      status: 'completed',
      assignedIndices: [2, 4],
      shares: [70, 30],
      payments: [
        { date: '2026-06-20', amount: 250000, method: 'bank_transfer', ref: 'SBI-NEFT-882910', note: '3D modeling milestone' },
        { date: '2026-07-28', amount: 240000, method: 'bank_transfer', ref: 'SBI-NEFT-889102', note: 'VFX simulation delivery' },
      ],
    },
    {
      clientIndex: 4,
      name: 'PulseFit Marathon Anthem Song & Video',
      desc: 'Original electronic track composition, vocals mixing, and hype video.',
      value: 620000,
      start: '2026-08-01',
      deadline: '2026-09-15',
      status: 'in_progress',
      assignedIndices: [4, 3],
      shares: [60, 40],
      payments: [
        { date: '2026-08-08', amount: 300000, method: 'upi', ref: 'UPI-PULSE-119283', note: 'Audio composition advance' },
      ],
    },

    // Client 5: Kavya Media
    {
      clientIndex: 5,
      name: 'Kavya Studios Dark Fantasy OTT Teaser',
      desc: 'CGI environment, mythical creature design, and cinematic teaser trailer.',
      value: 1100000,
      start: '2026-04-15',
      deadline: '2026-06-10',
      status: 'delivered',
      assignedIndices: [2, 1, 4],
      shares: [50, 30, 20],
      payments: [
        { date: '2026-04-20', amount: 500000, method: 'bank_transfer', ref: 'YESB-RTGS-559102', note: 'Teaser greenlight advance' },
        { date: '2026-06-05', amount: 600000, method: 'bank_transfer', ref: 'YESB-RTGS-562910', note: 'Theatrical DCP wrap' },
      ],
    },
    {
      clientIndex: 5,
      name: 'Kavya Originals Stand-Up Comedy Packaging',
      desc: 'Opening title sequence, neon stage branding, and lower thirds graphics.',
      value: 280000,
      start: '2026-06-10',
      deadline: '2026-07-15',
      status: 'completed',
      assignedIndices: [1, 5],
      shares: [50, 50],
      payments: [
        { date: '2026-06-16', amount: 140000, method: 'bank_transfer', ref: 'YESB-NEFT-991823', note: 'Styleframes approved' },
        { date: '2026-07-12', amount: 140000, method: 'bank_transfer', ref: 'YESB-NEFT-994821', note: 'Final broadcast assets' },
      ],
    },
    {
      clientIndex: 5,
      name: 'Kavya Sci-Fi Web Series Title Sequence',
      desc: '3D procedural galaxy generation and audio-reactive title sequence.',
      value: 950000,
      start: '2026-09-01',
      deadline: '2026-10-30',
      status: 'confirmed',
      assignedIndices: [2, 4, 1],
      shares: [50, 25, 25],
      payments: [
        { date: '2026-09-05', amount: 400000, method: 'bank_transfer', ref: 'YESB-RTGS-882910', note: 'Pilot episode title advance' },
      ],
    },
  ];

  const projects: any[] = [];
  const allPayments: any[] = [];

  for (let i = 0; i < projectConfigs.length; i++) {
    const pCfg = projectConfigs[i];
    const client = clients[pCfg.clientIndex];
    const projectCode = generateProjectCode(i + 1, 2026);

    const assignedEmps = pCfg.assignedIndices.map((idx) => employees[idx]._id);

    const project = await Project.create({
      projectCode,
      clientId: client._id,
      projectName: pCfg.name,
      description: pCfg.desc,
      projectValue: toDecimal(pCfg.value),
      startDate: new Date(pCfg.start),
      deadline: new Date(pCfg.deadline),
      status: pCfg.status,
      assignedEmployees: assignedEmps,
      createdBy: admin._id,
      createdAt: new Date(pCfg.start),
    });
    projects.push(project);

    // Standard 5-tier split: 10% broker, 40% employee, 10% office, 35% admin, 5% reserve
    const split = {
      brokerPercent: 10,
      employeePercent: 40,
      officePercent: 10,
      adminPercent: 35,
      settlementPercent: 5,
    };
    const amounts = calculateCommissionAmounts(pCfg.value, split);
    const projComm = await ProjectCommission.create({
      projectId: project._id,
      ...amounts,
      createdBy: admin._id,
      createdAt: new Date(pCfg.start),
    });

    // Allocate shares to assigned employees
    const employeePoolNumber = round2((pCfg.value * 0.40));
    for (let sIdx = 0; sIdx < pCfg.assignedIndices.length; sIdx++) {
      const emp = employees[pCfg.assignedIndices[sIdx]];
      const pct = pCfg.shares[sIdx];
      const allocAmt = round2((employeePoolNumber * pct) / 100);

      await ProjectEmployee.create({
        projectId: project._id,
        employeeId: emp._id,
        sharePercent: pct,
        allocatedCommission: toDecimal(allocAmt),
        createdAt: new Date(pCfg.start),
      });
    }

    // Client Payments
    for (const pm of pCfg.payments) {
      const paymentDoc = await ClientPayment.create({
        projectId: project._id,
        clientId: client._id,
        amount: toDecimal(pm.amount),
        paymentDate: new Date(pm.date),
        paymentMethod: pm.method,
        transactionReference: pm.ref,
        notes: pm.note,
        createdBy: admin._id,
        createdAt: new Date(pm.date),
      });
      allPayments.push(paymentDoc);
    }
  }

  console.log(`🎬 [Seed] Created ${projects.length} Projects with commissions and allocations.`);
  console.log(`💳 [Seed] Created ${allPayments.length} Client Payments across months.`);

  // 7. Seed Work Logs across Employees & Projects (28 Realistic Tasks)
  const workLogSamples = [
    { empIdx: 0, projIdx: 0, task: 'Brand identity moodboards & color palette exploration', mins: 360, status: 'approved', date: '2026-03-10' },
    { empIdx: 5, projIdx: 0, task: 'Vector typography lockup and symbol precision grid', mins: 240, status: 'approved', date: '2026-03-18' },
    { empIdx: 2, projIdx: 4, task: 'Nexus Apex 3D chassis polygonal modeling & subdivision', mins: 480, status: 'approved', date: '2026-03-28' },
    { empIdx: 1, projIdx: 4, task: 'ACEScg studio environment lighting & carbon fiber shaders', mins: 420, status: 'approved', date: '2026-04-12' },
    { empIdx: 4, projIdx: 4, task: 'EV motor sound synthesis, sub-bass riser, and audio mix', mins: 300, status: 'approved', date: '2026-04-20' },
    { empIdx: 0, projIdx: 1, task: 'Matte metallic foil packaging finish specifications', mins: 360, status: 'approved', date: '2026-04-22' },
    { empIdx: 1, projIdx: 8, task: 'FinTech interactive UI animation prototyping in After Effects', mins: 380, status: 'approved', date: '2026-04-25' },
    { empIdx: 2, projIdx: 12, task: 'Aura Estate exterior landscaping and pool water shaders', mins: 540, status: 'approved', date: '2026-04-18' },
    { empIdx: 3, projIdx: 2, task: 'Documentary rough assembly cut & documentary dialogue sync', mins: 420, status: 'approved', date: '2026-05-15' },
    { empIdx: 1, projIdx: 2, task: 'DaVinci Resolve film emulations & organic golden hour LUT', mins: 360, status: 'approved', date: '2026-05-25' },
    { empIdx: 2, projIdx: 19, task: 'Dark fantasy beast skeleton rigging & displacement maps', mins: 510, status: 'approved', date: '2026-05-12' },
    { empIdx: 4, projIdx: 19, task: 'Cinematic orchestral brass stems and impact sound design', mins: 390, status: 'approved', date: '2026-05-28' },
    { empIdx: 3, projIdx: 16, task: 'High-speed speed-ramp editing for PulseFit workout montage', mins: 450, status: 'approved', date: '2026-05-22' },
    { empIdx: 2, projIdx: 5, task: 'Thermal battery cooling fluid particles simulation in Houdini', mins: 480, status: 'approved', date: '2026-06-05' },
    { empIdx: 1, projIdx: 20, task: 'Neon stage lighting title card animation for comedy special', mins: 300, status: 'approved', date: '2026-06-22' },
    { empIdx: 2, projIdx: 17, task: 'PulseFit shoe sole rebound compression physics simulation', mins: 460, status: 'approved', date: '2026-07-08' },
    { empIdx: 1, projIdx: 6, task: 'Head-up display autonomous cockpit holographic UI animations', mins: 420, status: 'approved', date: '2026-07-25' },
    { empIdx: 3, projIdx: 13, task: 'Penthouse twilight drone photography stitching and grade', mins: 360, status: 'approved', date: '2026-07-10' },
    { empIdx: 0, projIdx: 3, task: 'Shopify hero product photography retouching & banner design', mins: 300, status: 'approved', date: '2026-07-28' },
    { empIdx: 4, projIdx: 18, task: 'Marathon anthem vocal tuning, 128 BPM electronic drops', mins: 420, status: 'approved', date: '2026-08-12' },
    { empIdx: 0, projIdx: 11, task: 'Singapore Keynote 4K widescreen master presentation deck', mins: 390, status: 'approved', date: '2026-08-28' },
    
    // Recent submitted logs for Admin Review & Notifications
    { empIdx: 2, projIdx: 21, task: 'Procedural galaxy vortex and gravitational lens warp FX', mins: 450, status: 'submitted', date: '2026-09-02' },
    { empIdx: 1, projIdx: 7, task: 'World EV Day kinetic typography teaser polish', mins: 330, status: 'submitted', date: '2026-09-04' },
    { empIdx: 3, projIdx: 18, task: 'Anthem music video multi-camera sync & colour match', mins: 410, status: 'submitted', date: '2026-09-06' },
    { empIdx: 5, projIdx: 15, task: 'Aura coffee table book foil block embossing dieline proofs', mins: 280, status: 'submitted', date: '2026-09-07' },
    { empIdx: 4, projIdx: 21, task: 'Deep space ambiances and dark drone synthesizer soundbed', mins: 320, status: 'submitted', date: '2026-09-08' },
    
    // One changes_requested and one rejected for testing status diversity
    { empIdx: 1, projIdx: 3, task: 'Instagram 9:16 vertical cut alternative variation', mins: 180, status: 'changes_requested', date: '2026-08-22' },
    { empIdx: 3, projIdx: 14, task: 'Exterior pool night pass test render', mins: 120, status: 'rejected', date: '2026-08-14' },
  ];

  for (const wl of workLogSamples) {
    const emp = employees[wl.empIdx];
    const prj = projects[wl.projIdx];
    const logDate = new Date(wl.date);
    await WorkLog.create({
      employeeId: emp._id,
      projectId: prj._id,
      workDate: logDate,
      taskName: wl.task,
      description: `Production deliverable for ${prj.projectName}`,
      totalMinutes: wl.mins,
      status: wl.status,
      reviewedBy: wl.status === 'approved' ? admin._id : undefined,
      reviewedAt: wl.status === 'approved' ? logDate : undefined,
      createdAt: logDate,
    });
  }
  console.log(`📝 [Seed] Created ${workLogSamples.length} Work Logs across employees.`);

  // 8. Seed Attendance for Last 7 Business Days
  const now = new Date();
  for (let dOffset = 7; dOffset >= 0; dOffset--) {
    const aDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dOffset);
    // Skip Sundays
    if (aDate.getDay() === 0) continue;

    for (let eIdx = 0; eIdx < employees.length; eIdx++) {
      const emp = employees[eIdx];
      // Deterministic variations: mostly present, occasionally late
      const isLate = (dOffset + eIdx) % 7 === 0;
      const clockInHour = isLate ? 10 : 9;
      const clockInMin = isLate ? 35 : 15;
      const clockIn = new Date(aDate.getFullYear(), aDate.getMonth(), aDate.getDate(), clockInHour, clockInMin, 0);
      const clockOut = new Date(aDate.getFullYear(), aDate.getMonth(), aDate.getDate(), 18, 30, 0);
      const totalMins = Math.round((clockOut.getTime() - clockIn.getTime()) / (1000 * 60));

      try {
        await Attendance.create({
          employeeId: emp._id,
          date: aDate,
          clockInAt: clockIn,
          clockOutAt: clockOut,
          totalMinutes: totalMins,
          status: isLate ? 'late' : 'present',
          notes: isLate ? 'Transit congestion delay' : undefined,
        });
      } catch {
        // Index unique constraint guard
      }
    }
  }
  console.log('⏱️ [Seed] Created Attendance records for recent business days.');

  // 9. Seed Completed Settlements and Official Digital Receipts
  const settlementPeriods = [
    { empIdx: 0, start: '2026-03-01', end: '2026-03-31', gross: 50400, paid: 50400, status: 'paid', date: '2026-04-05', ref: 'HDFC-PAY-449182' },
    { empIdx: 1, start: '2026-04-01', end: '2026-04-30', gross: 102000, paid: 102000, status: 'paid', date: '2026-05-05', ref: 'AXIS-PAY-882910' },
    { empIdx: 2, start: '2026-05-01', end: '2026-05-31', gross: 170000, paid: 170000, status: 'paid', date: '2026-06-05', ref: 'ICIC-PAY-338291' },
    { empIdx: 3, start: '2026-06-01', end: '2026-06-30', gross: 92800, paid: 92800, status: 'paid', date: '2026-07-05', ref: 'SBIN-PAY-772819' },
    { empIdx: 4, start: '2026-07-01', end: '2026-07-31', gross: 84000, paid: 84000, status: 'paid', date: '2026-08-05', ref: 'KKBK-PAY-991820' },
    { empIdx: 0, start: '2026-08-01', end: '2026-08-31', gross: 69600, paid: 0, status: 'approved', date: undefined, ref: undefined },
  ];

  for (let sIdx = 0; sIdx < settlementPeriods.length; sIdx++) {
    const sDef = settlementPeriods[sIdx];
    const emp = employees[sDef.empIdx];
    const sCode = generateSettlementCode(sIdx + 1, 2026);

    const settlement = await Settlement.create({
      settlementCode: sCode,
      employeeId: emp._id,
      periodStart: new Date(sDef.start),
      periodEnd: new Date(sDef.end),
      grossEarned: toDecimal(sDef.gross),
      adjustments: toDecimal(0),
      previouslyPaid: toDecimal(0),
      finalPayable: toDecimal(sDef.gross),
      status: sDef.status,
      paymentMethod: sDef.status === 'paid' ? 'bank_transfer' : undefined,
      paymentReference: sDef.ref,
      paymentDate: sDef.date ? new Date(sDef.date) : undefined,
      notes: `Payroll waterfall cycle for ${emp.fullName}`,
      createdBy: admin._id,
      paidBy: sDef.status === 'paid' ? admin._id : undefined,
      createdAt: new Date(sDef.start),
    });

    // Create Settlement Item
    await SettlementItem.create({
      settlementId: settlement._id,
      projectId: projects[sIdx % projects.length]._id,
      employeeId: emp._id,
      earnedAmount: toDecimal(sDef.gross),
      description: `Direct creator allocation disbursement for ${sCode}`,
      createdAt: new Date(sDef.start),
    });

    // If paid, create matching official Receipt voucher
    if (sDef.status === 'paid') {
      const rCode = generateReceiptCode(sIdx + 1, 2026);
      await Receipt.create({
        receiptCode: rCode,
        settlementId: settlement._id,
        employeeId: emp._id,
        receiptData: {
          settlementCode: sCode,
          employeeName: emp.fullName,
          employeeCode: emp.employeeCode,
          department: emp.department,
          designation: emp.designation,
          periodStart: sDef.start,
          periodEnd: sDef.end,
          grossEarned: sDef.gross,
          finalPayable: sDef.gross,
          paymentReference: sDef.ref,
          paymentDate: sDef.date,
          bankName: emp.bankDetails?.bankName,
          accountNumber: emp.bankDetails?.accountNumber,
        },
        issuedAt: new Date(sDef.date!),
        createdAt: new Date(sDef.date!),
      });
    }
  }
  console.log(`📑 [Seed] Created ${settlementPeriods.length} Payroll Settlements & matching Official Receipts.`);

  // 10. Seed Notifications for Interactive Bell
  const notificationSamples = [
    {
      role: 'admin',
      type: 'work_log',
      title: 'New Work Log Submitted',
      message: 'Vikramaditya Roy submitted "Procedural galaxy vortex and gravitational lens warp FX".',
      link: '/admin/work-logs',
      isRead: false,
      date: '2026-09-08T15:30:00Z',
    },
    {
      role: 'admin',
      type: 'payment',
      title: 'Client Payment Received',
      message: 'Received ₹4,00,000 from Kavya Media for Sci-Fi Web Series Title Sequence.',
      link: '/admin/payments',
      isRead: false,
      date: '2026-09-05T11:20:00Z',
    },
    {
      role: 'admin',
      type: 'project',
      title: 'New Project Confirmed',
      message: 'Project "Kavya Sci-Fi Web Series Title Sequence" (AAG-PRJ-2026-0022) was initiated.',
      link: '/admin/projects',
      isRead: true,
      date: '2026-09-01T09:00:00Z',
    },
    {
      role: 'admin',
      type: 'work_log',
      title: 'Work Log Pending Review',
      message: 'Neha Kulkarni submitted "Aura coffee table book foil block embossing dieline proofs".',
      link: '/admin/work-logs',
      isRead: false,
      date: '2026-09-07T14:45:00Z',
    },
    {
      role: 'admin',
      type: 'attendance',
      title: 'Staff Clocked In',
      message: 'Vikramaditya Roy clocked in at 09:45 AM.',
      link: '/admin/attendance',
      isRead: false,
      date: '2026-09-08T09:45:00Z',
    },
    {
      role: 'admin',
      type: 'attendance',
      title: 'Staff Clocked Out',
      message: 'Vikramaditya Roy clocked out at 06:30 PM. Total time: 8h 45m.',
      link: '/admin/attendance',
      isRead: false,
      date: '2026-09-08T18:30:00Z',
    },
    {
      role: 'admin',
      type: 'settlement',
      title: 'Settlement Cycle Ready',
      message: 'August 2026 payroll cycle for Rahul Patel is approved and pending disbursement.',
      link: '/admin/settlements',
      isRead: true,
      date: '2026-09-01T10:15:00Z',
    },
  ];

  for (const n of notificationSamples) {
    await Notification.create({
      role: n.role as any,
      type: n.type as any,
      title: n.title,
      message: n.message,
      link: n.link,
      isRead: n.isRead,
      createdAt: new Date(n.date),
    });
  }
  console.log(`🔔 [Seed] Created ${notificationSamples.length} Notification records.`);

  console.log('✨ [Seed] Comprehensive database seeding complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`• 1 Super Admin: ${adminEmail} (password: ${ENV.ADMIN_INITIAL_PASSWORD || 'Admin@123'})`);
  console.log(`• 6 Corporate Clients: Jyotnar, Nexus, Zephex, Aura, PulseFit, Kavya`);
  console.log(`• 6 Employees: Rahul, Ananya, Vikramaditya, Pooja, Siddharth, Neha (passwords: Name@123)`);
  console.log(`• 22 Projects spanning March to September 2026`);
  console.log(`• Over 25 Client Payments across all months`);
  console.log(`• 28 Work Logs with submitted & approved states`);
  console.log(`• Weekly Attendance records`);
  console.log(`• 6 Settlements & Official Payment Receipts`);
  console.log(`• Live Notification items for the Bell indicator`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await mongoose.disconnect();
}

seedComprehensiveDatabase().catch((err) => {
  console.error('❌ [Seed Error]:', err);
  process.exit(1);
});
