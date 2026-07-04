import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  ArrowRight,
  Upload,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Download,
  Building2,
  Globe,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Plus,
  Landmark,
  Calendar,
  Users,
  Briefcase,
  ShieldAlert,
  CreditCard,
  ChevronRight,
  Eye,
  Lock,
  ArrowLeft,
  Cloud,
  Database,
  Trash2
} from "lucide-react";
import { IndustryType, BusinessDetails, ChecklistItem, ComplianceReport } from "./types";
import { MOCK_PHOTO_TEMPLATES } from "./mockPhotos";
import { generateCompliancePDF } from "./utils/pdfGenerator";
import confetti from "canvas-confetti";
import { db, doc, setDoc, getDoc, getDocs, collection, query, where, handleFirestoreError, OperationType } from "./firebase";

// Default checklists by Industry Type
const CHECKLIST_TEMPLATES: Record<IndustryType, Omit<ChecklistItem, 'answer'>[]> = {
  manufacturing: [
    { id: "m1", question: "Are all machine rotational parts equipped with safety mechanical guards?", category: "Physical Safety" },
    { id: "m2", question: "Is Personal Protective Equipment (PPE) like steel-toe boots & eyewear provided and actively worn?", category: "PPE & Ergonomics" },
    { id: "m3", question: "Are the main electrical distribution boards insulated, locked, and marked with high-voltage signs?", category: "Electrical Safety" },
    { id: "m4", question: "Are designated Fire Extinguishers fully charged, inspected monthly, and completely unobstructed?", category: "Fire Safety" },
    { id: "m5", question: "Is a fully stocked first-aid station readily accessible on the warehouse floor?", category: "First Aid & Hygiene" },
    { id: "m6", question: "Are chemical and hazardous industrial waste materials stored in designated, ventilated zones?", category: "Physical Safety" },
  ],
  office: [
    { id: "o1", question: "Are all major walkways, escape routes, and doorways free of trailing cables and clutter?", category: "Physical Safety" },
    { id: "o2", question: "Are illuminated emergency exit indicators fully functional and equipped with battery backup?", category: "Fire Safety" },
    { id: "o3", question: "Are high-power server racks insulated and protected against overcurrent with ELCB breakers?", category: "Electrical Safety" },
    { id: "o4", question: "Is office ergonomic support (adjustable seating, proper screen height) evaluated for staff?", category: "PPE & Ergonomics" },
    { id: "o5", question: "Are fire response assembly maps and emergency hotlines visibly posted on each floor?", category: "Fire Safety" },
    { id: "o6", question: "Are medical emergency first-aid kits available and checked quarterly?", category: "First Aid & Hygiene" },
  ],
  retail_fnb: [
    { id: "r1", question: "Are kitchen/store food preparation areas kept in clean, sanitized, and pest-free conditions?", category: "First Aid & Hygiene" },
    { id: "r2", question: "Are commercial gas lines fitted with active solenoid emergency shut-off valves?", category: "Fire Safety" },
    { id: "r3", question: "Are dry-slippage warning hazard boards instantly placed during facility cleaning cycles?", category: "Physical Safety" },
    { id: "r4", question: "Is a certified Residual Current Circuit Breaker (RCCB) installed for wet counter appliances?", category: "Electrical Safety" },
    { id: "r5", question: "Are public exit routes clear and completely unlocked during operating hours?", category: "Fire Safety" },
    { id: "r6", question: "Are commercial waste bins sealed, covered, and removed from retail floors daily?", category: "First Aid & Hygiene" },
  ],
  warehouse: [
    { id: "w1", question: "Are high-density storage storage racks anchored and bolted directly to the warehouse floor?", category: "Physical Safety" },
    { id: "w2", question: "Are forklift lane boundaries painted with clear yellow reflective floor markings?", category: "Physical Safety" },
    { id: "w3", question: "Is there an isolated charging bay for electric forklift lead-acid batteries with ventilation?", category: "Electrical Safety" },
    { id: "w4", question: "Are safety helmets and reflective high-visibility jackets mandatory for the entire loading floor?", category: "PPE & Ergonomics" },
    { id: "w5", question: "Are automatic sprinkler networks and warehouse fire hoses pressure-tested?", category: "Fire Safety" },
    { id: "w6", question: "Is a chemical absorbent spill response kit available near receiving bays?", category: "First Aid & Hygiene" },
  ],
  medical: [
    { id: "h1", question: "Are biohazard sharps, syringes, and clinical waste disposed of in color-coded hazard bins?", category: "First Aid & Hygiene" },
    { id: "h2", question: "Are diagnostic heavy systems (X-Ray, MRI) fitted with dedicated double grounding wires?", category: "Electrical Safety" },
    { id: "h3", question: "Are high-pressure gas cylinders chained upright, isolated, and placed far from heaters?", category: "Physical Safety" },
    { id: "h4", question: "Are emergency clinic calling sirens functional in all general wards and washrooms?", category: "Documentation" },
    { id: "h5", question: "Is there a designated radiation exposure register maintained for laboratory personnel?", category: "Documentation" },
    { id: "h6", question: "Are medical crash carts with functional cardiac defibrillators checked daily?", category: "First Aid & Hygiene" },
  ],
  general: [
    { id: "g1", question: "Are emergency escape doors free of padlocks and easily pushable from inside during operation?", category: "Fire Safety" },
    { id: "g2", question: "Is the facility equipped with a fully functional smoke detector and central alarm bell?", category: "Fire Safety" },
    { id: "g3", question: "Are high-power heavy appliances kept on individual sockets instead of daisy-chained extensions?", category: "Electrical Safety" },
    { id: "g4", question: "Is the workspace provided with sufficient fresh air ventilation and adequate lighting?", category: "Physical Safety" },
    { id: "g5", question: "Are first-aid medicine kits labeled, accessible, and periodically restocked?", category: "First Aid & Hygiene" },
    { id: "g6", question: "Are crucial contact lists, fire plans, and regulatory notices clearly displayed?", category: "Documentation" },
  ],
};

