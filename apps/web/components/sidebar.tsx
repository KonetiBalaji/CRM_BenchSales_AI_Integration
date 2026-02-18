import Link from "next/link"; // Balaji Koneti: import Link for client-side navigation

// Balaji Koneti: Define the structure for a single navigation link item
type NavItem = { href: string; label: string; icon?: string };

// Balaji Koneti: Define the structure for a grouped section of navigation items
type NavSection = { title: string; items: NavItem[] };

// Balaji Koneti: Build the sidebar model based on provided reference images
const sections: NavSection[] = [
  // Balaji Koneti: AI & Communication section
  {
    title: "AI & Communication",
    items: [
      { href: "/ai-recruiter-agent", label: "AI Recruiter Agent" },
      { href: "/communications-center", label: "Communications Center" },
      { href: "/email-campaigns", label: "Email Campaigns" },
      { href: "/ai-talent-sourcing", label: "AI Talent Sourcing" }
    ]
  },
  // Balaji Koneti: Analytics & Reports section
  {
    title: "Analytics & Reports",
    items: [
      { href: "/analytics-dashboard", label: "Analytics Dashboard" },
      { href: "/custom-reports", label: "Custom Reports" },
      { href: "/invoicing", label: "Invoicing" },
      { href: "/performance-metrics", label: "Performance Metrics" }
    ]
  },
  // Balaji Koneti: ATS - Talent Acquisition section
  {
    title: "ATS - Talent Acquisition",
    items: [
      { href: "/candidate-management", label: "Candidate Management" },
      { href: "/job-postings", label: "Job Postings" },
      { href: "/interview-scheduling", label: "Interview Scheduling" },
      { href: "/placements", label: "Placements" },
      { href: "/onboarding", label: "Onboarding" }
    ]
  },
  // Balaji Koneti: Workforce Management section
  {
    title: "Workforce Management",
    items: [
      { href: "/employee-management", label: "Employee Management" },
      { href: "/timesheets", label: "Timesheets" },
      { href: "/payroll-finance", label: "Payroll & Finance" },
      { href: "/compliance-i9", label: "Compliance & I-9" }
    ]
  },
  // Balaji Koneti: VMS - Vendor Management section
  {
    title: "VMS - Vendor Management",
    items: [
      { href: "/vendor-management", label: "Vendor Management" },
      { href: "/contracts", label: "Contracts" },
      { href: "/procurement", label: "Procurement" },
      { href: "/supplier-performance", label: "Supplier Performance" }
    ]
  },
  // Balaji Koneti: Business Intelligence section
  {
    title: "Business Intelligence",
    items: [
      { href: "/executive-dashboard", label: "Executive Dashboard" },
      { href: "/revenue-forecasting", label: "Revenue Forecasting" },
      { href: "/market-intelligence", label: "Market Intelligence" },
      { href: "/competitive-analysis", label: "Competitive Analysis" }
    ]
  },
  // Balaji Koneti: Automation section
  {
    title: "Automation",
    items: [
      { href: "/workflow-builder", label: "Workflow Builder" },
      { href: "/rpa-bots", label: "RPA Bots" },
      { href: "/smart-notifications", label: "Smart Notifications" },
      { href: "/auto-scheduling", label: "Auto Scheduling" }
    ]
  },
  // Balaji Koneti: Advanced AI & ML section
  {
    title: "Advanced AI & ML",
    items: [
      { href: "/predictive-analytics", label: "Predictive Analytics" },
      { href: "/ml-model-management", label: "ML Model Management" },
      { href: "/sentiment-analysis", label: "Sentiment Analysis" },
      { href: "/ai-chatbot", label: "AI Chatbot" }
    ]
  }
];

// Balaji Koneti: Export the Sidebar component
export function Sidebar() {
  return (
    <aside className="hidden w-72 flex-shrink-0 border-r border-slate-200 bg-white/60 p-4 text-sm dark:border-slate-800 dark:bg-slate-950/60 md:block">{/* Balaji Koneti: container styles */}
      <div className="space-y-8">{/* Balaji Koneti: vertical spacing between sections */}
        {sections.map((section) => (
          <div key={section.title} className="space-y-2">{/* Balaji Koneti: group wrapper */}
            <p className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{/* Balaji Koneti: section label */}{section.title}</p>
            <ul className="space-y-1">{/* Balaji Koneti: list of links */}
              {section.items.map((item) => (
                <li key={item.href}>{/* Balaji Koneti: list item wrapper */}
                  <Link href={item.href} className="block rounded-lg px-3 py-2 text-slate-600 transition hover:bg-brand/10 hover:text-brand dark:text-slate-300">{/* Balaji Koneti: link styles */}
                    {item.label}{/* Balaji Koneti: link label */}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );
}



