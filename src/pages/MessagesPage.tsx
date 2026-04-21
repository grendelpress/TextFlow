import { useEffect, useRef, useState } from "react";
import { supabase, swProxy } from "../lib/supabase";
import { Message, PhoneNumber } from "../types";
import {
  Send, Search, ArrowLeft, RefreshCw, MessageSquare,
  ChevronDown, X, CheckCheck, Check, Clock, AlertCircle,
  Phone,
} from "lucide-react";

interface Conversation {
  contact_phone: string;
  last_message: Message;
  messages: Message[];
  unread: boolean;
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  delivered: <CheckCheck size={12} className="text-emerald-500" />,
  sent: <Check size={12} className="text-blue-400" />,
  queued: <Clock size={12} className="text-yellow-400" />,
  pending: <Clock size={12} className="text-slate-300" />,
  failed: <AlertCircle size={12} className="text-red-400" />,
  undelivered: <AlertCircle size={12} className="text-orange-400" />,
  received: <CheckCheck size={12} className="text-emerald-500" />,
};

const STATUS_DOT: Record<string, string> = {
  delivered: "bg-emerald-400",
  sent: "bg-blue-400",
  received: "bg-blue-500",
  failed: "bg-red-400",
  undelivered: "bg-orange-400",
  queued: "bg-yellow-400",
  pending: "bg-slate-300",
};

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diff < 7 * 86_400_000) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatFull(iso: string) {
  return new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeConvo, setActiveConvo] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [composing, setComposing] = useState(false);
  const [composeError, setComposeError] = useState("");
  const [form, setForm] = useState({ to: "", from: "", body: "" });
  const [replyBody, setReplyBody] = useState("");
  const [replying, setReplying] = useState(false);
  const [replyError, setReplyError] = useState("");
  const [replyFrom, setReplyFrom] = useState("");
  const threadEndRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const [msgRes, pnRes] = await Promise.all([
      supabase.from("messages").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("phone_numbers").select("*").eq("is_active", true),
    ]);
    setMessages(msgRes.data || []);
    setPhoneNumbers(pnRes.data || []);
    const pns = pnRes.data || [];
    if (pns.length > 0 && !form.from) {
      setForm((f) => ({ ...f, from: pns[0].number }));
      setReplyFrom(pns[0].number);
    }
    setLoading(false);
  };

  useEffect(() => {
    load().then(() => {
      const state = window.history.state;
      if (state?.templateBody) {
        setForm((f) => ({ ...f, body: state.templateBody }));
        setShowCompose(true);
        window.history.replaceState({ ...state, templateBody: undefined }, "");
      }
    });
  }, []);

  useEffect(() => {
    if (threadEndRef.current) {
      threadEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeConvo, messages]);

  const phoneMap = new Map(phoneNumbers.map((p) => [p.number, p]));

  const getFriendlyName = (number: string) => {
    const pn = phoneMap.get(number);
    return pn ? (pn.friendly_name || number) : number;
  };

  const conversations: Conversation[] = (() => {
    const map = new Map<string, Message[]>();
    for (const m of messages) {
      const key = m.contact_phone;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return Array.from(map.entries())
      .map(([contact_phone, msgs]) => {
        const sorted = [...msgs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        return {
          contact_phone,
          last_message: sorted[0],
          messages: sorted.reverse(),
          unread: sorted[sorted.length - 1].direction === "inbound",
        };
      })
      .sort((a, b) => new Date(b.last_message.created_at).getTime() - new Date(a.last_message.created_at).getTime());
  })();

  const filteredConvos = conversations.filter((c) => {
    if (!search) return true;
    return (
      c.contact_phone.includes(search) ||
      c.messages.some((m) => m.body.toLowerCase().includes(search.toLowerCase()))
    );
  });

  const activeThread = activeConvo ? conversations.find((c) => c.contact_phone === activeConvo) : null;

  const openConvo = (contact_phone: string) => {
    setActiveConvo(contact_phone);
    setReplyError("");
    setReplyBody("");
    const convo = conversations.find((c) => c.contact_phone === contact_phone);
    if (convo) {
      const msgs = [...convo.messages].reverse();
      const lastOut = msgs.find((m) => m.direction === "outbound");
      const lastIn = msgs.find((m) => m.direction === "inbound");
      const num = lastOut?.from_number ?? lastIn?.to_number ?? phoneNumbers[0]?.number ?? "";
      setReplyFrom(num);
    }
  };

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConvo || !replyBody.trim()) return;
    setReplying(true);
    setReplyError("");
    try {
      await swProxy("send-sms", "POST", { from: replyFrom, to: activeConvo, body: replyBody.trim() });
      setReplyBody("");
      await load();
    } catch (err: unknown) {
      setReplyError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setReplying(false);
    }
  };

  const sendCompose = async (e: React.FormEvent) => {
    e.preventDefault();
    setComposeError("");
    setComposing(true);
    try {
      await swProxy("send-sms", "POST", form);
      setShowCompose(false);
      setForm((f) => ({ ...f, to: "", body: "" }));
      await load();
      setActiveConvo(form.to);
    } catch (err: unknown) {
      setComposeError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setComposing(false);
    }
  };

  const charCount = form.body.length;
  const segments = Math.ceil(charCount / 160) || 1;

  const getPlaceholders = (text: string) =>
    [...new Set((text.match(/\{\{(\w+)\}\}/g) || []))];

  const composePlaceholders = getPlaceholders(form.body);
  const replyPlaceholders = getPlaceholders(replyBody);

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Conversation list */}
      <div className={`flex flex-col border-r border-slate-100 bg-white ${activeConvo ? "hidden md:flex md:w-80 lg:w-96" : "flex-1 md:w-80 lg:w-96"}`}>
        <div className="p-4 border-b border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-slate-900">Messages</h1>
            <div className="flex items-center gap-1.5">
              <button onClick={load} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors">
                <RefreshCw size={15} />
              </button>
              <button
                onClick={() => setShowCompose(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Send size={13} /> New
              </button>
            </div>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-0">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex gap-3 p-4 border-b border-slate-50 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex-shrink-0" />
                  <div className="flex-1 space-y-1.5 pt-1">
                    <div className="h-3.5 bg-slate-100 rounded w-2/5" />
                    <div className="h-3 bg-slate-50 rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConvos.length === 0 ? (
            <div className="text-center py-16 px-4">
              <MessageSquare size={36} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No conversations yet</p>
              <p className="text-slate-300 text-sm mt-1">Send your first message to get started</p>
            </div>
          ) : (
            filteredConvos.map((convo) => {
              const isActive = activeConvo === convo.contact_phone;
              const last = convo.last_message;
              const statusDot = STATUS_DOT[last.status] || "bg-slate-300";
              const isInbound = last.direction === "inbound";
              return (
                <button
                  key={convo.contact_phone}
                  onClick={() => openConvo(convo.contact_phone)}
                  className={`w-full flex items-start gap-3 px-4 py-3.5 border-b border-slate-50 text-left transition-colors ${isActive ? "bg-blue-50 border-l-2 border-l-blue-500" : "hover:bg-slate-50/70"}`}
                >
                  <div className="relative flex-shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${isActive ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
                      {convo.contact_phone.slice(-2)}
                    </div>
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${statusDot}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={`text-sm truncate ${convo.unread && !isActive ? "font-bold text-slate-900" : "font-semibold text-slate-700"}`}>
                        {convo.contact_phone}
                      </span>
                      <span className="text-[11px] text-slate-400 flex-shrink-0">{formatTime(last.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      {!isInbound && <span className="text-[11px] text-slate-400">You:</span>}
                      <p className={`text-xs truncate ${convo.unread && !isActive ? "text-slate-700 font-medium" : "text-slate-400"}`}>
                        {last.body}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <Phone size={10} className="text-slate-400" />
                      <span className="text-[10px] text-slate-500">
                        via {getFriendlyName(isInbound ? last.to_number : last.from_number)}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Thread view */}
      <div className={`flex-1 flex flex-col bg-slate-50 ${activeConvo ? "flex" : "hidden md:flex"}`}>
        {!activeThread ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare size={48} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">Select a conversation</p>
              <p className="text-slate-300 text-sm mt-1">Or start a new one</p>
            </div>
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-100">
              <button onClick={() => setActiveConvo(null)} className="md:hidden p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50">
                <ArrowLeft size={18} />
              </button>
              <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-sm font-semibold text-slate-500 flex-shrink-0">
                {activeThread.contact_phone.slice(-2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-900 text-sm">{activeThread.contact_phone}</div>
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <span>{activeThread.messages.length} message{activeThread.messages.length !== 1 ? "s" : ""}</span>
                  {(() => {
                    const msgs = activeThread.messages;
                    const lastMsg = [...msgs].reverse()[0];
                    const viaNum = lastMsg
                      ? (lastMsg.direction === "outbound" ? lastMsg.from_number : lastMsg.to_number)
                      : null;
                    const viaName = viaNum ? getFriendlyName(viaNum) : null;
                    return viaName ? <><span className="text-slate-400">·</span><Phone size={9} className="text-slate-400" /><span>via {viaName}</span></> : null;
                  })()}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {activeThread.messages.map((msg) => {
                const isOut = msg.direction === "outbound";
                return (
                  <div key={msg.id} className={`flex ${isOut ? "justify-end" : "justify-start"}`}>
                    <div className="max-w-[75%] space-y-1">

                      <div
                        className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isOut
                            ? "bg-blue-600 text-white rounded-br-sm"
                            : "bg-white text-slate-800 shadow-sm border border-slate-100 rounded-bl-sm"
                        }`}
                      >
                        {msg.body}
                      </div>
                      <div className={`flex items-center gap-1 px-1 ${isOut ? "justify-end" : "justify-start"}`}>
                        <span className="text-[10px] text-slate-400">{formatFull(msg.created_at)}</span>
                        {isOut && STATUS_ICON[msg.status]}
                      </div>
                      {msg.error_message && (
                        <p className="text-[10px] text-red-500 px-1">{msg.error_message}</p>
                      )}
                      {(msg.status === "failed" || msg.status === "undelivered") && (
                        <p className="text-[10px] text-slate-400 px-1 font-mono select-all">ID: {msg.id}</p>
                      )}
                      {isOut && (
                        <div className="flex items-center gap-1 px-1 justify-end">
                          <Phone size={9} className="text-slate-400" />
                          <span className="text-[10px] text-slate-500">via {getFriendlyName(msg.from_number)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={threadEndRef} />
            </div>

            {/* Reply bar */}
            <div className="bg-white border-t border-slate-100 p-3">
              {replyPlaceholders.length > 0 && (
                <div className="mb-2 flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
                  <AlertCircle size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    Replace before sending: <span className="font-medium">{replyPlaceholders.join(", ")}</span>
                  </p>
                </div>
              )}
              {replyError && (
                <div className="mb-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs">{replyError}</div>
              )}
              <form onSubmit={sendReply} className="flex items-end gap-2">
                {phoneNumbers.length > 1 && (
                  <div className="relative flex-shrink-0">
                    <select
                      value={replyFrom}
                      onChange={(e) => setReplyFrom(e.target.value)}
                      className="appearance-none bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 pr-7 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {phoneNumbers.map((pn) => (
                        <option key={pn.id} value={pn.number}>{pn.friendly_name || pn.number}</option>
                      ))}
                    </select>
                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                )}
                {phoneNumbers.length === 1 && (
                  <div className="flex items-center gap-1 flex-shrink-0 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                    <Phone size={11} className="text-slate-400" />
                    <span className="text-xs text-slate-500">{getFriendlyName(phoneNumbers[0].number)}</span>
                  </div>
                )}
                <div className="flex-1 relative">
                  <textarea
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (replyBody.trim() && replyPlaceholders.length === 0) sendReply(e as unknown as React.FormEvent);
                      }
                    }}
                    rows={1}
                    maxLength={1600}
                    placeholder="Type a message…"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    style={{ minHeight: "42px", maxHeight: "120px" }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={replying || !replyBody.trim() || !replyFrom || replyPlaceholders.length > 0}
                  className="p-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl transition-colors flex-shrink-0"
                >
                  <Send size={16} />
                </button>
              </form>
              {phoneNumbers.length === 0 && (
                <p className="mt-1.5 text-xs text-amber-600">No phone numbers attached. Add one in Phone Numbers first.</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Compose modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">New Message</h3>
              <button onClick={() => setShowCompose(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <form onSubmit={sendCompose} className="p-5 space-y-4">
              {composeError && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">{composeError}</div>}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">From</label>
                <div className="relative">
                  <select
                    value={form.from}
                    onChange={(e) => setForm((f) => ({ ...f, from: e.target.value }))}
                    className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    required
                  >
                    <option value="">Select a number</option>
                    {phoneNumbers.map((pn) => (
                      <option key={pn.id} value={pn.number}>
                        {pn.friendly_name || pn.number} — {pn.number}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
                {phoneNumbers.length === 0 && <p className="mt-1 text-xs text-amber-600">No phone numbers yet. Add one in Phone Numbers first.</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">To</label>
                <input
                  type="tel"
                  value={form.to}
                  onChange={(e) => setForm((f) => ({ ...f, to: e.target.value }))}
                  placeholder="+1 (555) 000-0000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Message</label>
                <textarea
                  value={form.body}
                  onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  rows={4}
                  maxLength={1600}
                  placeholder="Type your message..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                  required
                />
                {composePlaceholders.length > 0 && (
                  <div className="mt-2 flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
                    <AlertCircle size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">
                      Replace before sending: <span className="font-medium">{composePlaceholders.join(", ")}</span>
                    </p>
                  </div>
                )}
                <div className="flex justify-between mt-1">
                  <p className="text-xs text-slate-400">{charCount}/1600 chars ({segments} segment{segments !== 1 ? "s" : ""})</p>
                  {charCount > 160 && <p className="text-xs text-amber-500">Long messages cost more</p>}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCompose(false)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={composing || !form.to || !form.from || !form.body || composePlaceholders.length > 0}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Send size={14} /> {composing ? "Sending..." : "Send"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