export default function App() {
  // Navigation States: 'dashboard' | 'create_step1' | 'create_step2' | 'create_step3' | 'loading' | 'report_details'
  const [view, setView] = useState<string>("dashboard");
  const [reports, setReports] = useState<ComplianceReport[]>([]);
  const [activeReportId, setActiveReportId] = useState<string | null>(null);

  // Agency Subscription tier simulation ('free' | 'agency')
  const [userSubscription, setUserSubscription] = useState<'free' | 'agency'>('free');

  // Cloud Storage sync states
  const [userEmail, setUserEmail] = useState<string>(() => {
    return localStorage.getItem("inspectob2b_email") || "rahulnarayan018@gmail.com";
  });
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);

  // New Audit wizard data
  const [businessDetails, setBusinessDetails] = useState<BusinessDetails>({
    name: "",
    industry: "general",
    size: "small",
    region: "Maharashtra, India",
  });

  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]); // Base64 data urls
  const [selectedPhotoNames, setSelectedPhotoNames] = useState<string[]>([]);
  const [uploadedFilesCount, setUploadedFilesCount] = useState<number>(0);

  // Loading generation checklist simulation steps
  const [loadingStep, setLoadingStep] = useState<number>(0);
  const [loadingLogs, setLoadingLogs] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Toast notifications for user experience
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'warning' = 'info') => {
    setToast({ message, type });
    // Automatically clear the toast after 4.5 seconds
    setTimeout(() => {
      setToast(prev => prev && prev.message === message ? null : prev);
    }, 4500);
  };

  // Payment popup simulation states
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [paymentType, setPaymentType] = useState<'single' | 'agency_sub'>('single');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi' | 'netbanking'>('upi');
  const [upiId, setUpiId] = useState<string>("");
  const [cardNumber, setCardNumber] = useState<string>("");
  const [cardExpiry, setCardExpiry] = useState<string>("");
  const [cardCvv, setCardCvv] = useState<string>("");
  const [isPaying, setIsPaying] = useState<boolean>(false);

  // Sync with Firestore
  const syncWithFirebase = async (email: string) => {
    if (!email || !email.includes("@")) return;
    setIsSyncing(true);
    try {
      // 1. Fetch user subscription details
      const userDocRef = doc(db, "users", email);
      let userDocSnap;
      try {
        userDocSnap = await getDoc(userDocRef);
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, `users/${email}`);
        return;
      }
      
      let cloudSub: 'free' | 'agency' = 'free';
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        if (userData.subscription === 'agency') {
          cloudSub = 'agency';
        }
      } else {
        // If user doc doesn't exist, create it with local sub
        const localSub = localStorage.getItem("inspectob2b_subscription") || 'free';
        cloudSub = localSub as 'free' | 'agency';
        try {
          await setDoc(userDocRef, {
            email,
            subscription: cloudSub,
            updatedAt: new Date().toISOString()
          });
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, `users/${email}`);
        }
      }
      setUserSubscription(cloudSub);
      localStorage.setItem("inspectob2b_subscription", cloudSub);

      // 2. Fetch reports from Firestore
      const reportsCol = collection(db, "reports");
      const q = query(reportsCol, where("userEmail", "==", email));
      let querySnapshot;
      try {
        querySnapshot = await getDocs(q);
      } catch (e) {
        handleFirestoreError(e, OperationType.LIST, "reports");
        return;
      }
      
      const cloudReports: ComplianceReport[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        cloudReports.push({
          id: docSnap.id,
          businessName: data.businessName,
          industry: data.industry,
          date: data.date,
          region: data.region,
          complianceScore: data.complianceScore,
          riskLevel: data.riskLevel,
          checklistSummary: data.checklistSummary,
          findings: data.findings || [],
          unlocked: data.unlocked,
          paymentId: data.paymentId,
          paymentType: data.paymentType,
          imagesAnalyzed: data.imagesAnalyzed || []
        });
      });

      // 3. Merge Cloud & Local
      const savedLocal = localStorage.getItem("inspectob2b_reports");
      let localReports: ComplianceReport[] = [];
      if (savedLocal) {
        try {
          localReports = JSON.parse(savedLocal);
        } catch (e) {
          console.error(e);
        }
      }

      // Merge: Keep all unique reports by ID. Cloud wins conflicts.
      const reportsMap = new Map<string, ComplianceReport>();
      localReports.forEach(r => reportsMap.set(r.id, r));
      cloudReports.forEach(r => reportsMap.set(r.id, r));

      const mergedReports = Array.from(reportsMap.values()).sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      // 4. Upload local-only reports to Cloud
      for (const r of mergedReports) {
        const alreadyInCloud = cloudReports.some(cr => cr.id === r.id);
        if (!alreadyInCloud) {
          try {
            await setDoc(doc(db, "reports", r.id), {
              ...r,
              userEmail: email,
              createdAt: new Date().toISOString()
            });
          } catch (e) {
            handleFirestoreError(e, OperationType.WRITE, `reports/${r.id}`);
          }
        }
      }

      setReports(mergedReports);
      localStorage.setItem("inspectob2b_reports", JSON.stringify(mergedReports));
      localStorage.setItem("inspectob2b_email", email);
      showToast(`Cloud storage synchronized for ${email}!`, "success");
    } catch (err: any) {
      console.error("Firebase sync error:", err);
      showToast("Offline mode: running with cached local data.", "warning");
    } finally {
      setIsSyncing(false);
    }
  };

  // Sync on mount and email changes
  useEffect(() => {
    syncWithFirebase(userEmail);
  }, [userEmail]);

  // Save reports helper
  const saveReports = async (updated: ComplianceReport[]) => {
    setReports(updated);
    localStorage.setItem("inspectob2b_reports", JSON.stringify(updated));
    try {
      if (activeReportId) {
        const activeRep = updated.find(r => r.id === activeReportId);
        if (activeRep) {
          try {
            await setDoc(doc(db, "reports", activeRep.id), {
              ...activeRep,
              userEmail,
              updatedAt: new Date().toISOString()
            });
          } catch (e) {
            handleFirestoreError(e, OperationType.WRITE, `reports/${activeRep.id}`);
          }
        }
      }
    } catch (e) {
      console.error("Cloud save failed, will sync next time online", e);
    }
  };

  // Toggle custom industry checklist
  const handleStartNewAudit = () => {
    setBusinessDetails({
      name: "",
      industry: "general",
      size: "small",
      region: "Maharashtra, India",
    });
    setSelectedPhotos([]);
    setSelectedPhotoNames([]);
    setUploadedFilesCount(0);
    setErrorMsg(null);
    setView("create_step1");
  };

  // Initialize questions on step 2
  const handleProceedToStep2 = () => {
    if (!businessDetails.name.trim()) {
      setErrorMsg("Please enter your registered Business/Facility name to continue.");
      return;
    }
    if (!businessDetails.region.trim()) {
      setErrorMsg("Please enter your physical Local Region (e.g., California, USA) to evaluate localized laws.");
      return;
    }
    setErrorMsg(null);
    
    // Instantiate template with default 'yes' values
    const template = CHECKLIST_TEMPLATES[businessDetails.industry];
    const initialChecklist: ChecklistItem[] = template.map(item => ({
      ...item,
      answer: "yes",
      notes: ""
    }));
    
    setChecklist(initialChecklist);
    setView("create_step2");
  };

  const handleUpdateChecklistAnswer = (id: string, ans: 'yes' | 'no' | 'na') => {
    setChecklist(prev => prev.map(item => item.id === id ? { ...item, answer: ans } : item));
  };

  const handleUpdateChecklistNotes = (id: string, notes: string) => {
    setChecklist(prev => prev.map(item => item.id === id ? { ...item, notes } : item));
  };

  const handleCustomPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const fileList = Array.from(files) as File[];
    fileList.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setSelectedPhotos(prev => [...prev, reader.result as string]);
          setSelectedPhotoNames(prev => [...prev, file.name]);
          setUploadedFilesCount(prev => prev + 1);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSelectMockTemplate = (template: typeof MOCK_PHOTO_TEMPLATES[0]) => {
    // Only allow max 3 photos
    if (selectedPhotos.length >= 3) {
      showToast("You can select or upload a maximum of 3 safety inspection photos.", "warning");
      return;
    }
    setSelectedPhotos(prev => [...prev, template.url]);
    setSelectedPhotoNames(prev => [...prev, template.name]);
  };

  const handleRemovePhoto = (index: number) => {
    setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
    setSelectedPhotoNames(prev => prev.filter((_, i) => i !== index));
  };

  // Trigger Backend Audit Analysis via server-side Gemini 3.5-flash
  const handleGenerateAuditReport = async () => {
    setView("loading");
    setLoadingStep(0);
    setLoadingLogs(["Initiating connection to InspectoB2B Compliance Engine..."]);

    const interval = setInterval(() => {
      setLoadingStep(prev => {
        const next = prev + 1;
        if (next === 1) {
          setLoadingLogs(l => [...l, "Uploading visual site photographic evidence for AI scanning..."]);
        } else if (next === 2) {
          setLoadingLogs(l => [...l, `Scanning safety structures with localized ${businessDetails.region} legal acts...`]);
        } else if (next === 3) {
          setLoadingLogs(l => [...l, "Detecting safety hazard gaps & formulating actionable remediation instructions..."]);
        } else if (next === 4) {
          setLoadingLogs(l => [...l, "Structuring audit score, compliance rating, and PDF layout schema..."]);
        }
        return next;
      });
    }, 1800);

    try {
      const response = await fetch("/api/gemini/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessDetails,
          checklist,
          photos: selectedPhotos
        })
      });

      clearInterval(interval);

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || "Internal Server Audit Call Failed");
      }

      const result = await response.json();
      
      const newReport: ComplianceReport = {
        id: "rep_" + Math.random().toString(36).substring(2, 11),
        businessName: businessDetails.name,
        industry: businessDetails.industry,
        date: new Date().toISOString(),
        region: businessDetails.region,
        complianceScore: result.complianceScore,
        riskLevel: result.riskLevel as 'Low' | 'Medium' | 'High',
        checklistSummary: {
          total: checklist.length,
          passed: checklist.filter(c => c.answer === 'yes').length,
          failed: checklist.filter(c => c.answer === 'no').length,
          na: checklist.filter(c => c.answer === 'na').length
        },
        findings: result.findings,
        unlocked: userSubscription === 'agency', // auto-unlocked if agency subscriber
        imagesAnalyzed: selectedPhotoNames.length > 0 ? selectedPhotoNames : ["Standard Checklist Evaluation"]
      };

      try {
        await setDoc(doc(db, "reports", newReport.id), {
          ...newReport,
          userEmail,
          createdAt: new Date().toISOString()
        });
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `reports/${newReport.id}`);
      }

      const updatedReports = [newReport, ...reports];
      await saveReports(updatedReports);
      setActiveReportId(newReport.id);
      
      // Complete loading
      setLoadingLogs(l => [...l, "Compliance Report generated successfully!"]);
      setTimeout(() => {
        setView("report_details");
        if (userSubscription !== 'agency') {
          openPaymentModal('single');
        }
      }, 500);

    } catch (err: any) {
      clearInterval(interval);
      console.error(err);
      setErrorMsg(err.message || "Something went wrong while compiling the compliance report.");
      setView("create_step3"); // go back to photo screen
    }
  };

  const getActiveReport = (): ComplianceReport | null => {
    return reports.find(r => r.id === activeReportId) || null;
  };

  // Payment Simulator triggers
  const openPaymentModal = (type: 'single' | 'agency_sub') => {
    setPaymentType(type);
    setShowPaymentModal(true);
    // Auto fill credentials with dummy values to ease testing
    if (type === 'single') {
      setUpiId("safety.officer@okaxis");
    } else {
      setUpiId("agency.admin@okhdfc");
    }
    setCardNumber("4321 8765 0987 1122");
    setCardExpiry("12/29");
    setCardCvv("733");
  };

  const handleSimulatePayment = () => {
    setIsPaying(true);
    setTimeout(async () => {
      setIsPaying(false);
      setShowPaymentModal(false);
      
      if (paymentType === 'single') {
        // Unlock current report
        if (activeReportId) {
          const updated = reports.map(r => r.id === activeReportId ? { ...r, unlocked: true, paymentId: "PAY_" + Math.random().toString(36).substring(2, 9).toUpperCase(), paymentType: 'single' as const } : r);
          await saveReports(updated);

          // Sync this specific unlocked report to cloud
          const updatedRep = updated.find(r => r.id === activeReportId);
          if (updatedRep) {
            try {
              await setDoc(doc(db, "reports", activeReportId), {
                ...updatedRep,
                userEmail,
                updatedAt: new Date().toISOString()
              });
              showToast("Report payment registered in Cloud successfully!", "success");
            } catch (e) {
              handleFirestoreError(e, OperationType.WRITE, `reports/${activeReportId}`);
            }
          }
        }
        
        // Celebration!
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });
      } else {
        // Subscribe to Agency
        setUserSubscription('agency');
        localStorage.setItem("inspectob2b_subscription", "agency");
        
        // Save sub status in Firestore
        try {
          await setDoc(doc(db, "users", userEmail), {
            email: userEmail,
            subscription: "agency",
            updatedAt: new Date().toISOString()
          });
          showToast("Pro Agency Subscription registered in Cloud!", "success");
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, `users/${userEmail}`);
        }

        // Auto unlock ALL existing reports too
        const updated = reports.map(r => ({ ...r, unlocked: true, paymentType: 'subscription' as const }));
        await saveReports(updated);

        // Upload all reports back to cloud as unlocked
        for (const r of updated) {
          try {
            await setDoc(doc(db, "reports", r.id), {
              ...r,
              userEmail,
              updatedAt: new Date().toISOString()
            });
          } catch (e) {
            handleFirestoreError(e, OperationType.WRITE, `reports/${r.id}`);
          }
        }
        
        confetti({
          particleCount: 200,
          spread: 100,
          colors: ['#0f172a', '#0d9488', '#fbbf24']
        });
      }
    }, 1500);
  };

  const handleDownloadPDF = (report: ComplianceReport) => {
    generateCompliancePDF(report);
  };

  const activeReport = getActiveReport();

  return (
    <div id="app-root" className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col antialiased">
      
      {/* HEADER BAR */}
      <header id="app-header" className="sticky top-0 z-40 bg-white text-slate-800 shadow-sm border-b border-slate-200 shrink-0">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex justify-between items-center">
          <div className="flex items-center gap-3.5">
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setView("dashboard")}>
              <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white font-extrabold shadow-sm">
                I
              </div>
              <div>
                <h1 className="text-lg font-display font-bold tracking-tight text-slate-800 flex items-center gap-1.5 leading-none">
                  Inspecto<span className="text-indigo-600">B2B</span>
                </h1>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Government & Safety Code Auditor</p>
              </div>
            </div>
          </div>

          <div className="hidden md:flex gap-6 text-xs font-bold uppercase tracking-wider text-slate-500 items-center">
            <button onClick={() => setView("dashboard")} className={`transition hover:text-indigo-600 ${view === "dashboard" ? "text-indigo-600" : ""}`}>Dashboard</button>
            <button onClick={() => setView("dashboard")} className="transition hover:text-indigo-600">Past Audits</button>
            <button 
              onClick={() => {
                if (reports.length > 0) {
                  setActiveReportId(reports[0].id);
                  setView("report_details");
                } else {
                  handleStartNewAudit();
                }
              }} 
              className={`transition hover:text-indigo-600 ${view.startsWith("create_") || view === "report_details" ? "text-indigo-600" : ""}`}
            >
              Active Audit
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Subscription Badge */}
            {userSubscription === 'agency' ? (
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Pro Agency Plan</span>
              </div>
            ) : (
              <button 
                onClick={() => openPaymentModal('agency_sub')}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 px-3 py-1.5 rounded-full text-xs border border-indigo-100 font-semibold transition flex items-center gap-1 shadow-sm"
              >
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                <span>Go Pro Agency</span>
              </button>
            )}

            {/* Cloud User Profile Widget */}
            <div 
              onClick={() => setShowProfileModal(true)}
              className="flex items-center gap-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 pl-2.5 pr-3 py-1.5 rounded-full transition cursor-pointer shadow-sm" 
              title="Cloud Synchronization Panel"
            >
              <div className="relative">
                <div className="w-5 h-5 bg-indigo-600 rounded-full text-[10px] font-bold text-white flex items-center justify-center uppercase">
                  {userEmail.charAt(0)}
                </div>
                {isSyncing ? (
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                  </span>
                ) : (
                  <span className="absolute -bottom-0.5 -right-0.5 block h-2 w-2 rounded-full bg-emerald-500 border border-white" title="Cloud Synced"></span>
                )}
              </div>
              <span className="text-xs font-semibold text-slate-700 hidden lg:inline truncate max-w-[120px]" title={userEmail}>
                {userEmail.split("@")[0]}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* VIEWPORT AREA */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 flex flex-col">

        {/* 1. DASHBOARD VIEW */}
        {view === "dashboard" && (
          <div id="view-dashboard" className="flex flex-col gap-8 animate-fade-in">
            
            {/* HERO SECTION */}
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden border border-slate-800">
              <div className="absolute right-0 bottom-0 opacity-10 translate-x-10 translate-y-10">
                <ShieldCheck className="w-96 h-96" />
              </div>
              <div className="max-w-2xl relative z-10">
                <span className="bg-indigo-500/10 text-indigo-400 text-xs px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider border border-indigo-500/30">
                  Instant Regulatory Diagnostic
                </span>
                <h2 className="text-2xl md:text-3xl font-display font-bold mt-3 leading-tight">
                  Stop hiring expensive audit agencies. Generate audit-ready safety reports instantly.
                </h2>
                <p className="text-slate-400 text-sm mt-3 leading-relaxed">
                  Upload workplace photos, complete high-density safety checklists, and let InspectoB2B AI evaluate safety violations, cross-reference regional codes, and generate professional compliance PDF reports.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    onClick={handleStartNewAudit}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl transition shadow-lg shadow-indigo-950/40 flex items-center gap-2 group text-sm"
                  >
                    <span>Run Workplace Safety Audit</span>
                    <ArrowRight className="w-4 h-4 transition group-hover:translate-x-1" />
                  </button>
                  <button
                    onClick={() => openPaymentModal('agency_sub')}
                    className="bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white px-5 py-3 rounded-xl border border-slate-750 font-semibold transition text-sm flex items-center gap-2"
                  >
                    <span>Agency Subscription</span>
                    <span className="text-xs text-amber-400 font-bold">₹12,500/mo</span>
                  </button>
                </div>
              </div>
            </div>

            {/* STATS ROW */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="bg-slate-50 text-slate-600 p-3 rounded-lg border border-slate-100">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Total Evaluated</p>
                  <h3 className="text-2xl font-bold mt-0.5">{reports.length} Reports</h3>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="bg-indigo-50 text-indigo-600 p-3 rounded-lg border border-indigo-100">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Avg Compliance Score</p>
                  <h3 className="text-2xl font-bold mt-0.5 text-indigo-600">
                    {reports.length > 0 
                      ? Math.round(reports.reduce((acc, curr) => acc + curr.complianceScore, 0) / reports.length) 
                      : "0"}%
                  </h3>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="bg-amber-50 text-amber-600 p-3 rounded-lg border border-amber-100">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Pending Violations</p>
                  <h3 className="text-2xl font-bold mt-0.5 text-amber-600">
                    {reports.reduce((acc, curr) => acc + curr.checklistSummary.failed, 0)} Gaps
                  </h3>
                </div>
              </div>
            </div>

            {/* MAIN PORTION: REPORT HISTORY & PRICING */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              {/* HISTORIC COMPLIANCE REPORTS */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                  <div>
                    <h3 className="font-display font-bold text-slate-900 text-base">Your Safety Audit Register</h3>
                    <p className="text-xs text-slate-500">History of digital self-audits and regulatory scans</p>
                  </div>
                  {reports.length > 0 && (
                    <button 
                      onClick={handleStartNewAudit} 
                      className="text-indigo-600 hover:text-indigo-700 text-xs font-bold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>New Audit</span>
                    </button>
                  )}
                </div>

                {reports.length === 0 ? (
                  <div className="p-12 text-center flex flex-col items-center justify-center">
                    <div className="bg-slate-100 p-4 rounded-full text-slate-400 mb-3">
                      <FileText className="w-8 h-8" />
                    </div>
                    <h4 className="text-slate-800 font-semibold">No Compliance Reports Yet</h4>
                    <p className="text-slate-500 text-xs mt-1.5 max-w-sm">
                      Perform your very first compliance audit setup. Simply choose your industry, answer safety check-questions, upload images, and analyze.
                    </p>
                    <button
                      onClick={handleStartNewAudit}
                      className="mt-5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-lg transition"
                    >
                      Create First Compliance Report
                    </button>
                  </div>
                ) : (
                  <div className="p-4 flex flex-col gap-3 max-h-[440px] overflow-y-auto">
                    {reports.map((report) => (
                      <div 
                        key={report.id} 
                        className="p-4 bg-slate-50/40 hover:bg-white border border-slate-100 hover:border-indigo-100 rounded-xl transition-all duration-200 flex items-center justify-between cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-0.5"
                        onClick={() => {
                          setActiveReportId(report.id);
                          setView("report_details");
                        }}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          {/* Compliance visual badge */}
                          <div className={`p-2 rounded-lg text-center flex flex-col items-center justify-center font-bold text-xs w-11 h-11 ${
                            report.complianceScore >= 80 
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                              : report.complianceScore >= 50 
                                ? 'bg-amber-50 text-amber-600 border border-amber-100' 
                                : 'bg-rose-50 text-rose-600 border border-rose-100'
                          }`}>
                            <span className="text-sm">{report.complianceScore}</span>
                            <span className="text-[7px] -mt-0.5">SCORE</span>
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-800 text-sm truncate">{report.businessName}</h4>
                            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-0.5 text-xs text-slate-500">
                              <span className="capitalize font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-[10px]">{report.industry.replace('_', ' ')}</span>
                              <span>•</span>
                              <span>{report.region}</span>
                              <span>•</span>
                              <span>{new Date(report.date).toLocaleDateString()}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                                <Cloud className="w-3 h-3 text-emerald-500" />
                                <span>Cloud Synced</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {report.unlocked ? (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded uppercase border border-emerald-200">
                              Unlocked
                            </span>
                          ) : (
                            <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded uppercase border border-slate-200 flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" />
                              <span>Draft</span>
                            </span>
                          )}
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* B2B MONETISATION CORNER */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col gap-5">
                <div>
                  <h3 className="font-display font-bold text-slate-900 text-base">Commercial Subscriptions</h3>
                  <p className="text-xs text-slate-500">InspectoB2B flexible payment plans for enterprises</p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-600 uppercase">Single Diagnostic Report</span>
                    <span className="bg-indigo-100 text-indigo-800 text-[9px] font-bold px-2 py-0.5 rounded border border-indigo-200">POPULAR</span>
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-extrabold text-slate-900">₹2,500</span>
                    <span className="text-xs text-slate-500">/ per generated report</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Instantly unlock granular AI compliance findings, regulatory standard references, and downloadable audit-ready compliance PDF + Official certificate.
                  </p>
                  <button 
                    onClick={() => openPaymentModal('single')}
                    className="mt-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg text-xs transition shadow-sm"
                  >
                    Unlock Single Audit Report
                  </button>
                </div>

                <div className="bg-amber-500/5 p-4 rounded-xl border border-amber-500/20 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-amber-800 uppercase">Pro Agency Access</span>
                    <span className="bg-amber-500/10 text-amber-700 text-[9px] font-bold px-2 py-0.5 rounded">BEST VALUE</span>
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-extrabold text-slate-900">₹12,500</span>
                    <span className="text-xs text-slate-500">/ month subscription</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Best suited for freelance consultants, scaling industrial agencies, and factory managers with multiple facilities. Generate unlimited audits.
                  </p>
                  {userSubscription === 'agency' ? (
                    <div className="mt-3 bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg text-xs text-center border border-emerald-500 shadow-sm">
                      Active Agency Subscription
                    </div>
                  ) : (
                    <button 
                      onClick={() => openPaymentModal('agency_sub')}
                      className="mt-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2 px-4 rounded-lg text-xs transition shadow-sm"
                    >
                      Subscribe & Unlock Unlimited
                    </button>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* 2. CREATE REPORT - STEP 1: BUSINESS PROFILE */}
        {view === "create_step1" && (
          <div id="view-step1" className="max-w-2xl mx-auto w-full bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden animate-fade-in">
            
            {/* Form Header */}
            <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between border-b border-slate-800">
              <div>
                <h3 className="font-display font-bold text-base text-white">New Compliance Audit</h3>
                <p className="text-slate-400 text-xs">Step 1 of 3: Facility profile & details</p>
              </div>
              <button onClick={() => setView("dashboard")} className="text-slate-400 hover:text-white text-xs font-semibold">
                Cancel
              </button>
            </div>

            {/* Form Body */}
            <div className="p-6 flex flex-col gap-5">
              {errorMsg && (
                <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs p-3 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Business Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Registered Business / Facility Name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                    <Building2 className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={businessDetails.name}
                    onChange={(e) => setBusinessDetails(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g., Techspace Coworking, Omega Textiles, Royal Bakers"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition"
                  />
                </div>
              </div>

              {/* Industry Selection */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Industry / Sector</label>
                <p className="text-[11px] text-slate-400 -mt-1">We customize checklist safety questions based on industry standards</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(['general', 'office', 'manufacturing', 'warehouse', 'retail_fnb', 'medical'] as const).map((ind) => (
                    <button
                      key={ind}
                      onClick={() => setBusinessDetails(p => ({ ...p, industry: ind }))}
                      className={`p-3.5 rounded-xl border text-left flex flex-col gap-1 transition ${
                        businessDetails.industry === ind
                          ? 'border-indigo-600 bg-indigo-50 text-slate-900 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100/50 text-slate-600'
                      }`}
                    >
                      <span className="font-bold text-xs capitalize">{ind.replace('_', ' & ')}</span>
                      <span className="text-[9px] text-slate-400">
                        {ind === 'manufacturing' && "Factories, workshops"}
                        {ind === 'office' && "Co-working, IT offices"}
                        {ind === 'retail_fnb' && "Restaurants, outlets"}
                        {ind === 'warehouse' && "Logistics, storage"}
                        {ind === 'medical' && "Clinics, labs"}
                        {ind === 'general' && "Standard safety guidelines"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Region */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Local Region / Jurisdiction</label>
                <p className="text-[11px] text-slate-400 -mt-1">Determines whether to cite BIS, Factories Act 1948, or OSHA rules</p>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                    <Globe className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={businessDetails.region}
                    onChange={(e) => setBusinessDetails(p => ({ ...p, region: e.target.value }))}
                    placeholder="e.g., Maharashtra, India or California, USA"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition"
                  />
                </div>
              </div>

              {/* Facility Size */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Facility Enterprise Size</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['small', 'medium', 'large'] as const).map((sz) => (
                    <button
                      key={sz}
                      onClick={() => setBusinessDetails(p => ({ ...p, size: sz }))}
                      className={`py-2 rounded-lg border font-semibold text-xs capitalize transition ${
                        businessDetails.size === sz
                          ? 'border-indigo-600 bg-indigo-600 text-white'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Footer buttons */}
            <div className="bg-slate-50 px-6 py-4 flex justify-between items-center border-t border-slate-100">
              <button
                onClick={() => setView("dashboard")}
                className="text-slate-500 hover:text-slate-800 text-xs font-semibold"
              >
                Back to Dashboard
              </button>
              <button
                onClick={handleProceedToStep2}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-lg text-xs transition flex items-center gap-1.5 shadow-sm"
              >
                <span>Continue to Checklist</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        )}

        {/* 3. CREATE REPORT - STEP 2: DYNAMIC CHECKLIST */}
        {view === "create_step2" && (
          <div id="view-step2" className="max-w-3xl mx-auto w-full bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden animate-fade-in">
            
            {/* Header */}
            <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between border-b border-slate-800">
              <div>
                <h3 className="font-display font-bold text-base text-white">Workplace Safety Checklist</h3>
                <p className="text-slate-400 text-xs">Step 2 of 3: Complete diagnostic safety checkpoints</p>
              </div>
              <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded border border-indigo-500 font-bold uppercase tracking-wider">
                {businessDetails.industry.replace('_', ' ')} Custom template
              </span>
            </div>

            {/* Body */}
            <div className="p-6 flex flex-col gap-6">
              
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex gap-3">
                <ShieldCheck className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-slate-600 leading-relaxed">
                  <strong>Guideline:</strong> Please provide accurate details. If a guideline is not applicable to your setup, select <strong>N/A</strong>. Add brief notes if you need to clarify special setups (e.g., "Extinguishers serviced last week").
                </div>
              </div>

              {/* Real-time Checklist Stats Segment Bar */}
              {(() => {
                const yesCount = checklist.filter(item => item.answer === 'yes').length;
                const noCount = checklist.filter(item => item.answer === 'no').length;
                const naCount = checklist.filter(item => item.answer === 'na').length;
                const total = checklist.length;
                
                const yesPct = total > 0 ? (yesCount / total) * 100 : 0;
                const noPct = total > 0 ? (noCount / total) * 100 : 0;
                const naPct = total > 0 ? (naCount / total) * 100 : 0;

                return (
                  <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs flex flex-col gap-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-700 uppercase tracking-wider">Live Diagnostic Proportion</span>
                      <span className="font-mono text-slate-500 font-semibold">{yesCount + noCount + naCount} of {total} Checkpoints Answered</span>
                    </div>

                    {/* Progress Segment bar */}
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                      <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${yesPct}%` }} title={`Yes: ${yesCount}`} />
                      <div className="bg-rose-500 h-full transition-all duration-300" style={{ width: `${noPct}%` }} title={`No: ${noCount}`} />
                      <div className="bg-slate-400 h-full transition-all duration-300" style={{ width: `${naPct}%` }} title={`N/A: ${naCount}`} />
                    </div>

                    {/* Label row */}
                    <div className="grid grid-cols-3 gap-2 text-[10px] font-bold text-slate-600">
                      <div className="flex items-center gap-1.5 justify-center bg-emerald-50 border border-emerald-100/50 py-1 rounded-lg">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>Compliant: {yesCount}</span>
                      </div>
                      <div className="flex items-center gap-1.5 justify-center bg-rose-50 border border-rose-100/50 py-1 rounded-lg">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        <span>Violations: {noCount}</span>
                      </div>
                      <div className="flex items-center gap-1.5 justify-center bg-slate-50 border border-slate-100 py-1 rounded-lg">
                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                        <span>N/A: {naCount}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="flex flex-col gap-4">
                {checklist.map((item, idx) => (
                  <div key={item.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 flex flex-col gap-3">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex gap-2">
                        <span className="font-bold text-xs text-slate-400 mt-0.5">#{idx + 1}</span>
                        <div>
                          <span className="text-[9px] bg-slate-200 text-slate-600 font-bold px-1.5 py-0.5 rounded uppercase mr-1.5">
                            {item.category}
                          </span>
                          <p className="text-xs font-bold text-slate-800 mt-1 leading-relaxed">{item.question}</p>
                        </div>
                      </div>

                      {/* State selections */}
                      <div className="flex bg-slate-200 p-0.5 rounded-lg shrink-0">
                        <button
                          onClick={() => handleUpdateChecklistAnswer(item.id, 'yes')}
                          className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                            item.answer === 'yes'
                              ? 'bg-emerald-500 text-white shadow-sm'
                              : 'text-slate-600 hover:text-slate-950'
                          }`}
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => handleUpdateChecklistAnswer(item.id, 'no')}
                          className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                            item.answer === 'no'
                              ? 'bg-rose-500 text-white shadow-sm'
                              : 'text-slate-600 hover:text-slate-950'
                          }`}
                        >
                          No
                        </button>
                        <button
                          onClick={() => handleUpdateChecklistAnswer(item.id, 'na')}
                          className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                            item.answer === 'na'
                              ? 'bg-slate-400 text-white shadow-sm'
                              : 'text-slate-600 hover:text-slate-950'
                          }`}
                        >
                          N/A
                        </button>
                      </div>
                    </div>

                    {/* Note Input */}
                    <input
                      type="text"
                      value={item.notes || ""}
                      onChange={(e) => handleUpdateChecklistNotes(item.id, e.target.value)}
                      placeholder="Add an optional descriptive note or observation..."
                      className="bg-white border border-slate-200/80 rounded-lg px-3 py-1.5 text-[11px] outline-none focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                    />
                  </div>
                ))}
              </div>

            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-4 flex justify-between items-center border-t border-slate-100">
              <button
                onClick={() => setView("create_step1")}
                className="text-slate-500 hover:text-slate-800 text-xs font-semibold flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Profile details</span>
              </button>
              <button
                onClick={() => setView("create_step3")}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-lg text-xs transition flex items-center gap-1.5 shadow-sm"
              >
                <span>Continue to Photographic Evidence</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        )}

        {/* 4. CREATE REPORT - STEP 3: WORKPLACE PHOTOS */}
        {view === "create_step3" && (
          <div id="view-step3" className="max-w-3xl mx-auto w-full bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden animate-fade-in">
            
            {/* Header */}
            <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between border-b border-slate-800">
              <div>
                <h3 className="font-display font-bold text-base text-white">Photographic Visual Evidence</h3>
                <p className="text-slate-400 text-xs">Step 3 of 3: Upload photos of facility setups</p>
              </div>
              <span className="text-xs text-slate-400 font-semibold">Max 3 photos</span>
            </div>

            {/* Body */}
            <div className="p-6 flex flex-col gap-6">

              {errorMsg && (
                <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs p-3 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <h4 className="font-bold text-slate-800 text-sm">Upload custom photos or test hazard templates</h4>
                <p className="text-xs text-slate-500">Our server-side Gemini 3.5-flash scans these visual states, detecting hazards, wiring defects, or corridor blockage as real audit findings.</p>
              </div>

              {/* 2 Methods box */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Method A: Upload Custom Files */}
                <div className="border border-dashed border-slate-300 rounded-xl p-5 flex flex-col items-center justify-center text-center bg-slate-50 hover:bg-slate-100/40 transition">
                  <Upload className="w-8 h-8 text-slate-400 mb-2" />
                  <span className="text-xs font-bold text-slate-700">Upload Facility Photo Files</span>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-xs">Supports JPG, PNG, WEBP files. Capture directly on mobile camera.</p>
                  
                  <label className="mt-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer transition">
                    <span>Browse files</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleCustomPhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Method B: Selector of mock template states */}
                <div className="border border-slate-200 rounded-xl p-5 flex flex-col gap-3">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Or Select Hazard Preset Templates</span>
                  </span>
                  <p className="text-[10px] text-slate-400 -mt-1">Instantly check out the physical hazard identification engine in action:</p>

                  <div className="flex flex-col gap-2.5 max-h-[160px] overflow-y-auto">
                    {MOCK_PHOTO_TEMPLATES.map(tmpl => {
                      const alreadySelected = selectedPhotoNames.includes(tmpl.name);
                      return (
                        <div 
                          key={tmpl.id} 
                          onClick={() => !alreadySelected && handleSelectMockTemplate(tmpl)}
                          className={`p-2.5 rounded-lg border text-left cursor-pointer transition flex items-center gap-3 ${
                            alreadySelected 
                              ? 'bg-slate-50 border-slate-200 opacity-60 pointer-events-none' 
                              : 'bg-white border-slate-200 hover:border-slate-400/60'
                          }`}
                        >
                          <img src={tmpl.url} className="w-12 h-12 rounded object-cover border border-slate-100 flex-shrink-0" alt={tmpl.name} />
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-800 truncate block">{tmpl.name}</span>
                            <span className="text-[10px] text-slate-400 truncate block">{tmpl.description}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* SELECTION PREVIEW CARDS */}
              {selectedPhotos.length > 0 && (
                <div className="flex flex-col gap-3 mt-2">
                  <h5 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Loaded Inspection Photos ({selectedPhotos.length}/3)</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {selectedPhotos.map((photo, idx) => (
                      <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 relative flex flex-col gap-1.5">
                        <img 
                          src={photo} 
                          className="w-full h-24 object-cover rounded-lg border border-slate-100" 
                          alt="Loaded audit screenshot" 
                        />
                        <span className="text-[10px] font-bold text-slate-800 truncate pr-6 block">{selectedPhotoNames[idx]}</span>
                        <button
                          onClick={() => handleRemovePhoto(idx)}
                          className="absolute top-4 right-4 bg-rose-500 hover:bg-rose-600 text-white p-1 rounded-full shadow transition"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-4 flex justify-between items-center border-t border-slate-100">
              <button
                onClick={() => setView("create_step2")}
                className="text-slate-500 hover:text-slate-800 text-xs font-semibold flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Diagnostic checklist</span>
              </button>
              <button
                onClick={handleGenerateAuditReport}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-lg text-xs transition flex items-center gap-1.5 shadow-sm"
              >
                <span>Compile AI Compliance Report</span>
                <Sparkles className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        )}

        {/* 5. GENERATING REPORT LOADER SCREEN */}
        {view === "loading" && (
          <div id="view-loading" className="max-w-md mx-auto w-full bg-white rounded-2xl border border-slate-200 shadow-lg p-8 text-center flex flex-col items-center justify-center min-h-[360px] animate-fade-in my-10">
            <div className="relative">
              <RefreshCw className="w-14 h-14 text-indigo-600 animate-spin" />
              <ShieldCheck className="w-6 h-6 text-slate-900 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>

            <h3 className="font-display font-bold text-lg text-slate-900 mt-5">Processing Compliance Scans</h3>
            <p className="text-slate-500 text-xs mt-1 max-w-xs">Connecting to InspectoB2B safety board system. This takes a few moments.</p>

            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-6 overflow-hidden">
              <div 
                className="bg-indigo-600 h-full transition-all duration-500 rounded-full" 
                style={{ width: `${Math.min((loadingStep + 1) * 25, 100)}%` }}
              />
            </div>

            {/* LOG STREAM DISPLAY */}
            <div className="w-full bg-slate-950 text-indigo-400 text-left font-mono text-[10px] p-4 rounded-xl mt-6 border border-slate-800 min-h-[120px] flex flex-col gap-1.5 shadow-inner">
              {loadingLogs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-1">
                  <span className="text-slate-500">&gt;</span>
                  <span className="leading-relaxed">{log}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. REPORT DETAILS VIEW (PAYWALL INTEGRATION) */}
        {view === "report_details" && activeReport && (
          <div id="view-report-details" className="flex flex-col gap-6 animate-fade-in">
            
            {/* Quick Navigation Breadcrumb */}
            <div className="flex items-center justify-between">
              <button 
                onClick={() => setView("dashboard")}
                className="text-slate-500 hover:text-slate-800 text-xs font-bold flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Audit Register</span>
              </button>
              
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Report ID: <span className="font-mono text-slate-600">{activeReport.id.toUpperCase()}</span></span>
              </div>
            </div>

            {/* Top overview stats card */}
            <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <div>
                <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded font-bold uppercase tracking-wider block w-fit">
                  Diagnostic Overview
                </span>
                <h2 className="text-2xl font-display font-bold text-white mt-2.5">{activeReport.businessName}</h2>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  <span>{activeReport.region}</span>
                  <span>•</span>
                  <span>{new Date(activeReport.date).toLocaleDateString()}</span>
                </p>
              </div>

              {/* Score Display meter */}
              <div className="flex items-center gap-4 bg-slate-850 p-4 rounded-xl border border-slate-800">
                <div className={`p-3.5 rounded-xl font-extrabold text-lg ${
                  activeReport.complianceScore >= 80 
                    ? 'bg-emerald-500/10 text-emerald-400' 
                    : activeReport.complianceScore >= 50 
                      ? 'bg-amber-500/10 text-amber-400' 
                      : 'bg-rose-500/10 text-rose-400'
                }`}>
                  {activeReport.complianceScore}%
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-300">COMPLIANCE SCORE</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Calculated regulatory safety rating</p>
                </div>
              </div>

              {/* Risk details / Download section */}
              <div className="flex items-center gap-4 bg-slate-850 p-4 rounded-xl border border-slate-800 justify-between">
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Risk Level</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <ShieldAlert className={`w-4 h-4 ${
                      activeReport.riskLevel === 'Low' ? 'text-emerald-400' : activeReport.riskLevel === 'Medium' ? 'text-amber-400' : 'text-rose-400'
                    }`} />
                    <span className={`text-base font-bold ${
                      activeReport.riskLevel === 'Low' ? 'text-emerald-400' : activeReport.riskLevel === 'Medium' ? 'text-amber-400' : 'text-rose-400'
                    }`}>
                      {activeReport.riskLevel} Risk
                    </span>
                  </div>
                </div>

                {activeReport.unlocked ? (
                  <button 
                    onClick={() => handleDownloadPDF(activeReport)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-lg text-xs transition flex items-center gap-1 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Audit Report PDF</span>
                  </button>
                ) : (
                  <button 
                    onClick={() => openPaymentModal('single')}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs transition flex items-center gap-1 shadow-md"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Unlock PDF Report</span>
                  </button>
                )}
              </div>
            </div>

            {/* EXECUTIVE SUMMARY BRIEF */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h3 className="font-display font-bold text-slate-900 text-base flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>Executive Summary & Forewords</span>
              </h3>
              <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                This compliance assessment reports safety and regulatory standards for <strong>{activeReport.businessName}</strong> based in <strong>{activeReport.region}</strong>, operating in the <strong>{activeReport.industry.replace('_', ' ').toUpperCase()}</strong> sector. The comprehensive audit evaluated baseline fire safety, workplace hazards, operational protocols, and photographic site evidence. A compliance score of <strong>{activeReport.complianceScore}/100</strong> places the organization in a <strong>[{activeReport.riskLevel.toUpperCase()}]</strong> risk threshold. It is highly recommended that all identified high-severity deficiencies are remediated immediately to safeguard workers and protect the business from substantial regulatory liabilities.
              </p>
            </div>

            {/* RESULTS BODY: FINDINGS & CODE CHECKS WITH UNLOCK GATE */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              {/* PRIMARY GAP REMEDIATIONS COLUMN */}
              <div className="lg:col-span-2 flex flex-col gap-4 relative">
                
                {/* Visual Cover for Lock Mode */}
                {!activeReport.unlocked && (
                  <div className="absolute inset-x-0 bottom-0 top-[220px] bg-gradient-to-t from-slate-50 via-slate-50/95 to-transparent z-20 flex flex-col items-center justify-end pb-12 text-center px-4">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xl max-w-md w-full flex flex-col items-center gap-4">
                      <div className="bg-amber-50 text-amber-500 p-3.5 rounded-full border border-amber-100">
                        <Lock className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-display font-bold text-slate-900 text-base">Remediation Gap Plan Locked</h4>
                        <p className="text-xs text-slate-500 mt-1 max-w-xs">
                          Unlock to inspect {activeReport.findings.length} custom compliance gaps, legal regulations, actionable fixes, and generate your printable PDF report.
                        </p>
                      </div>

                      <div className="flex flex-col gap-2 w-full">
                        <button
                          onClick={() => openPaymentModal('single')}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <CreditCard className="w-4 h-4 text-indigo-200" />
                          <span>Unlock Granular Gap Report (₹2,500)</span>
                        </button>
                        <button
                          onClick={() => openPaymentModal('agency_sub')}
                          className="w-full text-slate-600 hover:text-slate-850 bg-slate-100 hover:bg-slate-200 text-xs font-semibold py-2 rounded-xl transition border border-slate-200"
                        >
                          Unlock All with Pro Agency Subscription (₹12,500/mo)
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Gaps title bar */}
                <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm flex flex-col gap-4">
                  <div>
                    <h3 className="font-display font-bold text-slate-900 text-base">Remediation Gap Analysis & Action Plan</h3>
                    <p className="text-xs text-slate-500">Detailed list of code safety deficiencies and step-by-step resolution steps</p>
                  </div>

                  {activeReport.findings.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs italic">
                      No safety gaps or code deficiencies found during this safety audit scan! Excellent compliance setup.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {activeReport.findings.map((finding, idx) => (
                        <div 
                          key={finding.id} 
                          className={`p-4 rounded-xl border flex flex-col gap-3 transition ${
                            !activeReport.unlocked && idx > 0 ? 'blur-sm select-none pointer-events-none' : 'bg-slate-50/50 border-slate-200/80'
                          }`}
                        >
                          {/* Finding Header */}
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <span className="text-[9px] bg-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded uppercase">
                                {finding.category}
                              </span>
                              <h4 className="font-bold text-slate-800 text-sm mt-1.5">{idx + 1}. {finding.title}</h4>
                            </div>

                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                              finding.severity === 'high' 
                                ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                                : finding.severity === 'medium'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-blue-100 text-blue-800 border border-blue-200'
                            }`}>
                              {finding.severity}
                            </span>
                          </div>

                          {/* Gap Description */}
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs border-t border-slate-100 pt-3">
                            <span className="font-bold text-slate-400">Observed Gap:</span>
                            <span className="sm:col-span-3 text-slate-600 leading-relaxed">{finding.description}</span>
                          </div>

                          {/* Regulation code reference */}
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                            <span className="font-bold text-slate-400">Standard Code Ref:</span>
                            <span className="sm:col-span-3 text-slate-700 font-semibold">{finding.regulatoryReference}</span>
                          </div>

                          {/* Remediation Action / Fix */}
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs bg-white p-3 rounded-lg border border-slate-100 shadow-inner">
                            <span className="font-bold text-indigo-600">Actionable Fix:</span>
                            <span className="sm:col-span-3 text-slate-600 leading-relaxed font-medium">{finding.recommendation}</span>
                          </div>

                          {/* Estimates */}
                          <div className="flex gap-4 text-xs mt-1 text-slate-500 border-t border-slate-100/60 pt-2.5">
                            <span>Cost Est: <strong className="text-slate-700">{finding.costEstimate}</strong></span>
                            <span>•</span>
                            <span>Timeline/Effort: <strong className="text-slate-700">{finding.effortEstimate}</strong></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* SIDEBAR: PHOTO INSPECTION RESULTS & CERTIFICATE PREVIEW */}
              <div className="flex flex-col gap-6">
                
                {/* PHOTOS ANALYZED SUMMARY */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col gap-4">
                  <div>
                    <h3 className="font-display font-bold text-slate-900 text-base">Site Scan Evidence</h3>
                    <p className="text-xs text-slate-500">Photographic frames scanned during safety scan</p>
                  </div>

                  <div className="flex flex-col gap-2">
                    {activeReport.imagesAnalyzed.map((name, i) => (
                      <div key={i} className="flex items-center gap-2.5 p-2 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                        <div className="bg-indigo-500/10 text-indigo-600 p-1.5 rounded">
                          <Eye className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-semibold text-slate-700 truncate">{name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CERTIFICATE PREVIEW BLOCK */}
                <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-xl p-5 shadow-md border border-slate-800 relative overflow-hidden">
                  <div className="absolute -right-6 -bottom-6 opacity-5">
                    <ShieldCheck className="w-32 h-32" />
                  </div>
                  
                  <span className="text-[8px] bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Official Certificate of Record</span>
                  <h4 className="font-display font-bold text-white text-sm mt-2.5">Corporate Self-Audit Certificate</h4>
                  <p className="text-slate-400 text-[11px] mt-1.5 leading-relaxed">
                    Once unlocked, InspectoB2B applet appends an official double-framed digital self-audit certificate of record validating hazard mitigation diligence for the {activeReport.businessName} facility located in {activeReport.region}.
                  </p>

                  <div className="border border-amber-500/20 rounded-lg p-2.5 bg-slate-850/80 mt-4 flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-amber-400" />
                      <span>Audit Certificate</span>
                    </span>
                    
                    {activeReport.unlocked ? (
                      <button 
                        onClick={() => handleDownloadPDF(activeReport)}
                        className="text-indigo-400 hover:text-indigo-300 font-bold"
                      >
                        Print/Download
                      </button>
                    ) : (
                      <span className="text-slate-500 flex items-center gap-1 font-semibold">
                        <Lock className="w-3 h-3" />
                        Locked
                      </span>
                    )}
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}

      </main>

      {/* FOOTER BAR */}
      <footer id="app-footer" className="mt-12 bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© 2026 InspectoB2B Compliance Auditor. All safety records are subject to local hazard codes.</p>
          <div className="flex gap-4">
            <span className="text-slate-500">Government Codes</span>
            <span>•</span>
            <span className="text-slate-500">SaaS Terms</span>
            <span>•</span>
            <span className="text-slate-500">Privacy</span>
          </div>
        </div>
      </footer>

      {/* 7. DETAILED MOCK PAYMENT MODAL (CHECKOUT EXPERIENCE) */}
      {showPaymentModal && (
        <div id="payment-modal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100">
            
            {/* Header bar */}
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-indigo-400" />
                <div>
                  <h4 className="font-display font-bold text-sm text-white">InspectoB2B Secure Checkout</h4>
                  <p className="text-[10px] text-slate-400">100% Secure B2B Payment Gateway</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-white text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            {/* Price section */}
            <div className="bg-slate-50 p-5 border-b border-slate-100 flex justify-between items-center">
              <div>
                <span className="text-slate-500 text-xs font-semibold uppercase">Product Description</span>
                <p className="text-slate-800 font-bold text-sm mt-0.5">
                  {paymentType === 'single' ? "Single Compliance Diagnostic Report" : "Monthly Pro Agency subscription"}
                </p>
              </div>
              <div className="text-right">
                <span className="text-slate-500 text-xs font-semibold uppercase">Grand Total</span>
                <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">
                  {paymentType === 'single' ? "₹2,500" : "₹12,500"}
                </h3>
              </div>
            </div>

            {/* Payment form tabs */}
            <div className="p-5 flex flex-col gap-4">
              
              <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-bold">
                <button
                  onClick={() => setPaymentMethod('upi')}
                  className={`flex-1 py-1.5 rounded-md text-center transition ${
                    paymentMethod === 'upi' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  UPI ID / BHIM
                </button>
                <button
                  onClick={() => setPaymentMethod('card')}
                  className={`flex-1 py-1.5 rounded-md text-center transition ${
                    paymentMethod === 'card' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Credit/Debit Card
                </button>
              </div>

              {/* Tab A: UPI */}
              {paymentMethod === 'upi' && (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Virtual Payment Address (VPA / UPI ID)</label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="e.g., safety@okaxis"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:bg-white outline-none focus:ring-1 focus:ring-indigo-500 transition font-mono font-bold text-slate-800"
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {['okaxis', 'okicici', 'okpaytm', 'okhdfc'].map(sfx => (
                      <button
                        key={sfx}
                        onClick={() => setUpiId(`compliance@${sfx}`)}
                        className="border border-slate-200 hover:border-slate-450 bg-slate-50 rounded-lg py-1.5 text-[10px] text-slate-600 transition"
                      >
                        @{sfx}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab B: CARD */}
              {paymentMethod === 'card' && (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Card Number</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="4321 8765 0987 1122"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:bg-white outline-none focus:ring-1 focus:ring-indigo-500 transition font-mono font-bold text-slate-800"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Expiry Date</label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        placeholder="MM/YY"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:bg-white outline-none focus:ring-1 focus:ring-indigo-500 transition font-mono font-bold text-slate-800 text-center"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">CVV Code</label>
                      <input
                        type="password"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        placeholder="***"
                        maxLength={3}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:bg-white outline-none focus:ring-1 focus:ring-indigo-500 transition font-mono font-bold text-slate-800 text-center"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Verification disclaimer */}
              <p className="text-[10px] text-slate-400 leading-relaxed text-center">
                This is a secure mock sandbox transaction. No real funds are deducted. Clicking "Confirm Payment" simulates a successful Razorpay gateway callback.
              </p>

            </div>

            {/* Footer button */}
            <div className="bg-slate-50 p-5 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 text-slate-600 hover:text-slate-800 hover:bg-slate-100/50 rounded-xl py-2.5 text-xs font-bold transition border border-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSimulatePayment}
                disabled={isPaying}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2.5 text-xs font-extrabold transition flex items-center justify-center gap-1.5 shadow-md shadow-indigo-950/10"
              >
                {isPaying ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-indigo-200" />
                    <span>Confirm Payment</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CLOUD PROFILE MODAL */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden">
            {/* Header */}
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="bg-indigo-600/20 text-indigo-400 p-2 rounded-xl border border-indigo-500/20">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-sm text-white">Cloud Workspace Identity</h4>
                  <p className="text-[10px] text-slate-400">Powered by Firestore Cloud DB</p>
                </div>
              </div>
              <button 
                onClick={() => setShowProfileModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6 flex flex-col gap-5">
              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100/60 text-xs text-slate-600 flex flex-col gap-2">
                <div className="flex justify-between">
                  <span className="font-bold text-slate-700">Project Connection:</span>
                  <span className="font-mono bg-indigo-100/50 text-indigo-700 px-1.5 py-0.5 rounded font-semibold text-[10px]">
                    alpine-span-9fjbn
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-700">Database Engine:</span>
                  <span className="text-slate-500">Google Cloud Firestore</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-700">Total Active Reports:</span>
                  <span className="text-slate-900 font-bold">{reports.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-700">Subscription Status:</span>
                  <span className="text-indigo-700 font-bold capitalize">{userSubscription} Plan</span>
                </div>
              </div>

              {/* Sample Profiles Quick Switch */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Quick-Switch Workspace Profiles</span>
                </label>
                <div className="grid grid-cols-1 gap-1.5 mt-0.5">
                  {[
                    { email: "rahulnarayan018@gmail.com", label: "My Primary Account" },
                    { email: "industrial-officer@omega-textiles.com", label: "Omega Textiles Factory" },
                    { email: "compliance-director@techspace-corp.in", label: "Corporate Office Hub" }
                  ].map((profile) => (
                    <button
                      key={profile.email}
                      onClick={() => {
                        setUserEmail(profile.email);
                        setShowProfileModal(false);
                        showToast(`Switched workspace to ${profile.email}`, "success");
                      }}
                      className={`text-left p-2.5 rounded-xl text-xs border transition flex justify-between items-center ${
                        userEmail === profile.email
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                      }`}
                    >
                      <div>
                        <p className="font-bold leading-none">{profile.label}</p>
                        <p className={`text-[10px] mt-0.5 ${userEmail === profile.email ? "text-indigo-200" : "text-slate-400"}`}>{profile.email}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 opacity-75" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2 border-t border-slate-100 pt-4">
                <label className="text-xs font-bold text-slate-700">Custom Corporate Email Profile</label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="e.g. inspector@enterprise.com"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white outline-none focus:ring-1 focus:ring-indigo-500 transition font-medium"
                  />
                  <button
                    onClick={() => {
                      if (!userEmail.includes("@")) {
                        showToast("Please enter a valid email address.", "warning");
                        return;
                      }
                      syncWithFirebase(userEmail);
                      setShowProfileModal(false);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition shadow-sm"
                  >
                    Sync
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                  InspectoB2B queries your personal reports register and enterprise subscription status directly from your secure Google Cloud Firestore cluster.
                </p>
              </div>

              {/* Troubleshooting / Cache Purge section */}
              <div className="flex flex-col gap-2 border-t border-slate-100 pt-4">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  <span>Workspace Administration & Troubleshooting</span>
                </label>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Need to verify first-time onboarding or clear corrupt browser states? Use the purge control to clean the local cache safely.
                </p>
                <button
                  onClick={() => {
                    localStorage.removeItem("inspectob2b_reports");
                    localStorage.removeItem("inspectob2b_subscription");
                    setUserSubscription('free');
                    setReports([]);
                    setActiveReportId(null);
                    setView("dashboard");
                    setShowProfileModal(false);
                    showToast("Workspace local cache purged and reset successfully!", "info");
                  }}
                  className="w-full mt-1 border border-rose-200 hover:bg-rose-50 hover:border-rose-300 text-rose-700 text-xs font-semibold py-2 rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Purge Local Cache & Reset Subscription</span>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowProfileModal(false)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold px-4 py-2 rounded-lg text-xs transition"
              >
                Close Connection Panel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Professional Toast Message */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in max-w-sm w-full bg-slate-900 text-white rounded-xl shadow-2xl p-4 border border-slate-800 flex gap-3 items-start">
          <div className={`p-1.5 rounded-lg flex-shrink-0 ${
            toast.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' :
            toast.type === 'warning' ? 'bg-amber-500/10 text-amber-400' : 'bg-indigo-500/10 text-indigo-400'
          }`}>
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold leading-relaxed">{toast.message}</p>
          </div>
          <button 
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white text-[11px] p-0.5"
          >
            ✕
          </button>
        </div>
      )}

    </div>
  );
}
