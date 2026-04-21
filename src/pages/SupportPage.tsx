import { AlertCircle, Bug, ExternalLink, LifeBuoy, MessageSquare } from "lucide-react";

export function SupportPage() {
  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Support</h1>
        <p className="text-slate-500 mt-0.5">Find the right resource for your issue.</p>
      </div>

      {/* Delivery failures */}
      <div className="bg-white rounded-xl border border-slate-100 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
            <AlertCircle size={18} className="text-red-500" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">Delivery Failures</h2>
            <p className="text-sm text-slate-500">Messages showing a failed or undelivered status</p>
          </div>
        </div>

        <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
          <p>
            Delivery failures are reported by the recipient's carrier or by SignalWire and are outside
            of TextFlow's control. The error message shown on the failed message in the{" "}
            <strong className="text-slate-800">Messages</strong> view contains the reason code, which
            you'll need when opening a support ticket.
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
            <p className="font-medium text-slate-800">When opening a ticket with SignalWire, include:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li>The <strong>Message ID</strong> shown below the failed message</li>
              <li>The error code and error message displayed on the message</li>
              <li>The approximate date and time the message was sent</li>
              <li>The source and destination phone numbers</li>
            </ul>
          </div>
        </div>

        <a
          href="https://support.signalwire.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <LifeBuoy size={15} />
          Open a SignalWire Support Ticket
          <ExternalLink size={13} />
        </a>
      </div>

      {/* Bugs and feature requests */}
      <div className="bg-white rounded-xl border border-slate-100 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Bug size={18} className="text-blue-600" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">Bugs &amp; Feature Requests</h2>
            <p className="text-sm text-slate-500">Issues with TextFlow itself, or ideas for improvements</p>
          </div>
        </div>

        <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
          <p>
            If you've found a bug in TextFlow or want to suggest a new feature, open an issue on GitHub.
            Bug reports are most useful when they include steps to reproduce the problem and, if
            applicable, any error messages shown in the app.
          </p>
          <p>
            For setup and configuration questions, the{" "}
            <a
              href="https://github.com/grendelpress/TextFlow/blob/main/INSTALL.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
            >
              INSTALL.md guide
              <ExternalLink size={12} />
            </a>
            {" "}is the best starting point. If you're still stuck, open a GitHub issue and we'll help.
          </p>
        </div>

        <a
          href="https://github.com/grendelpress/TextFlow/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <MessageSquare size={15} />
          Open an Issue on GitHub
          <ExternalLink size={13} />
        </a>
      </div>

      {/* What goes where */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
        <h3 className="font-semibold text-slate-700 mb-3 text-sm">Quick Reference</h3>
        <div className="space-y-2 text-sm">
          {[
            { issue: "Message failed or undelivered", contact: "SignalWire Support", href: "https://support.signalwire.com" },
            { issue: "SMS not arriving at all", contact: "SignalWire Support", href: "https://support.signalwire.com" },
            { issue: "Billing or account questions", contact: "SignalWire Support", href: "https://support.signalwire.com" },
            { issue: "Bug in TextFlow", contact: "GitHub Issues", href: "https://github.com/grendelpress/TextFlow/issues" },
            { issue: "Feature request or idea", contact: "GitHub Issues", href: "https://github.com/grendelpress/TextFlow/issues" },
            { issue: "Setup or configuration help", contact: "GitHub Issues", href: "https://github.com/grendelpress/TextFlow/issues" },
          ].map(({ issue, contact, href }) => (
            <div key={issue} className="flex items-center justify-between gap-4 py-1.5 border-b border-slate-200 last:border-0">
              <span className="text-slate-600">{issue}</span>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 font-medium text-xs flex items-center gap-1 flex-shrink-0"
              >
                {contact}
                <ExternalLink size={11} />
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
