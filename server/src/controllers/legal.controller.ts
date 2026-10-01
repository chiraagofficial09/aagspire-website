import { Request, Response } from 'express';
import { LegalDocument, ILegalDocument, ILegalSection } from '../models/LegalDocument.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

const DEFAULT_TERMS: { title: string; subtitle: string; sections: ILegalSection[] } = {
  title: 'Terms & Conditions',
  subtitle: 'Official creative service agreement, delivery guidelines, and studio policies for Aagspire clients.',
  sections: [
    {
      heading: '1. Scope of Creative Services',
      description:
        'Aagspire is a premier branding and design studio providing identity design, packaging design, social media marketing, poster design, and digital creative services. The project deliverables, schedules, milestones, and deliverables are specified in the agreed project proposal or statement of work.',
      order: 1,
    },
    {
      heading: '2. Payment Terms & Milestone Invoicing',
      description:
        'All client projects commence following receipt of the agreed advance commitment deposit. Interim progress milestone payments are due upon milestone completion. Final high-resolution source vector files and full release deliverables are issued upon complete clearance of all invoices.',
      order: 2,
    },
    {
      heading: '3. Intellectual Property Rights & Ownership',
      description:
        'Upon receipt of full and final payment, the client receives exclusive ownership of the final approved creative deliverables. Aagspire retains the perpetual right to feature completed concepts, portfolio case studies, and design mockups across its marketing channels, award entries, and website.',
      order: 3,
    },
    {
      heading: '4. Revisions & Modification Guidelines',
      description:
        'Standard design packages include the number of revision rounds outlined in the initial project quotation. Significant conceptual changes requested after concept sign-off or beyond the designated rounds are subject to additional milestone or hourly billing.',
      order: 4,
    },
    {
      heading: '5. Client Communication & Turnaround',
      description:
        'Timely client feedback is essential to maintaining scheduled timelines. If client feedback or necessary project assets are delayed for more than fifteen (15) consecutive business days without prior notice, Aagspire reserves the right to archive the project and assess a reactivation fee.',
      order: 5,
    },
    {
      heading: '6. Limitation of Liability',
      description:
        'While Aagspire exercises due diligence, the client assumes responsibility for verifying trademark availability and print proofs before mass printing. Aagspire shall not be held liable for incidental, indirect, or consequential damages resulting from third-party trademark claims or print inaccuracies once approved.',
      order: 6,
    },
  ],
};

const DEFAULT_PRIVACY: { title: string; subtitle: string; sections: ILegalSection[] } = {
  title: 'Privacy Policy',
  subtitle: 'How Aagspire collects, protects, and respects client information and digital privacy.',
  sections: [
    {
      heading: '1. Information We Collect',
      description:
        'We collect necessary business and contact details when you inquire about our services, register for project management, or correspond with our studio. This includes your name, business trade name, email address, phone number, billing address, and brand creative assets.',
      order: 1,
    },
    {
      heading: '2. Purpose of Data Processing',
      description:
        'Collected information is utilized strictly to provide design deliverables, generate tax-compliant invoices and receipts, communicate project milestones, and provide customer support. We do not sell, rent, or lease your personal or business data to third-party marketing entities.',
      order: 2,
    },
    {
      heading: '3. Confidentiality of Client Assets',
      description:
        'All unreleased brand concepts, strategic briefs, trade secrets, and proprietary brand information shared with Aagspire are held under strict non-disclosure. Internal access is restricted exclusively to creative personnel assigned to your projects.',
      order: 3,
    },
    {
      heading: '4. Data Security & Retention',
      description:
        'We implement enterprise-grade security protocols, encryption, and secure cloud storage to protect your data from unauthorized access, loss, or alteration. Financial and invoice records are retained in compliance with statutory accounting regulations.',
      order: 4,
    },
    {
      heading: '5. Website Analytics & Cookies',
      description:
        'Our public marketing website may utilize cookies and privacy-friendly telemetry to analyze visitor traffic, page load speed, and optimize browsing experience. Cookies do not extract confidential credentials or personal files from your device.',
      order: 5,
    },
    {
      heading: '6. Your Rights & Contact Details',
      description:
        'You have the right to request access to, correction of, or deletion of your records stored within our studio system, subject to legal invoicing retention obligations. To exercise your privacy rights, please reach out to us at our Halvad studio or via official contact channels.',
      order: 6,
    },
  ],
};

