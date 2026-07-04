import { jsPDF } from "jspdf";
import { ComplianceReport } from "../types";

export function generateCompliancePDF(report: ComplianceReport): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 20) {
      doc.addPage();
      drawPageBorder();
      y = 20;
    }
  };

  const drawPageBorder = () => {
    // Professional double border for B2B tone
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.rect(5, 5, pageWidth - 10, pageHeight - 10);
    doc.rect(5.8, 5.8, pageWidth - 11.6, pageHeight - 11.6);
    
    // Page footer
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `InspectoB2B Compliance & Audit Reports  |  Report ID: ${report.id.substring(0, 8).toUpperCase()}`,
      10,
      pageHeight - 8
    );
    doc.text(
      `Confidential Business Audit Report`,
      pageWidth - doc.getTextWidth(`Confidential Business Audit Report`) - 10,
      pageHeight - 8
    );
  };

  // Set up initial page border
  drawPageBorder();

  // --- COVER PAGE / MAIN HEADER ---
  doc.setFillColor(15, 23, 42); // Deep Slate
  doc.rect(10, 12, pageWidth - 20, 42, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text("INSPECTOB2B COMPLIANCE AUDIT", 15, 25);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(226, 232, 240); // Soft grey
  doc.text(`Official Compliance & Risk Mitigation Report`, 15, 32);
  doc.text(`Generated: ${new Date(report.date).toLocaleDateString()}  |  Location/Region: ${report.region}`, 15, 38);
  doc.text(`Business Name: ${report.businessName.toUpperCase()}`, 15, 44);

  y = 62;

  // --- SCORES / METRICS PANEL ---
  doc.setFillColor(248, 250, 252); // Off white
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.rect(10, y, pageWidth - 20, 32, "FD");

  // Compliance Score Block
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text("COMPLIANCE SCORE", 20, y + 10);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  if (report.complianceScore >= 80) {
    doc.setTextColor(16, 185, 129); // Green
  } else if (report.complianceScore >= 50) {
    doc.setTextColor(245, 158, 11); // Amber
  } else {
    doc.setTextColor(239, 68, 68); // Red
  }
  doc.text(`${report.complianceScore} / 100`, 20, y + 22);

  // Risk Level Block
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text("RISK EXPOSURE RATING", 85, y + 10);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  if (report.riskLevel === "Low") {
    doc.setTextColor(16, 185, 129); // Green
  } else if (report.riskLevel === "Medium") {
    doc.setTextColor(245, 158, 11); // Amber
  } else {
    doc.setTextColor(239, 68, 68); // Red
  }
  doc.text(report.riskLevel.toUpperCase(), 85, y + 21);

  // Checklist Summary Block
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text("AUDIT CHECKPOINT SUMMARY", 145, y + 10);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text(`Total Audited:  ${report.checklistSummary.total}`, 145, y + 16);
  doc.text(`Passed / OK:   ${report.checklistSummary.passed}`, 145, y + 21);
  doc.text(`Deficiencies:  ${report.checklistSummary.failed}`, 145, y + 26);

  y += 42;

  // --- EXECUTIVE SUMMARY SECTION ---
  checkPageBreak(30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text("1. EXECUTIVE SUMMARY & FOREWORDS", 10, y);
  
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(10, y + 2, pageWidth - 10, y + 2);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);

  const industryLabel = report.industry.replace('_', ' ').toUpperCase();
  const summaryText = `This diagnostic compliance assessment reports safety and regulatory standards for ${report.businessName} based in ${report.region}, operating in the ${industryLabel} sector. The comprehensive audit evaluated baseline fire safety, workplace hazards, operational protocols, and photographic site evidence. A compliance score of ${report.complianceScore}/100 places the organization in a [${report.riskLevel.toUpperCase()}] risk threshold. It is highly recommended that all identified high-severity deficiencies are remediated immediately to safeguard workers and protect the business from substantial regulatory liabilities.`;
  
  const splitSummary = doc.splitTextToSize(summaryText, pageWidth - 20);
  doc.text(splitSummary, 10, y);
  y += splitSummary.length * 5 + 6;

  // --- ITEMIZED FINDINGS SECTION ---
  checkPageBreak(25);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text("2. COMPLIANCE GAP ANALYSIS & REMEDIATION PLAN", 10, y);
  doc.line(10, y + 2, pageWidth - 10, y + 2);
  y += 8;

  if (report.findings.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text("No safety compliance gaps or deficiencies were detected during this audit. The facility is fully compliant with standard codes.", 10, y);
    y += 10;
  } else {
    report.findings.forEach((finding, index) => {
      checkPageBreak(45);

      // Card Header background for each gap card
      doc.setFillColor(241, 245, 249);
      doc.rect(10, y, pageWidth - 20, 8, "F");

      // Finding title with Index
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text(`${index + 1}. [${finding.category.toUpperCase()}] ${finding.title}`, 12, y + 5.5);

      // Severity badge
      const severityColor = finding.severity === "high" ? [239, 68, 68] : finding.severity === "medium" ? [245, 158, 11] : [59, 130, 246];
      doc.setFillColor(severityColor[0], severityColor[1], severityColor[2]);
      doc.rect(pageWidth - 35, y + 1.5, 22, 5, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(finding.severity.toUpperCase(), pageWidth - 24, y + 5, { align: "center" });

      y += 12;

      // Regulatory standard
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text("Regulatory Standard Ref:", 12, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 41, 59);
      doc.text(finding.regulatoryReference, 53, y);
      y += 5;

      // Description
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text("Observed Safety Gap:", 12, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      const splitDesc = doc.splitTextToSize(finding.description, pageWidth - 65);
      doc.text(splitDesc, 53, y);
      y += splitDesc.length * 4.5 + 1;

      // Remediation / Fix
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text("Actionable Fix Required:", 12, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      const splitFix = doc.splitTextToSize(finding.recommendation, pageWidth - 65);
      doc.text(splitFix, 53, y);
      y += splitFix.length * 4.5 + 2;

      // Cost & Effort estimates
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text("Cost Estimate:", 12, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 41, 59);
      doc.text(finding.costEstimate, 37, y);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 116, 139);
      doc.text("Timeline / Effort:", 85, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 41, 59);
      doc.text(finding.effortEstimate, 115, y);

      y += 10;
    });
  }

  // --- CERTIFICATE PAGE (ALWAYS ON A NEW PAGE) ---
  doc.addPage();
  drawPageBorder();

  y = 30;

  // Ornate frame lines for Certificate
  doc.setDrawColor(218, 165, 32); // Gold border
  doc.setLineWidth(0.8);
  doc.rect(12, 12, pageWidth - 24, pageHeight - 24);
  doc.setDrawColor(30, 41, 59); // Inner dark frame
  doc.setLineWidth(0.3);
  doc.rect(14, 14, pageWidth - 28, pageHeight - 28);

  // Certificate Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(15, 23, 42); // Slate
  doc.text("CERTIFICATE OF SELF-AUDIT", pageWidth / 2, y, { align: "center" });
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text("INSPECTOB2B COMPLIANCE & SAFETY ASSURANCE", pageWidth / 2, y, { align: "center" });
  y += 15;

  // Seal Graphic (Programmatic)
  doc.setFillColor(30, 41, 59);
  doc.circle(pageWidth / 2, y + 10, 14, "F");
  doc.setFillColor(218, 165, 32);
  doc.circle(pageWidth / 2, y + 10, 11.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(255, 255, 255);
  doc.text("INSPECTOB2B", pageWidth / 2, y + 8, { align: "center" });
  doc.text("COMPLIANT", pageWidth / 2, y + 11, { align: "center" });
  doc.text("2026", pageWidth / 2, y + 14, { align: "center" });
  y += 35;

  // Certificate Body
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(51, 65, 85);
  doc.text("This official certificate of record validates that the corporate entity", pageWidth / 2, y, { align: "center" });
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(report.businessName.toUpperCase(), pageWidth / 2, y, { align: "center" });
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(51, 65, 85);
  doc.text(`has successfully completed a digital self-guided hazard audit for the facility in`, pageWidth / 2, y, { align: "center" });
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text(report.region, pageWidth / 2, y, { align: "center" });
  y += 12;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  const termsText = "The facility safety structures, electrical arrangements, fire exits, emergency plans, and visual compliance checkpoints have been analyzed. Identified safety gaps have been cataloged for remediation under local code rules. This document is a digital attestation of corporate diligence.";
  const splitTerms = doc.splitTextToSize(termsText, pageWidth - 45);
  doc.text(splitTerms, pageWidth / 2, y, { align: "center" });
  y += splitTerms.length * 5 + 15;

  // Signatures
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.line(35, y, 85, y);
  doc.line(pageWidth - 85, y, pageWidth - 35, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text("Facility Assessor", 60, y + 5, { align: "center" });
  doc.text("InspectoB2B Compliance Board", pageWidth - 60, y + 5, { align: "center" });

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text("Digitally Signed", 60, y - 2, { align: "center" });
  doc.text("System Verified ID: " + report.id.substring(0, 8).toUpperCase(), pageWidth - 60, y - 2, { align: "center" });

  // Save the PDF!
  const sanitizedName = report.businessName.toLowerCase().replace(/[^a-z0-9]/g, "_");
  doc.save(`InspectoB2B_Compliance_Report_${sanitizedName}.pdf`);
}
