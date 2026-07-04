export type IndustryType = 'manufacturing' | 'office' | 'retail_fnb' | 'warehouse' | 'medical' | 'general';

export interface BusinessDetails {
  name: string;
  industry: IndustryType;
  size: 'small' | 'medium' | 'large';
  region: string; // e.g., "Maharashtra, India" or "California, USA"
}

export interface ChecklistItem {
  id: string;
  question: string;
  category: string;
  answer: 'yes' | 'no' | 'na';
  notes?: string;
}

export interface AuditFinding {
  id: string;
  title: string;
  category: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  regulatoryReference: string; // e.g., "OSHA Part 1910.303", "National Building Code § 4.2"
  recommendation: string;
  costEstimate: string; // e.g., "₹2,500 - ₹5,000" or "Low"
  effortEstimate: string; // e.g., "Immediate", "1-2 days", "2 weeks"
}

export interface ComplianceReport {
  id: string;
  businessName: string;
  industry: IndustryType;
  date: string;
  region: string;
  complianceScore: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  checklistSummary: {
    total: number;
    passed: number;
    failed: number;
    na: number;
  };
  findings: AuditFinding[];
  unlocked: boolean;
  paymentId?: string;
  paymentType?: 'single' | 'subscription';
  imagesAnalyzed: string[]; // references or descriptive labels of analyzed images
}

export interface ImageTemplate {
  id: string;
  name: string;
  description: string;
  url: string;
  mimeType: string;
}