// Helper: Ensure document exists or initialize default
async function getOrCreateDocument(type: 'terms_and_conditions' | 'privacy_policy'): Promise<ILegalDocument> {
  let doc = await LegalDocument.findOne({ type });
  if (!doc) {
    const template = type === 'terms_and_conditions' ? DEFAULT_TERMS : DEFAULT_PRIVACY;
    doc = await LegalDocument.create({
      type,
      title: template.title,
      subtitle: template.subtitle,
      sections: template.sections,
      lastUpdated: new Date(),
    });
  }
  return doc;
}

/**
 * Public API: Fetch Legal Document (Terms & Conditions or Privacy Policy)
 * GET /api/legal/:type
 */
export async function getPublicLegalDoc(req: Request, res: Response): Promise<void> {
  try {
    const { type } = req.params;
    if (type !== 'terms_and_conditions' && type !== 'privacy_policy') {
      res.status(400).json({ success: false, message: 'Invalid legal document type' });
      return;
    }

    const doc = await getOrCreateDocument(type);

    res.json({
      success: true,
      data: {
        type: doc.type,
        title: doc.title,
        subtitle: doc.subtitle,
        sections: doc.sections.sort((a, b) => a.order - b.order),
        lastUpdated: doc.lastUpdated,
      },
    });
  } catch (error: any) {
    console.error('Error fetching public legal document:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve legal document' });
  }
}

/**
 * Admin API: Fetch Legal Document for Editing
 * GET /api/legal/admin/:type
 */
export async function getAdminLegalDoc(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { type } = req.params;
    if (type !== 'terms_and_conditions' && type !== 'privacy_policy') {
      res.status(400).json({ success: false, message: 'Invalid legal document type' });
      return;
    }

    const doc = await getOrCreateDocument(type);

    res.json({
      success: true,
      data: {
        _id: doc._id,
        type: doc.type,
        title: doc.title,
        subtitle: doc.subtitle,
        sections: doc.sections.sort((a, b) => a.order - b.order),
        lastUpdated: doc.lastUpdated,
      },
    });
  } catch (error: any) {
    console.error('Error fetching admin legal document:', error);
    res.status(500).json({ success: false, message: 'Failed to load document for editing' });
  }
}

/**
 * Admin API: Update Legal Document (Title, Subtitle, Headings & Descriptions)
 * PUT /api/legal/admin/:type
 */
export async function updateAdminLegalDoc(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { type } = req.params;
    if (type !== 'terms_and_conditions' && type !== 'privacy_policy') {
      res.status(400).json({ success: false, message: 'Invalid legal document type' });
      return;
    }

    const { title, subtitle, sections } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      res.status(400).json({ success: false, message: 'Title is required' });
      return;
    }

    if (!Array.isArray(sections)) {
      res.status(400).json({ success: false, message: 'Sections array is required' });
      return;
    }

    // Format and sanitize sections
    const cleanSections: ILegalSection[] = sections.map((sec: any, index: number) => ({
      heading: String(sec.heading || '').trim(),
      description: String(sec.description || '').trim(),
      order: typeof sec.order === 'number' ? sec.order : index + 1,
    }));

    // Find and update or upsert
    let doc = await LegalDocument.findOne({ type });
    if (!doc) {
      doc = new LegalDocument({ type });
    }

    doc.title = title.trim();
    doc.subtitle = subtitle ? subtitle.trim() : '';
    doc.sections = cleanSections;
    doc.lastUpdated = new Date();
    if (req.user?._id) {
      doc.updatedBy = req.user._id;
    }

    await doc.save();

    res.json({
      success: true,
      message: `${doc.title} updated successfully`,
      data: {
        _id: doc._id,
        type: doc.type,
        title: doc.title,
        subtitle: doc.subtitle,
        sections: doc.sections.sort((a, b) => a.order - b.order),
        lastUpdated: doc.lastUpdated,
      },
    });
  } catch (error: any) {
    console.error('Error updating legal document:', error);
    res.status(500).json({ success: false, message: 'Failed to update legal document' });
  }
}
